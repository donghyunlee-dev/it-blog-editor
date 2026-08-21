import {
  clearPageRestrictions,
  getCurrentConfluenceUser,
  restrictPageToAccount,
} from "@/lib/confluence/client";

let cachedServiceAccountId: string | null = null;

async function getServiceAccountId(): Promise<string> {
  if (!cachedServiceAccountId) {
    const user = await getCurrentConfluenceUser();
    cachedServiceAccountId = user.accountId;
  }
  return cachedServiceAccountId;
}

/** 다른 직원에게 이 페이지가 보이지 않도록, 서비스 계정 자신만 읽기/수정 가능하게 제한한다. */
export async function hidePageFromOthers(pageId: string): Promise<void> {
  const accountId = await getServiceAccountId();
  await restrictPageToAccount(pageId, accountId);
}

/** 제한을 해제해 Space 기본 권한(구성원 전체 공개)으로 되돌린다. */
export async function revealPageToSpace(pageId: string): Promise<void> {
  await clearPageRestrictions(pageId);
}
