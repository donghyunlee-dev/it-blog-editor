import {
  createPage,
  findChildPageByTitle,
  getConfiguredSpace,
  getPageProperty,
  replacePageBody,
  upsertPageProperty,
} from "@/lib/confluence/client";
import { escapeHtml } from "@/lib/html-escape";
import { logger, serializeError } from "@/lib/logger";

export const ACCOUNT_INDEX_PAGE_TITLE = "계정 관리";
export const ACCOUNT_INDEX_PROPERTY_KEY = "accountIndex";

export interface AccountIndexEntry {
  email: string;
  name: string;
  team: string;
  accessEnabled: boolean;
  accountFolderId: string;
}

async function getSpaceHomepageId() {
  const space = await getConfiguredSpace();
  if (!space.homepageId) {
    throw new Error("Confluence Space에 홈페이지가 설정되어 있지 않습니다.");
  }
  return { id: space.id, homepageId: space.homepageId };
}

/**
 * Space 홈페이지 하위에서 "계정 관리" 페이지를 찾고, 없으면 만든다(계정 폴더 자동 생성과
 * 같은 패턴 — data-spec.md "AccountIndex" 참고). `folder.ts`의 계정 폴더 조회와 별개
 * 모듈이라 순환 참조를 피하려 `getConfiguredSpace`를 직접 다시 호출한다.
 */
async function ensureAccountIndexPage(): Promise<string> {
  const space = await getSpaceHomepageId();
  const existing = await findChildPageByTitle(space.homepageId, ACCOUNT_INDEX_PAGE_TITLE);
  if (existing) return existing.id;

  const page = await createPage({
    spaceId: space.id,
    parentId: space.homepageId,
    title: ACCOUNT_INDEX_PAGE_TITLE,
    bodyValue: "<p>전체 계정의 이름·팀·접속 허용 여부를 조회하는 페이지입니다.</p>",
  });
  return page.id;
}

/**
 * 계정 하나의 인덱스 항목을 이메일 기준으로 upsert한다. 계정 폴더 생성·온보딩 완료·정보
 * 수정·접속 권한 변경 시마다 `account.ts`가 호출한다 — 이 인덱스가 계정 검색(공유 대상
 * 검색 포함)의 유일한 조회 대상이라, 호출을 빠뜨리면 그 계정이 검색 결과에서 보이지 않게
 * 된다.
 */
export async function upsertAccountIndexEntry(entry: AccountIndexEntry): Promise<void> {
  const pageId = await ensureAccountIndexPage();
  const property = await getPageProperty<AccountIndexEntry[]>(
    pageId,
    ACCOUNT_INDEX_PROPERTY_KEY
  );
  const entries = property?.value ?? [];
  const next = [
    ...entries.filter((existing) => existing.email !== entry.email),
    entry,
  ];
  await upsertPageProperty(pageId, ACCOUNT_INDEX_PROPERTY_KEY, next);
  await syncAccountIndexBody(pageId, next);
}

/**
 * "계정 관리" 페이지 본문을 accountIndex의 최신 스냅샷(표)으로 다시 그린다(2026-09-04,
 * 사용자 요청 — 관리자가 Confluence에서 이 페이지를 직접 열어봐도 전체 계정 목록을 확인할
 * 수 있어야 한다). 진짜 데이터는 여전히 `accountIndex` property이고, 본문은 참고용이다.
 */
function renderAccountIndexBody(entries: AccountIndexEntry[]): string {
  const rows = entries
    .slice()
    .sort((a, b) => a.email.localeCompare(b.email))
    .map(
      (entry) =>
        "<tr>" +
        `<td>${escapeHtml(entry.email)}</td>` +
        `<td>${entry.name.trim() ? escapeHtml(entry.name) : "-"}</td>` +
        `<td>${entry.team.trim() ? escapeHtml(entry.team) : "-"}</td>` +
        `<td>${entry.accessEnabled ? "허용" : "차단"}</td>` +
        "</tr>"
    )
    .join("");
  return (
    "<p>전체 계정의 이름·팀·접속 허용 여부를 조회하는 페이지입니다.</p>" +
    "<p>아래 표는 이 페이지의 accountIndex property를 관리자가 한눈에 볼 수 있도록 갱신 " +
    `시점마다 다시 그리는 참고용 스냅샷입니다(총 ${entries.length}건) — 실제 값은 ` +
    "accountIndex property가 기준이고, 이 표를 직접 고쳐도 반영되지 않습니다.</p>" +
    "<table>" +
    "<tr><th>이메일</th><th>이름</th><th>팀</th><th>접속</th></tr>" +
    rows +
    "</table>"
  );
}

/** 본문 갱신을 best-effort로 시도한다 — 실패해도 accountIndex 저장(진짜 데이터)은 이미 끝난 뒤다. */
async function syncAccountIndexBody(
  pageId: string,
  entries: AccountIndexEntry[]
): Promise<void> {
  try {
    await replacePageBody(pageId, renderAccountIndexBody(entries));
  } catch (error) {
    logger.error("계정 관리 페이지 본문 갱신 실패(관리자 열람용 — accountIndex 자체는 정상 저장됨)", {
      error: serializeError(error),
    });
  }
}

/**
 * "계정 관리" 페이지의 `accountIndex` 전체를 읽는다. 페이지가 아직 없으면(계정이 하나도
 * 만들어지지 않은 초기 상태) 빈 배열을 반환한다 — 읽기 동작에서는 페이지를 새로 만들지
 * 않는다(쓰기 시점에만 생성, 위 Global Constraints 참고).
 */
async function listAllEntries(): Promise<AccountIndexEntry[]> {
  const space = await getSpaceHomepageId();
  const page = await findChildPageByTitle(space.homepageId, ACCOUNT_INDEX_PAGE_TITLE);
  if (!page) return [];

  const property = await getPageProperty<AccountIndexEntry[]>(
    page.id,
    ACCOUNT_INDEX_PROPERTY_KEY
  );
  return property?.value ?? [];
}

/**
 * 이름·이메일·팀 부분 일치(대소문자 무시)로 계정을 검색한다. 검색어가 빈 문자열이면 전체
 * 목록을 반환한다("계정 관리" 화면의 최초 진입 시 동작과 동일).
 */
export async function searchAccounts(query: string): Promise<AccountIndexEntry[]> {
  const entries = await listAllEntries();
  const q = query.trim().toLowerCase();
  if (!q) return entries;

  return entries.filter(
    (entry) =>
      entry.email.toLowerCase().includes(q) ||
      entry.name.toLowerCase().includes(q) ||
      entry.team.toLowerCase().includes(q)
  );
}

/**
 * 주어진 이메일 집합에 해당하는 계정만 골라 반환한다(P6-2/P6-3 — 공유 목록의 표시 이름을
 * 채우는 용도). 순서는 보장하지 않는다 — 호출자가 필요하면 `emails` 순서대로 다시 매핑한다.
 * 인덱스에 없는 이메일(예: `accountMeta`는 있지만 아직 한 번도 인덱스에 기록되지 않은 아주
 * 오래된 계정)은 결과에서 조용히 빠진다 — 호출자가 이메일 자체로 대체 표시해야 한다.
 */
export async function getAccountsByEmails(
  emails: string[]
): Promise<AccountIndexEntry[]> {
  if (emails.length === 0) return [];
  const wanted = new Set(emails);
  const entries = await listAllEntries();
  return entries.filter((entry) => wanted.has(entry.email));
}
