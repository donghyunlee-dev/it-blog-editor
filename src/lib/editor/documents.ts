import { randomUUID } from "crypto";
import { cache } from "react";
import {
  ConfluenceApiError,
  createPage,
  deletePage,
  deletePageProperty,
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
import { createPersonalFolder, ensurePersonalFolder, findPersonalFolder } from "./folder";
import { getSharedDocumentRefs, getSharingMeta, updateLastEditedBy } from "./sharing";
import type { SharingLastEditedBy } from "./sharing";
import { getAccountsByEmails } from "./account-index";
import { getTags } from "./tags";
import { listFolders } from "./folders";
import type { PublishMetadata } from "./publish";
import { logger, serializeError } from "@/lib/logger";
import { formatAccountLabel } from "@/lib/account-display";

const SOURCE_DOCUMENT_PROPERTY_KEY = "sourceDocument";
const AUTHOR_PROPERTY_KEY = "authorMeta";
// P1-6a: Confluence page title은 이제 내부 고유키(UUID)라 이 값이 Confluence의 title
// 길이 제약과는 무관하다(P0-7) — 순수하게 화면 레이아웃·데이터 남용 방지를 위한
// 상식적인 상한이다.
const MAX_TITLE_LENGTH = 200;
const PUBLISH_PROPERTY_KEY = "publishMetadata";
export const DELETED_DOCUMENTS_PROPERTY_KEY = "deletedDocuments";
/** 문서의 폴더 소속(P7-3, Phase 7) — property가 없으면(기존 문서 포함) "미분류"(`null`). */
const FOLDER_PROPERTY_KEY = "folderId";

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
  /** 이 문서가 속한 폴더(P7-3) — "미분류"면 `null`. */
  folderId: string | null;
}

/** 공유 목록 표시용 — accountIndex에 없는 이메일(아주 오래된 계정 등)은 `name`이 빈 문자열. */
export interface SharedAccount {
  email: string;
  name: string;
}

export interface DocumentDetail {
  pageId: string;
  title: string;
  doc: JSONContent;
  version: number;
  updatedAt: string;
  /** 공유 기능(P6-7)의 마지막 수정자 — 한 번도 공유되지 않았거나 수정 이력이 없으면 undefined. */
  lastEditedBy?: SharingLastEditedBy;
  /** 실제 작성자 이메일(P6-2/P6-3) — "공유" 버튼을 소유자에게만 보이도록 화면에서 판단하는 데 쓴다. */
  ownerEmail: string;
  /** 현재 공유된 대상 목록(P6-2/P6-3), 이름까지 채워서 반환한다. */
  sharedWith: SharedAccount[];
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
  const [tagList, sourceProperty, publishProperty, folderProperty] = await Promise.all([
    getTags(page.id),
    getPageProperty<{ title?: string; doc: JSONContent }>(
      page.id,
      SOURCE_DOCUMENT_PROPERTY_KEY
    ),
    getPageProperty<PublishMetadata>(page.id, PUBLISH_PROPERTY_KEY),
    getPageProperty<string | null>(page.id, FOLDER_PROPERTY_KEY),
  ]);

