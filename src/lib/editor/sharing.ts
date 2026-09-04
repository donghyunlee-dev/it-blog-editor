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

const DEFAULT_SHARING_META: SharingMeta = { sharedWith: [] };

/** 문서의 `sharingMeta`를 읽는다. 공유한 적 없는 문서는 property 자체가 없다(하위 호환 기본값). */
export async function getSharingMeta(pageId: string): Promise<SharingMeta> {
  const property = await getPageProperty<SharingMeta>(pageId, SHARING_META_PROPERTY_KEY);
  return property?.value ?? DEFAULT_SHARING_META;
}

/** 공유 대상을 추가한다. 이미 공유돼 있으면 그대로 둔다(idempotent). */
export async function shareDocument(pageId: string, email: string): Promise<SharingMeta> {
  const current = await getSharingMeta(pageId);
  if (current.sharedWith.includes(email)) {
    return current;
  }
  const next: SharingMeta = { ...current, sharedWith: [...current.sharedWith, email] };
  await upsertPageProperty(pageId, SHARING_META_PROPERTY_KEY, next);
  return next;
}

/** 공유 대상을 제거한다. 원래 공유돼 있지 않았어도 에러 없이 그대로 둔다(idempotent). */
export async function unshareDocument(pageId: string, email: string): Promise<SharingMeta> {
  const current = await getSharingMeta(pageId);
  if (!current.sharedWith.includes(email)) {
    return current;
  }
  const next: SharingMeta = {
    ...current,
    sharedWith: current.sharedWith.filter((candidate) => candidate !== email),
  };
  await upsertPageProperty(pageId, SHARING_META_PROPERTY_KEY, next);
  return next;
}

/**
 * 마지막 수정자를 갱신한다(P6-7에서 문서 저장 성공 시 호출할 용도로 미리 준비 — 이 항목
 * 에서는 실제 호출 배선은 연결하지 않는다). `sharedWith`는 그대로 보존한다.
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
 * 실시간 동기화가 아니라 쓰기 시점에 갱신되는 캐시). 쓰기 경로(공유 추가/해제 시 갱신)는
 * P6-4에서 연결한다 — 이 항목은 읽기 함수만 준비한다.
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
