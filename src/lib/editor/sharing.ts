import { getPageProperty, upsertPageProperty } from "@/lib/confluence/client";

export const SHARING_META_PROPERTY_KEY = "sharingMeta";
export const SHARED_DOCUMENT_REFS_PROPERTY_KEY = "sharedDocumentRefs";

export interface SharingLastEditedBy {
  email: string;
  name: string;
  editedAt: string;
}

export interface SharingMeta {
  sharedWith: string[];
  lastEditedBy?: SharingLastEditedBy;
}

export interface SharedDocumentRef {
  pageId: string;
  ownerEmail: string;
  documentTitle: string;
  sharedAt: string;
}

/** 공유 대상 — 문서의 `sharedWith`와 이 사람의 `sharedDocumentRefs`를 함께 갱신하는 데 필요한 식별자. */
export interface ShareTarget {
  email: string;
  accountFolderId: string;
}

/** `sharedDocumentRefs` 항목을 채우는 데 필요한, 공유되는 문서 자체의 정보. */
export interface SharedDocumentMeta {
  ownerEmail: string;
  documentTitle: string;
}

const DEFAULT_SHARING_META: SharingMeta = { sharedWith: [] };

/** 문서의 `sharingMeta`를 읽는다. 공유한 적 없는 문서는 property 자체가 없다(하위 호환 기본값). */
export async function getSharingMeta(pageId: string): Promise<SharingMeta> {
  const property = await getPageProperty<SharingMeta>(pageId, SHARING_META_PROPERTY_KEY);
  return property?.value ?? DEFAULT_SHARING_META;
}

/**
 * 공유 대상을 추가한다(P6-4) — 문서의 `sharedWith`와 대상 계정 폴더의 `sharedDocumentRefs`를
 * 함께 갱신한다(P1-2b `deletedDocuments`와 같은 "쓰기 시점에 양쪽을 함께 갱신하는 캐시" 패턴).
 * 이미 공유돼 있으면 아무것도 쓰지 않는다(idempotent) — 재공유로 `documentTitle`이 바뀌었을
 * 수 있는 경우를 갱신하려면 먼저 `unshareDocument`로 해제한 뒤 다시 공유해야 한다.
 */
export async function shareDocument(
  pageId: string,
  target: ShareTarget,
  document: SharedDocumentMeta
): Promise<SharingMeta> {
  const current = await getSharingMeta(pageId);
  if (current.sharedWith.includes(target.email)) {
    return current;
  }
  const next: SharingMeta = { ...current, sharedWith: [...current.sharedWith, target.email] };
  await upsertPageProperty(pageId, SHARING_META_PROPERTY_KEY, next);
  await upsertSharedDocumentRef(target.accountFolderId, {
    pageId,
    ownerEmail: document.ownerEmail,
    documentTitle: document.documentTitle,
    sharedAt: new Date().toISOString(),
  });
  return next;
}

/**
 * 공유 대상을 제거한다(P6-4) — 문서의 `sharedWith`와 대상 계정 폴더의 `sharedDocumentRefs`를
 * 함께 갱신한다. 원래 공유돼 있지 않았어도 에러 없이 그대로 둔다(idempotent).
 */
export async function unshareDocument(pageId: string, target: ShareTarget): Promise<SharingMeta> {
  const current = await getSharingMeta(pageId);
  if (!current.sharedWith.includes(target.email)) {
    return current;
  }
  const next: SharingMeta = {
    ...current,
    sharedWith: current.sharedWith.filter((candidate) => candidate !== target.email),
  };
  await upsertPageProperty(pageId, SHARING_META_PROPERTY_KEY, next);
  await removeSharedDocumentRef(target.accountFolderId, pageId);
  return next;
}

/**
 * 마지막 수정자를 갱신한다(`documents.ts`의 `updateDocument`가 문서 저장 성공 시 호출한다,
 * P6-7). `sharedWith`는 그대로 보존한다.
 */
export async function updateLastEditedBy(
  pageId: string,
  editor: { email: string; name: string }
): Promise<SharingMeta> {
  const current = await getSharingMeta(pageId);
  const next: SharingMeta = {
    ...current,
    lastEditedBy: { ...editor, editedAt: new Date().toISOString() },
  };
  await upsertPageProperty(pageId, SHARING_META_PROPERTY_KEY, next);
  return next;
}

/**
 * 계정 폴더가 공유받은 문서 참조 목록을 읽는다(P1-2b `deletedDocuments`와 같은 패턴 —
 * 실시간 동기화가 아니라 쓰기 시점에 갱신되는 캐시). `shareDocument`/`unshareDocument`가
 * 쓰기 경로를 담당한다(P6-4).
 */
export async function getSharedDocumentRefs(
  accountFolderId: string
): Promise<SharedDocumentRef[]> {
  const property = await getPageProperty<SharedDocumentRef[]>(
    accountFolderId,
    SHARED_DOCUMENT_REFS_PROPERTY_KEY
  );
  return property?.value ?? [];
}

/** 같은 `pageId` 항목이 있으면 교체하고, 없으면 추가한다(재공유 시 `documentTitle` 갱신 목적). */
async function upsertSharedDocumentRef(
  accountFolderId: string,
  ref: SharedDocumentRef
): Promise<void> {
  const refs = await getSharedDocumentRefs(accountFolderId);
  const next = [...refs.filter((existing) => existing.pageId !== ref.pageId), ref];
  await upsertPageProperty(accountFolderId, SHARED_DOCUMENT_REFS_PROPERTY_KEY, next);
}

/** 해당 `pageId` 항목을 제거한다. 원래 없었으면 조용히 아무것도 쓰지 않는다(idempotent). */
async function removeSharedDocumentRef(accountFolderId: string, pageId: string): Promise<void> {
  const refs = await getSharedDocumentRefs(accountFolderId);
  const next = refs.filter((existing) => existing.pageId !== pageId);
  if (next.length === refs.length) {
    return;
  }
  await upsertPageProperty(accountFolderId, SHARED_DOCUMENT_REFS_PROPERTY_KEY, next);
}
