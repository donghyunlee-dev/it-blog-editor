import { randomUUID } from "crypto";
import { cache } from "react";
import {
  ConfluenceApiError,
  createPage,
  deletePage,
  getConfiguredSpace,
  getPage,
  getPageProperty,
  listChildPages,
  listPageVersions,
  PropertyVersionConflictError,
  updatePage,
  upsertPageProperty,
} from "@/lib/confluence/client";
import {
  ConflictError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from "./errors";
import { tiptapDocToStorageFormat, type JSONContent } from "./tiptap-to-storage";
import { hidePageFromOthers } from "./access";
import { createPersonalFolder, findPersonalFolder } from "./folder";
import { getTags } from "./tags";
import type { PublishMetadata } from "./publish";
import { logger, serializeError } from "@/lib/logger";

const SOURCE_DOCUMENT_PROPERTY_KEY = "sourceDocument";
const AUTHOR_PROPERTY_KEY = "authorMeta";
// P1-6a: Confluence page title은 이제 내부 고유키(UUID)라 이 값이 Confluence의 title
// 길이 제약과는 무관하다(P0-7) — 순수하게 화면 레이아웃·데이터 남용 방지를 위한
// 상식적인 상한이다.
const MAX_TITLE_LENGTH = 200;
const PUBLISH_PROPERTY_KEY = "publishMetadata";
export const DELETED_DOCUMENTS_PROPERTY_KEY = "deletedDocuments";

export interface DeletedDocumentEntry {
  pageId: string;
  title: string;
  deletedAt: string;
}

export interface DocumentSummary {
  pageId: string;
  title: string;
  updatedAt: string;
  isPublished: boolean;
  tags: string[];
}

export interface DocumentDetail {
  pageId: string;
  title: string;
  doc: JSONContent;
  version: number;
  updatedAt: string;
}

/**
 * TipTap 문서가 실질적으로 비어있는지 판단한다. 텍스트가 없는 빈 문단(`{ type: "doc", content:
 * [{ type: "paragraph" }] }` 등)만 있는 문서도 "본문 없음"으로 취급해야 하므로, 단순히
 * `content` 배열의 길이만 보지 않고 텍스트가 있는 노드나 이미지처럼 그 자체로 내용을 담는
 * 노드가 하나라도 있는지 재귀적으로 확인한다.
 */
function hasMeaningfulContent(node: JSONContent): boolean {
  if (node.type === "text") {
    return (node.text ?? "").trim().length > 0;
  }
  if (node.type === "image") {
    return true;
  }
  return (node.content ?? []).some(hasMeaningfulContent);
}

function isEmptyDoc(doc: JSONContent | undefined | null): boolean {
  return !doc || !hasMeaningfulContent(doc);
}

/** TipTap 문서의 텍스트 노드를 전부 이어붙인다(본문 검색용 — 서식·구조는 버리고 순수 텍스트만). */
function extractPlainText(node: JSONContent): string {
  if (node.type === "text") {
    return node.text ?? "";
  }
  return (node.content ?? []).map(extractPlainText).join(" ");
}

async function getPageOrThrow(pageId: string) {
  try {
    return await getPage(pageId);
  } catch (error) {
    if (error instanceof ConfluenceApiError && error.status === 404) {
      throw new NotFoundError("문서를 찾을 수 없습니다.");
    }
    throw error;
  }
}

/** 페이지의 authorMeta property에서 실제 작성자 이메일을 읽는다(없으면 null). */
async function readAuthorEmail(pageId: string): Promise<string | null> {
  const property = await getPageProperty<{ actualAuthorEmail?: string }>(
    pageId,
    AUTHOR_PROPERTY_KEY
  );
  return property?.value?.actualAuthorEmail ?? null;
}

/**
 * 계정 폴더에 속한 문서 목록을 조회한다. 게시 여부와 무관하게 한 계정의 모든 문서가 같은
 * 계정 폴더 하위에 평평하게 있다(P0-8 — 예전에는 "초안"/"게시" 두 서브폴더 사이로 문서를
 * 물리적으로 이동시키고 그 위치로 게시 여부를 판단했는데, "Confluence는 아무도 직접 열어보지
 * 않는 DB일 뿐"이라는 결정(P0-7) 이후 폴더 이동이 있던 이유 자체가 사라져 제거했다). 게시
 * 여부는 이제 `publishMetadata` property로 판단한다(`publish.ts` 참고).
 *
 * Confluence 페이지의 실제 title은 더 이상 표시용 제목이 아니다(P0-7 — Space 전체에서
 * 유일해야 하는 Confluence 제약을 내부 고유키로 흡수하고, 사용자가 입력한 진짜 제목은
 * `sourceDocument` property에 따로 저장한다). 그래서 문서마다 이 property도 함께 읽는다 —
 * 계정 하나가 가진 문서 수 범위 내의 비용이라 Space 전체를 스캔하던 기존 slug 조회 문제
 * (P0-5b)와는 성격이 다르다.
 *
 * `/editor/[pageId]`가 로드될 때 `/editor` 레이아웃(사이드바용)과 `listTagSuggestions`가
 * 각각 독립적으로 이 함수를 (같은 계정 폴더 ID로) 호출한다. React의 `cache()`로 감싸 같은
 * 요청(같은 서버 렌더 트리) 안에서는 동일 인자 호출이 중복 실행되지 않고 메모이즈되도록 한다
 * — Next.js App Router의 요청 스코프 dedup 패턴
 * (https://react.dev/reference/react/cache)을 그대로 따른다.
 *
 * `sourceDocument` property는 본문(TipTap JSON)까지 통째로 담고 있어(제목만 쓰려고 읽어도
 * 본문까지 함께 내려온다), `searchDocuments`(P1-1a 후속, Ctrl+K 전체 검색)가 별도로 문서
 * 본문을 다시 조회하지 않고 이 함수와 같은 조회 결과를 재사용할 수 있다 — `fetchDocumentEntry`
 * 참고.
 */
interface DocumentEntry {
  summary: DocumentSummary;
  bodyText: string;
}

async function fetchDocumentEntry(page: {
  id: string;
  title: string;
  version: { createdAt: string };
}): Promise<DocumentEntry> {
  const [tagList, sourceProperty, publishProperty] = await Promise.all([
    getTags(page.id),
    getPageProperty<{ title?: string; doc: JSONContent }>(
      page.id,
      SOURCE_DOCUMENT_PROPERTY_KEY
    ),
    getPageProperty<PublishMetadata>(page.id, PUBLISH_PROPERTY_KEY),
  ]);

  return {
    summary: {
      pageId: page.id,
      title: sourceProperty?.value?.title ?? page.title,
      updatedAt: page.version.createdAt,
      isPublished: publishProperty?.value?.isPublished ?? false,
      tags: tagList,
    },
    bodyText: sourceProperty?.value?.doc ? extractPlainText(sourceProperty.value.doc) : "",
  };
}

export const listDocuments = cache(async function listDocuments(
  accountFolderId: string
): Promise<DocumentSummary[]> {
  const pages = await listChildPages(accountFolderId);
  const entries = await Promise.all(pages.map(fetchDocumentEntry));
  return entries.map((entry) => entry.summary);
});

/**
 * 계정 폴더의 모든 문서를 대상으로 제목·태그·본문 텍스트를 함께 검색한다(Ctrl+K 전체 검색,
 * [Issue #7](https://github.com/sfood-pioneer-1st/sfood-it-editor/issues/7) 결정 — 사이드바의
 * 상시 필터(제목·태그만, `EditorSidebar.tsx`)와 별개로, 이 검색은 사용자가 명시적으로 열었을
 * 때만 호출되는 온디맨드 API라 문서마다 본문까지 함께 조회하는 비용(N+1)을 감당할 수 있다고
 * 판단했다 — `listDocuments()`가 애초에 이 본문을 이미 조회하고 있었다는 것도 이 판단의 근거다
 * (제목만 쓰고 버리고 있었을 뿐, 추가 조회가 아니라 이미 하던 조회의 재사용에 가깝다).
 */
export interface DocumentSearchResult extends DocumentSummary {
  /** 미리보기 패널에 보여줄 본문 일부. 검색어가 본문 안에 있으면 그 주변을, 없으면(제목·태그만
   * 일치) 본문 맨 앞을 잘라 보여준다. 본문이 비어 있으면 빈 문자열이다. */
  snippet: string;
}

const SNIPPET_LENGTH = 140;
const SNIPPET_CONTEXT_BEFORE = 40;

/** 본문 텍스트에서 미리보기용 조각을 잘라낸다 — 검색어가 있으면 그 앞뒤 문맥을 보여준다. */
function buildSnippet(bodyText: string, normalizedQuery: string): string {
  const trimmed = bodyText.trim();
  if (!trimmed) return "";

  const matchIndex = normalizedQuery ? trimmed.toLowerCase().indexOf(normalizedQuery) : -1;
  if (matchIndex === -1) {
    return trimmed.length > SNIPPET_LENGTH ? `${trimmed.slice(0, SNIPPET_LENGTH)}…` : trimmed;
  }

  const start = Math.max(0, matchIndex - SNIPPET_CONTEXT_BEFORE);
  const end = Math.min(trimmed.length, start + SNIPPET_LENGTH);
  const prefix = start > 0 ? "…" : "";
  const suffix = end < trimmed.length ? "…" : "";
  return `${prefix}${trimmed.slice(start, end)}${suffix}`;
}

export async function searchDocuments(
  accountFolderId: string,
  query: string
): Promise<DocumentSearchResult[]> {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return [];
  }

  const pages = await listChildPages(accountFolderId);
  const entries = await Promise.all(pages.map(fetchDocumentEntry));

  return entries
    .filter(({ summary, bodyText }) => {
      if (summary.title.toLowerCase().includes(normalized)) return true;
      if (summary.tags.some((tag) => tag.toLowerCase().includes(normalized))) return true;
      return bodyText.toLowerCase().includes(normalized);
    })
    .map(({ summary, bodyText }) => ({
      ...summary,
      snippet: buildSnippet(bodyText, normalized),
    }));
}