  return {
    summary: {
      pageId: page.id,
      title: sourceProperty?.value?.title ?? page.title,
      updatedAt: page.version.createdAt,
      isPublished: publishProperty?.value?.isPublished ?? false,
      tags: tagList,
      folderId: folderProperty?.value ?? null,
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

export interface SharedDocumentSummary extends DocumentSummary {
  ownerEmail: string;
  /** accountIndex에 없는 소유자(아주 오래된 계정 등)는 빈 문자열 — 이메일만으로 대체 표시. */
  ownerName: string;
}

/**
 * 나에게 공유된 문서 목록을 조회한다(P6-5). 내 계정 폴더의 `sharedDocumentRefs`(공유
 * 추가/해제 시점에 갱신되는 캐시, P6-1/P6-4)를 근거로 삼되, 제목·게시 여부·태그·최종
 * 수정일은 캐시에 기록된 스냅샷이 아니라 `listDocuments()`와 같은 방식(`fetchDocumentEntry`)
 * 으로 매번 다시 읽어 최신 상태를 반환한다.
 *
 * `sharedDocumentRefs`는 실시간 동기화가 아닌 캐시라 실제와 어긋날 수 있다(data-spec.md
 * 참고) — 참조된 문서가 이미 완전히 삭제됐거나(휴지통 보관 기간 만료 등) 더 이상 접근할 수
 * 없으면 그 항목만 조용히 목록에서 제외한다(전체 조회가 깨지지 않는다).
 */
export async function listSharedDocuments(email: string): Promise<SharedDocumentSummary[]> {
  const folder = await ensurePersonalFolder(email);
  const refs = await getSharedDocumentRefs(folder.accountFolderId);
  if (refs.length === 0) return [];

  const owners = await getAccountsByEmails([
    ...new Set(refs.map((ref) => ref.ownerEmail)),
  ]);
  const ownerName = (ownerEmail: string) =>
    owners.find((owner) => owner.email === ownerEmail)?.name ?? "";

  const entries = await Promise.all(
    refs.map(async (ref): Promise<SharedDocumentSummary | null> => {
      try {
        const page = await getPageOrThrow(ref.pageId);
        const { summary } = await fetchDocumentEntry(page);
        return { ...summary, ownerEmail: ref.ownerEmail, ownerName: ownerName(ref.ownerEmail) };
      } catch (error) {
        if (error instanceof NotFoundError) return null;
        throw error;
      }
    })
  );

  return entries.filter((entry): entry is SharedDocumentSummary => entry !== null);
}

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

async function isDocumentOwner(pageId: string, email: string): Promise<boolean> {
  const authorEmail = await readAuthorEmail(pageId);
  return authorEmail === email;
}

/**
 * 문서의 실제 작성자가 로그인 사용자인지 확인한다. authorMeta가 없거나 이메일이 다르면
 * UnauthorizedError(401)를 던져, pageId만 알아낸 다른 직원이 남의 문서를 삭제하는 것을
 * 막는다. 삭제처럼 소유자 전용으로 남겨야 하는 동작에만 쓴다 — 조회·수정에는 공유받은
 * 사람도 통과해야 하므로 `requireDocumentAccess`를 쓴다(P6-6).
 */
export async function requireDocumentOwner(
  pageId: string,
  email: string
): Promise<void> {
  if (!(await isDocumentOwner(pageId, email))) {
    throw new UnauthorizedError("이 문서에 대한 권한이 없습니다.");
  }
}

/**
 * 문서 소유자이거나 `sharingMeta.sharedWith`에 포함된 공유 대상이면 통과한다(P6-6) —
 * "공유받은 사람도 소유자와 동일하게 조회·편집할 수 있다"는 결정(prd.md "페이지 공유")을
 * 코드로 반영한다. 조회(`/editor/[pageId]`)·저장·게시 설정·이미지 업로드·버전 히스토리·
 * 태그 설정에 쓴다. 삭제는 여기 포함하지 않는다 — 공유받은 사람이 남의 문서를 휴지통으로
 * 보낼 수는 없어야 한다는 판단으로 `requireDocumentOwner`를 그대로 쓴다(task.md "결정이
 * 필요한 사항" 참고).
 */
export async function requireDocumentAccess(
  pageId: string,
  email: string
): Promise<void> {
  if (await isDocumentOwner(pageId, email)) {
    return;
  }
  const { sharedWith } = await getSharingMeta(pageId);
  if (!sharedWith.includes(email)) {
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
  const [page, sourceProperty, sharingMeta, ownerEmail] = await Promise.all([
    getPageOrThrow(pageId),
    getPageProperty<{ title?: string; doc: JSONContent }>(
      pageId,
      SOURCE_DOCUMENT_PROPERTY_KEY
    ),
    getSharingMeta(pageId),
    readAuthorEmail(pageId),
  ]);

  // accountIndex에 없는 이메일(아주 오래된 계정 등)은 이름 없이 이메일만으로 대체한다 —
  // 검색 결과에서 사라지는 것과 달리, 이미 공유된 목록에서는 조용히 빠지면 안 된다.
  const knownAccounts = await getAccountsByEmails(sharingMeta.sharedWith);
  const sharedWith: SharedAccount[] = sharingMeta.sharedWith.map((email) => ({
    email,
    name: knownAccounts.find((account) => account.email === email)?.name ?? "",
  }));

  return {
    pageId: page.id,
    title: sourceProperty?.value?.title ?? "",
    doc: sourceProperty?.value?.doc ?? { type: "doc", content: [] },
    version: page.version.number,
    updatedAt: page.version.createdAt,
    lastEditedBy: sharingMeta.lastEditedBy,
    ownerEmail: ownerEmail ?? "",
    sharedWith,
  };
}

export interface CreateDocumentInput {
  accountFolderId: string;
  title: string;
  doc: JSONContent;
  actualAuthorEmail: string;
  /** 생성 시점에 바로 넣을 폴더(P7-3). 지정하지 않으면(또는 `null`) "미분류"로 시작한다. */
  folderId?: string | null;
}

/** `folderId`가 있으면 그 계정의 폴더 트리에 실제로 존재하는지 검증한다(P7-3). */
async function validateFolderId(
  accountFolderId: string,
  folderId: string | null
): Promise<void> {
  if (folderId === null) return;
  const folders = await listFolders(accountFolderId);
  if (!folders.some((folder) => folder.id === folderId)) {
    throw new ValidationError("폴더를 찾을 수 없습니다.");
  }
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
  const folderId = input.folderId ?? null;
  await validateFolderId(input.accountFolderId, folderId);

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
    // "미분류"(null)는 property 자체를 만들지 않는다 — 기존 문서가 전부 그런 상태로
    // 시작하는 것과 대칭을 맞춘다(별도 마이그레이션 없이도 항상 같은 기본값으로 읽힘).
    ...(folderId !== null ? [upsertPageProperty(page.id, FOLDER_PROPERTY_KEY, folderId)] : []),
  ]);

  return { pageId: page.id, version: page.version.number };
}

/**
 * 기존 문서를 다른 폴더로 옮긴다(P7-3). `folderId`가 `null`이면 "미분류"로 되돌린다 —
 * Confluence property API가 `value: null`을 거부하므로(2026-09-09 실사용 확인,
 * `deletePageProperty` 참고) property를 값으로 지우는 대신 아예 없애는 방식으로 표현한다.
 * 폴더는 소유자 개인의 조직 체계라 이 함수 자체는 소유권을 검사하지 않는다 — 호출부
 * (API 라우트)가 `requireDocumentOwner`로 미리 확인해야 한다.
 */
export async function setDocumentFolder(
  pageId: string,
  accountFolderId: string,
  folderId: string | null
): Promise<void> {
  await validateFolderId(accountFolderId, folderId);
  if (folderId === null) {
    await deletePageProperty(pageId, FOLDER_PROPERTY_KEY);
  } else {
    await upsertPageProperty(pageId, FOLDER_PROPERTY_KEY, folderId);
  }
}

/**
 * 계정의 모든 문서 중 `fromFolderId`에 속한 것을 전부 `toFolderId`로 재배정한다 —
 * 폴더 삭제 시 그 안의 문서를 잃지 않고 상위로 승격시키는 정책(P7-2에서 하위 *폴더*만
 * 먼저 구현하고 문서 쪽은 이 함수로 미뤄뒀다)의 문서 쪽 절반이다. `folders.ts`는 문서를
 * 몰라야 하므로(순환 참조 방지), 이 오케스트레이션은 항상 `folders.deleteFolder`를 호출한
 * 뒤 API 라우트에서 이 함수를 이어 호출하는 방식으로 조립한다.
 */
export async function reassignDocumentsFolder(
  accountFolderId: string,
  fromFolderId: string,
  toFolderId: string | null
): Promise<void> {
  const pages = await listChildPages(accountFolderId);
  const currentFolderIds = await Promise.all(
    pages.map((page) => getPageProperty<string | null>(page.id, FOLDER_PROPERTY_KEY))
  );
  const affectedPageIds = pages
    .filter((_, index) => (currentFolderIds[index]?.value ?? null) === fromFolderId)
    .map((page) => page.id);

  await Promise.all(
    affectedPageIds.map((pageId) =>
      toFolderId === null
        ? deletePageProperty(pageId, FOLDER_PROPERTY_KEY)
        : upsertPageProperty(pageId, FOLDER_PROPERTY_KEY, toFolderId)
    )
  );
}

export interface UpdateDocumentInput {
  pageId: string;
  title: string;
  doc: JSONContent;
  expectedVersion: number;
  /** 저장을 요청한 사람(P6-7) — 성공 시 `sharingMeta.lastEditedBy`를 이 값으로 갱신한다. */
  editor: { email: string; name: string };
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
    const { lastEditedBy } = await getSharingMeta(input.pageId);
    throw new ConflictError(
      `문서가 이미 최신 버전(${current.version.number})으로 변경되었습니다.` +
        (lastEditedBy
          ? ` 마지막으로 저장한 사람: ${formatAccountLabel(lastEditedBy.email, lastEditedBy.name)}.`
          : "") +
        " 최신 내용을 확인한 뒤 다시 저장하세요.",
      { lastEditedBy }
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
      const { lastEditedBy } = await getSharingMeta(input.pageId);
      throw new ConflictError(
        "문서 본문은 저장됐지만, 편집 원본이 동시에 다른 곳에서 변경되어 반영하지 못했습니다. 최신 내용을 다시 불러온 뒤 저장하세요.",
        { lastEditedBy }
      );
    }
    throw error;
  }

  const sharingMeta = await updateLastEditedBy(input.pageId, input.editor);

  return {
    pageId: updated.id,
    version: updated.version.number,
    lastEditedBy: sharingMeta.lastEditedBy,
  };
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
