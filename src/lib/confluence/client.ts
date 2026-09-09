import { randomUUID } from "crypto";
import { requireEnv } from "@/lib/env";

function getConfluenceConfig() {
  return {
    baseUrl: requireEnv("CONFLUENCE_BASE_URL"),
    email: requireEnv("CONFLUENCE_EMAIL"),
    apiToken: requireEnv("CONFLUENCE_API_TOKEN"),
  };
}

function buildAuthHeader(email: string, apiToken: string) {
  return `Basic ${Buffer.from(`${email}:${apiToken}`).toString("base64")}`;
}

/** Confluence API 호출 실패를 상태 코드와 함께 전달하는 오류. 도메인 계층이 404/409 등을 구분하는 데 사용한다. */
export class ConfluenceApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ConfluenceApiError";
    this.status = status;
  }
}

// P1-3: 순간적인 레이트리밋(429)·5xx 장애를 흡수하기 위한 재시도. Confluence Cloud API에는
// idempotency key가 없어 POST/PUT/DELETE를 재시도하면 실제로는 서버에 반영된 요청을 중복
// 실행할 위험이 있다(예: 응답만 유실된 createPage) — 그래서 부작용이 없는 GET만 재시도한다.
// (docs/superpowers/tasks/P1-3-confluence-retry-backoff/task.md 참고)
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 300;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableMethod(method: string | undefined): boolean {
  return method === undefined || method.toUpperCase() === "GET";
}

function isRetryableStatus(status: number): boolean {
  return status === 429 || status >= 500;
}

function computeDelayMs(attempt: number, retryAfterHeader: string | null): number {
  if (retryAfterHeader !== null) {
    const seconds = Number(retryAfterHeader);
    if (Number.isFinite(seconds) && seconds >= 0) {
      return seconds * 1000;
    }
  }
  const jitter = Math.random() * 100;
  return BASE_DELAY_MS * 2 ** attempt + jitter;
}

async function confluenceRequest<T>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const { baseUrl, email, apiToken } = getConfluenceConfig();
  const canRetry = isRetryableMethod(init?.method);

  let attempt = 0;
  for (;;) {
    const response = await fetch(`${baseUrl}${path}`, {
      ...init,
      headers: {
        Authorization: buildAuthHeader(email, apiToken),
        Accept: "application/json",
        ...init?.headers,
      },
    });

    if (!response.ok) {
      if (canRetry && isRetryableStatus(response.status) && attempt < MAX_RETRIES) {
        await sleep(computeDelayMs(attempt, response.headers.get("Retry-After")));
        attempt += 1;
        continue;
      }

      const body = await response.text().catch(() => "");
      throw new ConfluenceApiError(
        response.status,
        `Confluence API 호출 실패: ${response.status} ${response.statusText}${body ? ` - ${body}` : ""}`
      );
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return response.json() as Promise<T>;
  }
}

export interface ConfluenceUser {
  accountId: string;
}

export async function getCurrentConfluenceUser(): Promise<ConfluenceUser> {
  return confluenceRequest<ConfluenceUser>("/rest/api/user/current");
}

export async function movePage(
  pageId: string,
  newParentId: string
): Promise<ConfluencePage> {
  const current = await getPage(pageId);

  return confluenceRequest<ConfluencePage>(`/api/v2/pages/${pageId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      id: pageId,
      status: "current",
      title: current.title,
      parentId: newParentId,
      body: current.body
        ? { representation: "storage", value: current.body.storage.value }
        : undefined,
      version: { number: current.version.number + 1 },
    }),
  });
}

/**
 * 페이지의 title은 그대로 두고 본문(body)만 통째로 교체한다(2026-09-04) — 계정 폴더/
 * "계정 관리" 페이지처럼 "진짜 데이터는 content property, 화면에 보이는 본문은 관리자가
 * Confluence에서 직접 열어볼 수 있게 매번 다시 그리는 참고용 스냅샷"인 페이지에서 쓴다.
 * `movePage`와 같은 "현재 페이지를 읽고 특정 필드만 바꿔 PUT" 패턴을 그대로 따른다.
 */
export async function replacePageBody(
  pageId: string,
  bodyValue: string
): Promise<ConfluencePage> {
  const current = await getPage(pageId);

  return confluenceRequest<ConfluencePage>(`/api/v2/pages/${pageId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      id: pageId,
      status: "current",
      title: current.title,
      body: { representation: "storage", value: bodyValue },
      version: { number: current.version.number + 1 },
    }),
  });
}