/**
 * 문서의 실제 작성자가 로그인 사용자인지 확인한다. authorMeta가 없거나 이메일이 다르면
 * UnauthorizedError(401)를 던져, pageId만 알아낸 다른 직원이 남의 문서를 수정·게시·삭제하는
 * 것을 막는다.
 */
export async function requireDocumentOwner(
  pageId: string,
  email: string
): Promise<void> {
  const authorEmail = await readAuthorEmail(pageId);
  if (!authorEmail || authorEmail !== email) {
    throw new UnauthorizedError("이 문서에 대한 권한이 없습니다.");
  }
}

/**
 * 편집 화면에 필요한 문서 상세를 조회한다. Confluence 페이지의 body(storage format)는
 * 렌더링용 산출물이므로, 편집 원본은 별도 content property(sourceDocument)에서 가져온다.
 * 제목도 마찬가지다(P0-7) — Confluence 페이지의 실제 title은 내부 고유키일 뿐이라
 * 표시하지 않는다.
 */
export async function getDocumentDetail(
  pageId: string
): Promise<DocumentDetail> {
  const page = await getPageOrThrow(pageId);
  const sourceProperty = await getPageProperty<{ title?: string; doc: JSONContent }>(
    pageId,
    SOURCE_DOCUMENT_PROPERTY_KEY
  );

  return {
    pageId: page.id,
    title: sourceProperty?.value?.title ?? "",
    doc: sourceProperty?.value?.doc ?? { type: "doc", content: [] },
    version: page.version.number,
    updatedAt: page.version.createdAt,
  };
}

