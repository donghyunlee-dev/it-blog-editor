import {
  createPage,
  findChildPageByTitle,
  getConfiguredSpace,
  getPageProperty,
  upsertPageProperty,
} from "@/lib/confluence/client";

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
}

/**
 * 이름·이메일·팀 부분 일치(대소문자 무시)로 계정을 검색한다. 검색어가 빈 문자열이면 전체
 * 목록을 반환한다("계정 관리" 화면의 최초 진입 시 동작과 동일). "계정 관리" 페이지가 아직
 * 없으면(계정이 하나도 만들어지지 않은 초기 상태) 빈 배열을 반환한다 — 읽기 동작에서는
 * 페이지를 새로 만들지 않는다(쓰기 시점에만 생성, 위 Global Constraints 참고).
 */
export async function searchAccounts(query: string): Promise<AccountIndexEntry[]> {
  const space = await getSpaceHomepageId();
  const page = await findChildPageByTitle(space.homepageId, ACCOUNT_INDEX_PAGE_TITLE);
  if (!page) return [];

  const property = await getPageProperty<AccountIndexEntry[]>(
    page.id,
    ACCOUNT_INDEX_PROPERTY_KEY
  );
  const entries = property?.value ?? [];
  const q = query.trim().toLowerCase();
  if (!q) return entries;

  return entries.filter(
    (entry) =>
      entry.email.toLowerCase().includes(q) ||
      entry.name.toLowerCase().includes(q) ||
      entry.team.toLowerCase().includes(q)
  );
}
