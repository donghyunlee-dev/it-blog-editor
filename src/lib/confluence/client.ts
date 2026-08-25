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

async function confluenceRequest<T>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const { baseUrl, email, apiToken } = getConfluenceConfig();

  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      Authorization: buildAuthHeader(email, apiToken),
      Accept: "application/json",
      ...init?.headers,
    },
  });

  if (!response.ok) {
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

export async function upsertPageProperty<T = unknown>(
  pageId: string,
  key: string,
  value: T
): Promise<ConfluencePageProperty<T>> {
  const existing = await getPageProperty<T>(pageId, key);

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
}

export async function uploadAttachment(
  pageId: string,
  file: File
): Promise<ConfluenceAttachment> {
  const { baseUrl, email, apiToken } = getConfluenceConfig();

  const form = new FormData();
  form.append("file", file, file.name);

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
  };
}

/** Space에 속한 모든 페이지를 페이지네이션을 따라가며 조회한다(Viewer의 게시 문서 스캔에 사용). */
export async function listAllSpacePages(
  spaceId: string
): Promise<ConfluencePage[]> {
  const pages: ConfluencePage[] = [];
  let cursor: string | null = null;

  do {
    const query: string = cursor
      ? cursor
      : `/api/v2/spaces/${spaceId}/pages?limit=100`;
    const page = await confluenceRequest<{
      results: ConfluencePage[];
      _links: { next?: string };
    }>(query);

    pages.push(...page.results);
    cursor = page._links.next ?? null;
  } while (cursor);

  return pages;
}

// ── Slug lookup (게시 문서 목록을 순회하며 슬러그 중복 확인) ──

export async function findPublishedPageBySlug(
  spaceId: string,
  viewerId: string,
  slug: string,
  propertyKey: string
): Promise<ConfluencePage | null> {
  let cursor: string | null = null;

  do {
    const query: string = cursor
      ? cursor
      : `/api/v2/spaces/${spaceId}/pages?limit=100`;
    const page = await confluenceRequest<{
      results: ConfluencePage[];
      _links: { next?: string };
    }>(query);

    for (const candidate of page.results) {
      const property = await getPageProperty<{
        isPublished?: boolean;
        viewers?: Record<string, { slug?: string }>;
      }>(candidate.id, propertyKey);
      // 게시 취소된 문서는 viewers 메타데이터(재게시 시 이전 slug 제안용)를 그대로 유지하므로,
      // 현재 게시 중인 문서만 slug를 점유한 것으로 본다.
      if (
        property?.value?.isPublished === true &&
        property?.value?.viewers?.[viewerId]?.slug === slug
      ) {
        return candidate;
      }
    }

    cursor = page._links.next ?? null;
  } while (cursor);

  return null;
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