export interface CreateDocumentInput {
  accountFolderId: string;
  title: string;
  doc: JSONContent;
  actualAuthorEmail: string;
}

/**
 * 계정 폴더 하위에 신규 문서(Confluence 페이지)를 생성한다. 새로 만든 문서는 항상
 * `hidePageFromOthers`로 작성자 본인 전용으로 제한한다(게시 전까지는 항상 비공개 — P0-8,
 * 예전의 "초안" 서브폴더와 동일한 보안 속성).
 *
 * Confluence 페이지의 실제 title은 사용자가 입력한 제목이 아니라 `randomUUID()`로 만든
 * 내부 고유키다(P0-7). Confluence는 Space 전체에서 페이지 title이 유일해야 하는데(부모가
 * 달라도 예외 없음), 서로 다른 계정이 흔한 제목("회의록" 등)을 그대로 title로 쓰면 실제로
 * 충돌해 생성이 실패한다(`A page with this title already exists`) — 이 오류는 분류되지
 * 않은 오류로 처리돼 "일시적 오류, 다시 시도하라"는 잘못된 메시지가 뜨고 Slack에 불필요한
 * 이상 감지 알림까지 울린다. 내부 고유키를 title로 쓰면 이 충돌이 구조적으로 불가능해진다.
 * 사용자가 실제로 입력한 제목은 `sourceDocument` property에 `doc`과 함께 저장하고, 화면에는
 * 항상 이 값만 보여준다(`getDocumentDetail`/`listDocuments` 참고). 이 내부 고유키는 게시
 * 시 slug 유일성을 보장하는 데도 재사용된다(`publish.ts`의 `publicSlug` 참고, P0-5b).
 */