// ── Space ──────────────────────────────────────────────

export interface ConfluenceSpace {
  id: string;
  key: string;
  homepageId: string | null;
}

export async function getConfiguredSpace(): Promise<ConfluenceSpace> {
  const spaceKey = requireEnv("CONFLUENCE_SPACE_KEY");
  const result = await confluenceRequest<{
    results: Array<{ id: string; key: string; homepageId: string | null }>;
  }>(`/api/v2/spaces?keys=${encodeURIComponent(spaceKey)}`);

  const space = result.results[0];
  if (!space) {
    throw new Error(`Confluence Space를 찾을 수 없습니다: ${spaceKey}`);
  }

  return space;
}

// ── Pages ──────────────────────────────────────────────

export interface ConfluencePage {
  id: string;
  status: string;
  title: string;
  spaceId: string;
  parentId: string | null;
  version: { number: number; createdAt: string };
  body?: { storage: { value: string; representation: "storage" } };
}

/**
 * 특정 페이지의 모든 하위 페이지를 페이지네이션을 따라가며 조회한다.
 * v2 API의 기본 페이지 크기(25)에 걸려 조용히 잘리면 개인 폴더나 문서가 목록에서 사라지므로
 * 반드시 _links.next 커서를 끝까지 따라간다.
 *
 * v1 `/rest/api/content/{id}/child/page`를 쓰는 이유: v2 `/api/v2/pages/{id}/children`는
 * 실제 Confluence Cloud에서 `id`/`status`/`title`/`spaceId`/`childPosition`만 반환하고
 * `version`을 절대 포함하지 않는다(2026-08-25, 실제 인스턴스로 직접 확인). `listDocuments`가
 * 문서마다 `page.version.createdAt`을 읽으므로 v2로는 실제 문서가 하나만 있어도 항상
 * TypeError가 난다 — 첨부파일·제한·라벨과 같은 전례처럼 v1로 대체한다.
 */
export async function listChildPages(
  parentId: string
): Promise<ConfluencePage[]> {
  interface ChildPageV1 {
    id: string;
    status: string;
    title: string;
    space: { id: number };
    version: { number: number; when: string };
  }

  const pages: ConfluencePage[] = [];
  let cursor: string | null = null;

  do {
    const query: string = cursor
      ? cursor
      : `/rest/api/content/${parentId}/child/page?limit=100&expand=version,space`;
    const page = await confluenceRequest<{
      results: ChildPageV1[];
      _links: { next?: string };
    }>(query);

    pages.push(
      ...page.results.map((result) => ({
        id: result.id,
        status: result.status,
        title: result.title,
        spaceId: String(result.space.id),
        parentId,
        version: { number: result.version.number, createdAt: result.version.when },
      }))
    );
    cursor = page._links?.next ?? null;
  } while (cursor);

  return pages;
}

export async function findChildPageByTitle(
  parentId: string,
  title: string
): Promise<ConfluencePage | null> {
  const children = await listChildPages(parentId);
  return children.find((page) => page.title === title) ?? null;
}

export async function getPage(pageId: string): Promise<ConfluencePage> {
  return confluenceRequest<ConfluencePage>(
    `/api/v2/pages/${pageId}?body-format=storage`
  );
}

export async function createPage(input: {
  spaceId: string;
  parentId: string;
  title: string;
  bodyValue: string;
}): Promise<ConfluencePage> {
  return confluenceRequest<ConfluencePage>("/api/v2/pages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      spaceId: input.spaceId,
      status: "current",
      title: input.title,
      parentId: input.parentId,
      body: { representation: "storage", value: input.bodyValue },
    }),
  });
}

/** Confluence 페이지를 휴지통으로 이동한다(v2 API 기본 동작 — 완전 삭제가 아닌 소프트 삭제). */
export async function deletePage(pageId: string): Promise<void> {
  await confluenceRequest<void>(`/api/v2/pages/${pageId}`, {
    method: "DELETE",
  });
}

