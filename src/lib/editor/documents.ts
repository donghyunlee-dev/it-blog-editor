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

const SOURCE_DOCUMENT_PROPERTY_KEY = "sourceDocument";
const AUTHOR_PROPERTY_KEY = "authorMeta";
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
 * 계정 폴더(초안/게시)에 속한 문서 목록을 조회한다. 게시하면 문서가 계정 폴더 하위 "초안"에서
 * 같은 계정 폴더 하위 "게시"로 이동할 뿐 계정 밖으로 나가지 않으므로, 두 서브폴더의 자식을
 * 그대로 합치면 곧 그 계정 소유 문서 전체가 된다 — 더 이상 공유 게시됨 루트를 스캔해
 * authorMeta로 소유권을 필터링할 필요가 없다.
 *
 * `/editor/[pageId]`가 로드될 때 `/editor` 레이아웃(사이드바용)과 `listTagSuggestions`가
 * 각각 독립적으로 이 함수를 (같은 폴더 쌍으로) 호출한다. React의 `cache()`로 감싸 같은
 * 요청(같은 서버 렌더 트리) 안에서는 동일 인자 호출이 중복 실행되지 않고 메모이즈되도록 한다
 * — Next.js App Router의 요청 스코프 dedup 패턴
 * (https://react.dev/reference/react/cache)을 그대로 따른다. `cache()`는 원시값 인자는
 * 값으로, 객체 인자는 참조로 메모이즈하므로, 두 폴더 ID를 객체 하나로 묶지 않고 별개의
 * 문자열 인자 두 개로 받는다 — 두 호출부가 각자 새 객체 리터럴을 만들면 참조가 달라져
 * dedup이 조용히 깨지기 때문이다.
 */
export const listDocuments = cache(async function listDocuments(
  draftFolderId: string,
  publishedFolderId: string
): Promise<DocumentSummary[]> {
  const [draftPages, publishedPages] = await Promise.all([
    listChildPages(draftFolderId),
    listChildPages(publishedFolderId),
  ]);

  const entries = [
    ...draftPages.map((page) => ({ page, isPublished: false })),
    ...publishedPages.map((page) => ({ page, isPublished: true })),
  ];

  return Promise.all(
    entries.map(async ({ page, isPublished }) => {
      const tagList = await getTags(page.id);
      return {
        pageId: page.id,
        title: page.title,
        updatedAt: page.version.createdAt,
        isPublished,
        tags: tagList,
      };
    })
  );
});

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
 */
export async function getDocumentDetail(
  pageId: string
): Promise<DocumentDetail> {
  const page = await getPageOrThrow(pageId);
  const sourceProperty = await getPageProperty<{ doc: JSONContent }>(
    pageId,
    SOURCE_DOCUMENT_PROPERTY_KEY
  );

  return {
    pageId: page.id,
    title: page.title,
    doc: sourceProperty?.value.doc ?? { type: "doc", content: [] },
    version: page.version.number,
    updatedAt: page.version.createdAt,
  };
}

export interface CreateDocumentInput {
  draftFolderId: string;
  title: string;
  doc: JSONContent;
  actualAuthorEmail: string;
}

/**
 * 개인 폴더의 "초안" 서브폴더 하위에 신규 문서(Confluence 페이지)를 생성한다. 새로 만든 문서는
 * 항상 `hidePageFromOthers`로 작성자 본인 전용으로 제한하므로, 호출자는 반드시
 * `draftFolderId`(초안 서브폴더)를 넘겨야 한다 — "게시" 서브폴더로 만들면 제한이 걸린 게시
 * 문서가 생기는 모순된 상태가 된다.
 */
export async function createDocument(input: CreateDocumentInput) {
  if (!input.title.trim() || isEmptyDoc(input.doc)) {
    throw new ValidationError("제목 또는 본문이 누락되었습니다.");
  }

  const space = await getConfiguredSpace();
  const page = await createPage({
    spaceId: space.id,
    parentId: input.draftFolderId,
    title: input.title,
    bodyValue: tiptapDocToStorageFormat(input.doc),
  });

  await Promise.all([
    upsertPageProperty(page.id, "authorMeta", {
      actualAuthorEmail: input.actualAuthorEmail,
    }),
    upsertPageProperty(page.id, SOURCE_DOCUMENT_PROPERTY_KEY, {
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

  const [current, sourceProperty] = await Promise.all([
    getPageOrThrow(input.pageId),
    getPageProperty<{ doc: JSONContent }>(
      input.pageId,
      SOURCE_DOCUMENT_PROPERTY_KEY
    ),
  ]);
  if (current.version.number !== input.expectedVersion) {
    throw new ConflictError(
      `문서가 이미 최신 버전(${current.version.number})으로 변경되었습니다. 최신 내용을 확인한 뒤 다시 저장하세요.`
    );
  }

  const updated = await updatePage({
    pageId: input.pageId,
    title: input.title,
    bodyValue: tiptapDocToStorageFormat(input.doc),
    nextVersion: current.version.number + 1,
  });

  try {
    await upsertPageProperty(
      input.pageId,
      SOURCE_DOCUMENT_PROPERTY_KEY,
      { doc: input.doc },
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
    await recordDeletedDocument(pageId, page.title);
  } catch (error) {
    console.error("[deleteDocument] 삭제된 문서 레지스트리 기록 실패:", error);
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