export async function createDocument(input: CreateDocumentInput) {
  if (!input.title.trim() || isEmptyDoc(input.doc)) {
    throw new ValidationError("제목 또는 본문이 누락되었습니다.");
  }
  if (input.title.length > MAX_TITLE_LENGTH) {
    throw new ValidationError(`제목은 ${MAX_TITLE_LENGTH}자를 초과할 수 없습니다.`);
  }

  const space = await getConfiguredSpace();
  const internalKey = randomUUID();
  const page = await createPage({
    spaceId: space.id,
    parentId: input.accountFolderId,
    title: internalKey,
    bodyValue: tiptapDocToStorageFormat(input.doc),
  });

  await Promise.all([
    upsertPageProperty(page.id, "authorMeta", {
      actualAuthorEmail: input.actualAuthorEmail,
    }),
    upsertPageProperty(page.id, SOURCE_DOCUMENT_PROPERTY_KEY, {
      title: input.title,
      doc: input.doc,
    }),
    hidePageFromOthers(page.id),
  ]);

  return { pageId: page.id, version: page.version.number };
}

export interface UpdateDocumentInput {
  pageId: string;
  title: string;
  doc: JSONContent;
  expectedVersion: number;
}

/**
 * 기존 문서를 수정한다. 요청한 버전이 최신이 아니면 ConflictError(409)를 던진다.
 *
 * 페이지 본문(storage format)뿐 아니라 편집 원본을 담은 `sourceDocument` content
 * property도 함께 저장하는데, 이 두 쓰기는 Confluence가 트랜잭션으로 묶어주지 않는
 * 서로 다른 리소스다. 저장을 시작하는 시점에 `sourceDocument`의 현재 버전을 함께
 * 읽어 두고(`sourceProperty`), 실제로 그 속성을 쓰는 순간에도 그 버전이 그대로인지
 * 확인한다(`upsertPageProperty`의 `expectedVersion` 옵션) — 그 사이 다른 요청이 먼저
 * 써서 버전이 움직였다면 조용히 덮어쓰지 않고 ConflictError를 던진다. 본문은 이미
 * 저장된 뒤일 수 있어(부분 성공) 완전한 원자성은 아니지만, "조용한 원고 유실"을
 * "감지 가능한 오류"로 바꾼다 — Confluence Cloud REST API가 여러 리소스에 걸친
 * 트랜잭션을 지원하지 않아 이보다 더 근본적인 해결은 이 계층에서 불가능하다
 * (docs/superpowers/tasks/P0-3-sourcedocument-version-guard/task.md 참고).
 */