export async function updatePage(input: {
  pageId: string;
  title: string;
  bodyValue: string;
  nextVersion: number;
}): Promise<ConfluencePage> {
  return confluenceRequest<ConfluencePage>(`/api/v2/pages/${input.pageId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      id: input.pageId,
      status: "current",
      title: input.title,
      body: { representation: "storage", value: input.bodyValue },
      version: { number: input.nextVersion },
    }),
  });
}

// ── Page Versions (버전 이력, 읽기 전용 — P1-2a) ──

export interface ConfluencePageVersion {
  number: number;
  createdAt: string;
  message?: string;
  authorId?: string;
}

/**
 * 페이지의 전체 버전 이력을 최신순으로 반환한다. Confluence Cloud REST API v2
 * 문서(`GET /api/v2/pages/{id}/versions`) 기준으로 구현했으나, 이 프로젝트에
 * 접근 가능한 실제 Confluence 인스턴스가 없어 응답 필드명·정렬 기본값을 실제로
 * 검증하지는 못했다(docs/superpowers/tasks/P1-2a-revision-history-view/task.md
 * 참고) — 그래서 서버가 주는 정렬에 의존하지 않고 클라이언트에서 직접 정렬한다.
 */
export async function listPageVersions(
  pageId: string
): Promise<ConfluencePageVersion[]> {
  const versions: ConfluencePageVersion[] = [];
  let cursor: string | null = null;

  do {
    const query: string = cursor ?? `/api/v2/pages/${pageId}/versions?limit=50`;
    const page = await confluenceRequest<{
      results: ConfluencePageVersion[];
      _links: { next?: string };
    }>(query);

    versions.push(...page.results);
    cursor = page._links.next ?? null;
  } while (cursor);

  return versions.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

// ── Content Properties ────────────────────────────────

export interface ConfluencePageProperty<T = unknown> {
  id: string;
  key: string;
  value: T;
  version: { number: number };
}

export async function getPageProperty<T = unknown>(
  pageId: string,
  key: string
): Promise<ConfluencePageProperty<T> | null> {
  const result = await confluenceRequest<{
    results: Array<ConfluencePageProperty<T>>;
  }>(`/api/v2/pages/${pageId}/properties?key=${encodeURIComponent(key)}`);
  return result.results[0] ?? null;
}

/**
 * `upsertPageProperty`가 `expectedVersion`으로 넘겨받은 값이 실제로 쓰기 직전에 다시 읽은
 * 속성 버전과 다를 때 던진다. `ConflictError`(도메인 계층, `src/lib/editor/errors.ts`)와는
 * 별개다 — 이 파일은 저수준 연동 계층이라 도메인 에러를 몰라야 한다(architecture.md의
 * 계층 원칙). 호출부(`documents.ts`)가 이 에러를 잡아 `ConflictError`로 바꾼다.
 */
export class PropertyVersionConflictError extends Error {
  constructor(message = "Content property가 예상한 버전과 다릅니다.") {
    super(message);
    this.name = "PropertyVersionConflictError";
  }
}

export async function upsertPageProperty<T = unknown>(
  pageId: string,
  key: string,
  value: T,
  options?: { expectedVersion?: number }
): Promise<ConfluencePageProperty<T>> {
  const existing = await getPageProperty<T>(pageId, key);

  if (options?.expectedVersion !== undefined) {
    // 속성이 아직 한 번도 없으면(버전 개념 자체가 없음) 0으로 취급한다.
    const actualVersion = existing?.version.number ?? 0;
    if (actualVersion !== options.expectedVersion) {
      throw new PropertyVersionConflictError();
    }
  }

  if (!existing) {
    return confluenceRequest<ConfluencePageProperty<T>>(
      `/api/v2/pages/${pageId}/properties`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value }),
      }
    );
  }

  return confluenceRequest<ConfluencePageProperty<T>>(
    `/api/v2/pages/${pageId}/properties/${existing.id}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        key,
        value,
        version: { number: existing.version.number + 1 },
      }),
    }
  );
}

// ── Attachments (v1 REST API — v2에는 첨부파일 업로드 엔드포인트가 없음) ──

