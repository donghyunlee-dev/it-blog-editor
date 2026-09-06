import { getPageProperty, replacePageBody, upsertPageProperty } from "@/lib/confluence/client";
import { upsertAccountIndexEntry } from "./account-index";
import { ValidationError } from "./errors";
import { escapeHtml } from "@/lib/html-escape";
import { logger, serializeError } from "@/lib/logger";

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
 * `accountMeta`를 바꿀 때마다(P5-7) "계정 관리" 페이지의 `accountIndex` 항목도 같은 최신
 * 값으로 함께 upsert한다 — 이 인덱스가 계정 검색의 유일한 조회 대상이라, 호출자가 개별적으로
 * 동기화를 챙기게 두면 언젠가 빠뜨리기 쉽다. 그래서 `accountMeta`를 쓰는 세 함수(아래) 안에
 * 공통으로 넣어 설계를 코드로 강제한다.
 */
async function syncAccountIndex(
  accountFolderId: string,
  email: string,
  meta: AccountMeta
): Promise<void> {
  await upsertAccountIndexEntry({
    email,
    name: meta.name,
    team: meta.team,
    accessEnabled: meta.accessEnabled,
    accountFolderId,
  });
}

/**
 * 계정 폴더 페이지 본문을 accountMeta의 최신 스냅샷(표)으로 다시 그린다(2026-09-04, 사용자
 * 요청 — 관리자가 Confluence에서 이 페이지를 직접 열어봐도 값을 확인할 수 있어야 한다).
 * 진짜 데이터는 여전히 `accountMeta` property이고, 본문은 참고용일 뿐이다 — 본문을 직접
 * 고쳐도 property에는 반영되지 않고, 다음 갱신 시점에 다시 덮어써진다.
 */
function renderAccountFolderBody(email: string, meta: AccountMeta): string {
  const name = meta.name.trim() ? escapeHtml(meta.name) : "(온보딩 전)";
  const team = meta.team.trim() ? escapeHtml(meta.team) : "(온보딩 전)";
  const access = meta.accessEnabled ? "허용" : "차단";
  const onboardedAt = meta.onboardedAt ? escapeHtml(meta.onboardedAt) : "-";
  return (
    `<p>${escapeHtml(email)}님의 문서함입니다.</p>` +
    "<p>아래 표는 이 페이지의 accountMeta property를 관리자가 한눈에 볼 수 있도록 저장 " +
    "시점마다 다시 그리는 참고용 스냅샷입니다 — 실제 값은 accountMeta property가 기준이고, " +
    "이 표를 직접 고쳐도 반영되지 않습니다.</p>" +
    "<table>" +
    `<tr><th>이름</th><td>${name}</td></tr>` +
    `<tr><th>팀</th><td>${team}</td></tr>` +
    `<tr><th>접속 허용</th><td>${access}</td></tr>` +
    `<tr><th>온보딩 완료</th><td>${onboardedAt}</td></tr>` +
    "</table>"
  );
}

/**
 * 위 본문 갱신을 best-effort로 시도한다 — 실패해도 `accountMeta` 저장(진짜 데이터)은 이미
 * 끝난 뒤라 그대로 무시하고 로그만 남긴다(`documents.ts`의 `recordDeletedDocument`와 같은
 * 원칙: 부가 기능의 실패가 핵심 동작을 막아서는 안 된다).
 */
async function syncAccountFolderBody(
  accountFolderId: string,
  email: string,
  meta: AccountMeta
): Promise<void> {
  try {
    await replacePageBody(accountFolderId, renderAccountFolderBody(email, meta));
  } catch (error) {
    logger.error("계정 폴더 본문 갱신 실패(관리자 열람용 — accountMeta 자체는 정상 저장됨)", {
      error: serializeError(error),
    });
  }
}

/**
 * 이름·팀을 저장한다(온보딩 최초 완료·이후 수정 공용). `accessEnabled`는 이 함수로 바꿀 수
 * 없다 — 관리자 전용 스크립트(P5-6)만 변경한다. `onboardedAt`은 최초 저장 시점에만 채우고
 * 이후 재수정에서는 그대로 유지한다.
 */
export async function saveAccountMeta(
  accountFolderId: string,
  email: string,
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
  await syncAccountIndex(accountFolderId, email, next);
  await syncAccountFolderBody(accountFolderId, email, next);
  return next;
}

/** 계정 폴더 생성 직후 기본 `accountMeta`를 명시적으로 기록한다(`folder.ts`에서 호출). */
export async function initializeAccountMeta(
  accountFolderId: string,
  email: string
): Promise<AccountMeta> {
  await upsertPageProperty(accountFolderId, ACCOUNT_META_PROPERTY_KEY, DEFAULT_ACCOUNT_META);
  await syncAccountIndex(accountFolderId, email, DEFAULT_ACCOUNT_META);
  await syncAccountFolderBody(accountFolderId, email, DEFAULT_ACCOUNT_META);
  return DEFAULT_ACCOUNT_META;
}

/**
 * 계정의 접속 허용 여부만 바꾼다(P5-6, `scripts/set-account-access.ts` 전용 — 사용자가
 * 스스로 호출할 수 있는 API에는 노출하지 않는다). 이름·팀 등 나머지 필드는 건드리지 않는다.
 */
export async function setAccessEnabled(
  accountFolderId: string,
  email: string,
  accessEnabled: boolean
): Promise<AccountMeta> {
  const current = await getAccountMeta(accountFolderId);
  const next: AccountMeta = { ...current, accessEnabled };
  await upsertPageProperty(accountFolderId, ACCOUNT_META_PROPERTY_KEY, next);
  await syncAccountIndex(accountFolderId, email, next);
  await syncAccountFolderBody(accountFolderId, email, next);
  return next;
}