export async function updateDocument(input: UpdateDocumentInput) {
  if (!input.title.trim() || isEmptyDoc(input.doc)) {
    throw new ValidationError("제목 또는 본문이 누락되었습니다.");
  }
  if (input.title.length > MAX_TITLE_LENGTH) {
    throw new ValidationError(`제목은 ${MAX_TITLE_LENGTH}자를 초과할 수 없습니다.`);
  }

  const [current, sourceProperty] = await Promise.all([
    getPageOrThrow(input.pageId),
    getPageProperty<{ title?: string; doc: JSONContent }>(
      input.pageId,
      SOURCE_DOCUMENT_PROPERTY_KEY
    ),
  ]);
  if (current.version.number !== input.expectedVersion) {
    throw new ConflictError(
      `문서가 이미 최신 버전(${current.version.number})으로 변경되었습니다. 최신 내용을 확인한 뒤 다시 저장하세요.`
    );
  }

  // Confluence 페이지의 실제 title(내부 고유키, P0-7)은 생성 이후 절대 바꾸지 않는다 —
  // `current.title`을 그대로 다시 넘겨 변경 없이 유지한다. 사용자가 입력한 새 제목은
  // sourceDocument property에만 반영한다.
  const updated = await updatePage({
    pageId: input.pageId,
    title: current.title,
    bodyValue: tiptapDocToStorageFormat(input.doc),
    nextVersion: current.version.number + 1,
  });

  try {
    await upsertPageProperty(
      input.pageId,
      SOURCE_DOCUMENT_PROPERTY_KEY,
      { title: input.title, doc: input.doc },
      { expectedVersion: sourceProperty?.version.number ?? 0 }
    );
  } catch (error) {
    if (error instanceof PropertyVersionConflictError) {
      throw new ConflictError(
        "문서 본문은 저장됐지만, 편집 원본이 동시에 다른 곳에서 변경되어 반영하지 못했습니다. 최신 내용을 다시 불러온 뒤 저장하세요."
      );
    }
    throw error;
  }

  return { pageId: updated.id, version: updated.version.number };
}

/**
 * 삭제 직전 상태를 작성자 계정 폴더의 `deletedDocuments` property에 기록해, 나중에
 * "삭제된 문서" 목록(P1-2b)에서 복구할 수 있게 남겨둔다. 이 함수 자체가 실패해도
 * 삭제를 막지는 않는다 — 복구 기능이 못 쓰게 되는 것이지 삭제라는 원래 요청이 실패해서는
 * 안 되기 때문이다.
 */
async function recordDeletedDocument(pageId: string, title: string): Promise<void> {
  const authorProperty = await getPageProperty<{ actualAuthorEmail?: string }>(
    pageId,
    AUTHOR_PROPERTY_KEY
  );
  const authorEmail = authorProperty?.value?.actualAuthorEmail;
  if (!authorEmail) {
    return;
  }

  const folder =
    (await findPersonalFolder(authorEmail)) ?? (await createPersonalFolder(authorEmail));
  const existing = await getPageProperty<DeletedDocumentEntry[]>(
    folder.accountFolderId,
    DELETED_DOCUMENTS_PROPERTY_KEY
  );
  const entries = existing?.value ?? [];
  const entry: DeletedDocumentEntry = {
    pageId,
    title,
    deletedAt: new Date().toISOString(),
  };
  await upsertPageProperty(folder.accountFolderId, DELETED_DOCUMENTS_PROPERTY_KEY, [
    ...entries,
    entry,
  ]);
}

/** 문서를 삭제한다(Confluence 휴지통으로 이동). 이후 목록·게시 조회에서 자동으로 제외된다. */
export async function deleteDocument(pageId: string): Promise<void> {
  const page = await getPageOrThrow(pageId);
  try {
    // page.title은 P0-7 이후 내부 고유키일 뿐이라 복구 목록에 보여줄 실제 제목은
    // sourceDocument property에서 읽는다.
    const sourceProperty = await getPageProperty<{ title?: string }>(
      pageId,
      SOURCE_DOCUMENT_PROPERTY_KEY
    );
    await recordDeletedDocument(pageId, sourceProperty?.value?.title ?? page.title);
  } catch (error) {
    logger.error("[deleteDocument] 삭제된 문서 레지스트리 기록 실패", {
      pageId,
      error: serializeError(error),
    });
  }
  await deletePage(pageId);
}

export interface DocumentVersion {
  number: number;
  createdAt: string;
  /** 이 문서의 현재(최신) 버전인지 — 가장 높은 버전 번호를 기준으로 판단한다. */
  isCurrent: boolean;
}

/**
 * 문서의 버전 이력을 읽기 전용으로 조회한다(P1-2a). 되돌리기(restore) 등 쓰기 동작은
 * 다루지 않는다 — docs/superpowers/tasks/P1-2a-revision-history-view/task.md 참고.
 */
export async function getDocumentVersionHistory(
  pageId: string
): Promise<DocumentVersion[]> {
  const versions = await listPageVersions(pageId);
  const maxNumber = Math.max(...versions.map((version) => version.number));
  return versions.map((version) => ({
    number: version.number,
    createdAt: version.createdAt,
    isCurrent: version.number === maxNumber,
  }));
}