export interface ConfluenceAttachment {
  attachmentId: string;
  url: string;
  filename: string;
}

/**
 * 클립보드로 붙여넣은 스크린샷은 브라우저/OS가 "image.png"처럼 특징 없는 이름을 붙이는
 * 경우가 많다 — 같은 문서에 그 이름의 첨부파일이 이미 있으면 Confluence가 업로드 자체를
 * 400으로 거부한다("Cannot add a new attachment with same file name as an existing
 * attachment", 2026-09-09 실사용 확인). 매번 고유 접미사를 붙여 이 충돌을 원천적으로
 * 피한다 — 파일명은 내부 식별용일 뿐 이 앱 어디에도 사용자에게 그대로 노출되지 않는다.
 * `documents.ts`의 `internalKey`(Confluence 페이지 title 전역 유일성 확보용)와 같은
 * 이유로 `randomUUID()`를 재사용한다(2026-09-09, 사용자 요청 — 충돌 가능성 자체를
 * 원천 차단).
 */
function withUniqueFilenameSuffix(filename: string): string {
  const dotIndex = filename.lastIndexOf(".");
  const base = dotIndex > 0 ? filename.slice(0, dotIndex) : filename;
  const ext = dotIndex > 0 ? filename.slice(dotIndex) : "";
  return `${base}-${randomUUID()}${ext}`;
}

export async function uploadAttachment(
  pageId: string,
  file: File
): Promise<ConfluenceAttachment> {
  const { baseUrl, email, apiToken } = getConfluenceConfig();
  const uniqueFilename = withUniqueFilenameSuffix(file.name);

  const form = new FormData();
  form.append("file", file, uniqueFilename);

  const response = await fetch(
    `${baseUrl}/rest/api/content/${pageId}/child/attachment`,
    {
      method: "POST",
      headers: {
        Authorization: buildAuthHeader(email, apiToken),
        Accept: "application/json",
        "X-Atlassian-Token": "nocheck",
      },
      body: form,
    }
  );

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new ConfluenceApiError(
      response.status,
      `Confluence 첨부파일 업로드 실패: ${response.status} ${response.statusText}${body ? ` - ${body}` : ""}`
    );
  }

  const result = (await response.json()) as {
    results: Array<{ id: string; _links: { download: string } }>;
  };
  const attachment = result.results[0];

  return {
    attachmentId: attachment.id,
    url: `${baseUrl}${attachment._links.download}`,
    filename: uniqueFilename,
  };
}

export interface ConfluenceAttachmentContent {
  data: ArrayBuffer;
  contentType: string;
}

/**
 * 첨부파일을 페이지 안에서의 파일명으로 찾아 실제 바이트를 내려받는다(2026-09-07 추가).
 *
 * `uploadAttachment`가 돌려주는 `url`(Confluence의 원본 다운로드 링크)은 Confluence 자체
 * 세션·자격증명이 있어야 열린다 — 이 앱은 서버가 API 토큰으로만 Confluence를 대신 호출할
 * 뿐, 브라우저에는 그 자격증명이 전혀 없다. 그래서 에디터의 `<img src>`가 그 URL을 그대로
 * 가리키면 브라우저는 인증 없이 요청을 보내 깨진 이미지 아이콘만 보인다(실사용 확인 —
 * "사진 아이콘만 보이고 실제 사진이 안 들어간다"). 이 함수는 그 자격증명을 가진 서버가
 * 대신 파일을 받아와, 우리 앱의 프록시 라우트(`GET /api/editor/documents/{pageId}/images/
 * {filename}`)가 브라우저에 다시 내려줄 수 있게 한다.
 */
