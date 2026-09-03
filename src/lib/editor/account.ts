import { getPageProperty, upsertPageProperty } from "@/lib/confluence/client";
import { ValidationError } from "./errors";

export const ACCOUNT_META_PROPERTY_KEY = "accountMeta";

export interface AccountMeta {
  name: string;
  team: string;
  accessEnabled: boolean;
  onboardedAt?: string;
}

/**
 * `accountMeta`가 없는 계정 폴더(이 기능 도입 이전에 생성됨)에 적용하는 하위 호환 기본값.
 * 접속은 항상 허용(`accessEnabled: true`)하고, 이름·팀이 비어 있으므로 `needsOnboarding`이
 * 그대로 true를 반환해 다음 로그인 때 온보딩 팝업을 띄우게 된다.
 */
export const DEFAULT_ACCOUNT_META: AccountMeta = {
  name: "",
  team: "",
  accessEnabled: true,
};

/** 계정 폴더의 `accountMeta`를 읽는다. property가 없으면(하위 호환) 기본값을 반환한다. */
export async function getAccountMeta(accountFolderId: string): Promise<AccountMeta> {
  const property = await getPageProperty<AccountMeta>(
    accountFolderId,
    ACCOUNT_META_PROPERTY_KEY
  );
  return property?.value ?? DEFAULT_ACCOUNT_META;
}

/** 이름·팀이 하나라도 비어 있으면 온보딩이 아직 끝나지 않은 것으로 판단한다. */
export function needsOnboarding(meta: AccountMeta): boolean {
  return meta.name.trim() === "" || meta.team.trim() === "";
}

/**
 * 이름·팀을 저장한다(온보딩 최초 완료·이후 수정 공용). `accessEnabled`는 이 함수로 바꿀 수
 * 없다 — 관리자 전용 스크립트(P5-6)만 변경한다. `onboardedAt`은 최초 저장 시점에만 채우고
 * 이후 재수정에서는 그대로 유지한다.
 */
export async function saveAccountMeta(
  accountFolderId: string,
  updates: { name: string; team: string }
): Promise<AccountMeta> {
  const name = updates.name.trim();
  const team = updates.team.trim();
  if (!name || !team) {
    throw new ValidationError("이름과 팀을 모두 입력해주세요.");
  }

  const current = await getAccountMeta(accountFolderId);
  const next: AccountMeta = {
    ...current,
    name,
    team,
    onboardedAt: current.onboardedAt ?? new Date().toISOString(),
  };
  await upsertPageProperty(accountFolderId, ACCOUNT_META_PROPERTY_KEY, next);
  return next;
}

/** 계정 폴더 생성 직후 기본 `accountMeta`를 명시적으로 기록한다(`folder.ts`에서 호출). */
export async function initializeAccountMeta(accountFolderId: string): Promise<AccountMeta> {
  await upsertPageProperty(accountFolderId, ACCOUNT_META_PROPERTY_KEY, DEFAULT_ACCOUNT_META);
  return DEFAULT_ACCOUNT_META;
}