export async function downloadAttachment(
  pageId: string,
  filename: string
): Promise<ConfluenceAttachmentContent> {
  const { baseUrl, email, apiToken } = getConfluenceConfig();
  const authHeader = buildAuthHeader(email, apiToken);

  // 업로드 시점에 받은 다운로드 링크를 저장해두는 대신 매번 파일명으로 다시 찾는다 —
  // 그 링크의 쿼리 파라미터(버전 등)가 이후 재게시·재조회로 낡을 수 있는데, 파일명으로
  // 다시 찾으면 항상 최신 버전의 다운로드 링크를 받는다.
  const listResponse = await fetch(
    `${baseUrl}/rest/api/content/${pageId}/child/attachment?filename=${encodeURIComponent(filename)}`,
    { headers: { Authorization: authHeader, Accept: "application/json" } }
  );
  if (!listResponse.ok) {
    throw new ConfluenceApiError(
      listResponse.status,
      `첨부파일 조회 실패: ${listResponse.status} ${listResponse.statusText}`
    );
  }
  const list = (await listResponse.json()) as {
    results: Array<{ _links: { download: string } }>;
  };
  const found = list.results[0];
  if (!found) {
    throw new ConfluenceApiError(404, `첨부파일을 찾을 수 없습니다: ${filename}`);
  }

  const fileResponse = await fetch(`${baseUrl}${found._links.download}`, {
    headers: { Authorization: authHeader },
  });
  if (!fileResponse.ok) {
    throw new ConfluenceApiError(
      fileResponse.status,
      `첨부파일 다운로드 실패: ${fileResponse.status} ${fileResponse.statusText}`
    );
  }

  return {
    data: await fileResponse.arrayBuffer(),
    contentType: fileResponse.headers.get("content-type") ?? "application/octet-stream",
  };
}

// ── Footer Comments (댓글) ──

export interface ConfluenceFooterComment {
  id: string;
  parentCommentId: string | null;
  createdAt: string;
  body?: { storage: { value: string; representation: "storage" } };
}

export async function createFooterComment(input: {
  pageId: string;
  parentCommentId?: string;
  bodyValue: string;
}): Promise<ConfluenceFooterComment> {
  return confluenceRequest<ConfluenceFooterComment>("/api/v2/footer-comments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      pageId: input.pageId,
      parentCommentId: input.parentCommentId,
      body: { representation: "storage", value: input.bodyValue },
    }),
  });
}

/** 문서에 달린 모든 댓글을 페이지네이션을 따라가며 한 번에 조회한다(계층은 호출부에서 메모리로 구성). */
export async function listFooterComments(
  pageId: string
): Promise<ConfluenceFooterComment[]> {
  const comments: ConfluenceFooterComment[] = [];
  let cursor: string | null = null;

  do {
    const query: string = cursor
      ? cursor
      : `/api/v2/pages/${pageId}/footer-comments?body-format=storage&limit=100`;
    const page = await confluenceRequest<{
      results: ConfluenceFooterComment[];
      _links: { next?: string };
    }>(query);

    comments.push(...page.results);
    cursor = page._links.next ?? null;
  } while (cursor);

  return comments;
}

// ── Restrictions (v1 REST API — v2에는 페이지 제한 엔드포인트가 없음) ──

export async function restrictPageToAccount(
  pageId: string,
  accountId: string
): Promise<void> {
  await confluenceRequest<void>(`/rest/api/content/${pageId}/restriction`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify([
      {
        operation: "read",
        restrictions: { user: [{ type: "known", accountId }] },
      },
      {
        operation: "update",
        restrictions: { user: [{ type: "known", accountId }] },
      },
    ]),
  });
}

export async function clearPageRestrictions(pageId: string): Promise<void> {
  await confluenceRequest<void>(`/rest/api/content/${pageId}/restriction`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify([
      { operation: "read", restrictions: { user: [] } },
      { operation: "update", restrictions: { user: [] } },
    ]),
  });
}

// ── Labels (태그) ──

export interface ConfluenceLabel {
  id: string;
  name: string;
}

export async function listLabels(pageId: string): Promise<ConfluenceLabel[]> {
  const result = await confluenceRequest<{ results: ConfluenceLabel[] }>(
    `/rest/api/content/${pageId}/label`
  );
  return result.results;
}

export async function addLabels(pageId: string, labels: string[]): Promise<void> {
  await confluenceRequest<{ results: ConfluenceLabel[] }>(
    `/rest/api/content/${pageId}/label`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(labels.map((name) => ({ prefix: "global", name }))),
    }
  );
}

export async function removeLabel(pageId: string, name: string): Promise<void> {
  await confluenceRequest<void>(
    `/rest/api/content/${pageId}/label?name=${encodeURIComponent(name)}`,
    { method: "DELETE" }
  );
}
