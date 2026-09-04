# P5-7: 최상단 계정 관리 페이지 — 구현 결과 보고서

## 구현 내용
- `src/lib/editor/account-index.ts`(신규) — `AccountIndexEntry`, `upsertAccountIndexEntry`,
  `searchAccounts`. Space 홈페이지 하위의 "계정 관리" 페이지를 find-or-create하고, 그 페이지의
  `accountIndex` property(이메일 기준 배열)를 읽고 쓴다. 페이지가 없을 때 새로 만드는 것은
  `upsertAccountIndexEntry`(쓰기)에서만 하고, `searchAccounts`(읽기)는 페이지가 없으면 그냥
  빈 배열을 반환한다(계정 폴더 자동 생성과 같은 "쓰기 시점에만 생성" 패턴).
- `src/lib/editor/account.ts` — `saveAccountMeta`/`setAccessEnabled`/`initializeAccountMeta`에
  `email` 파라미터를 추가하고, 셋 다 `accountMeta`를 쓴 직후 `upsertAccountIndexEntry`로
  `accountIndex`도 같은 값으로 동기화하는 공통 헬퍼(`syncAccountIndex`)를 호출하도록 했다.
  호출자(`folder.ts`의 `createPersonalFolder`, `PUT /api/editor/account`,
  `scripts/set-account-access.ts`)가 개별적으로 동기화를 챙길 필요가 없다.
- `GET /api/editor/account/search`(신규) — `q` 쿼리 파라미터가 없으면 400, 있으면(빈 문자열
  포함) `searchAccounts(q)`를 호출해 `{ email, name, team, accessEnabled }` 배열을 반환한다
  (`accountFolderId`는 내부 식별자라 응답에서 제외).
- `/editor/accounts`(신규) — `@sfood/ui`의 `ListSearchTable` 템플릿을 그대로 써서 "계정" (이름
  (이메일)) · "팀" · "접속"(`StatusBadge`로 허용/차단) 3열 목록+검색 화면을 만들었다. 마운트
  시 빈 검색어로 전체 목록을 불러오고, 검색어를 바꾸면 같은 API를 다시 호출한다. 조회
  전용이라 이 화면에서 접속 허용 여부를 바꾸는 액션은 없다(P5-6 결정 유지).
- `EditorSidebar.tsx`의 "문서 관련 기능" 영역에 "계정 관리" 링크를 추가해 `/editor/accounts`로
  이동할 수 있게 했다.

## 파일 변경 내역
| 파일 | 변경 사항 |
|------|---------|
| `src/lib/editor/account-index.ts`, `.test.ts` | 신규 — AccountIndex 도메인 함수 |
| `src/lib/editor/account.ts`, `.test.ts` | `email` 파라미터 추가 + accountIndex 동기화 |
| `src/lib/editor/folder.ts` | `initializeAccountMeta` 호출에 `email` 전달 |
| `src/app/api/editor/account/route.ts`, `.test.ts` | `saveAccountMeta` 호출부(email 추가) |
| `src/app/api/editor/account/search/route.ts`, `.test.ts` | 신규 — 계정 검색 API |
| `src/app/editor/accounts/page.tsx`, `.test.tsx` | 신규 — 계정 관리 화면 |
| `src/components/editor/EditorSidebar.tsx`, `.test.tsx` | "계정 관리" 진입 링크 추가 |
| `scripts/set-account-access.ts` | `setAccessEnabled` 호출부(email 추가) |
| `docs/product/prd.md` | P5-7 체크리스트 완료 표시, Phase 5 완료 처리 |
| `docs/product/api-spec.md` | 검색 응답 예시에 `accessEnabled` 필드 반영 |
| `docs/product/design.md` | 컴포넌트 매핑 표에 `ListSearchTable`/`StatusBadge` 추가 |

## 커밋 내역
| SHA | 메시지 |
|-----|--------|
| (PR에서 확인) | feat: add a top-level account index page and search (Phase 5, P5-7) |

## 자체 검토 (Self-Review)
### 긍정 사항
- 실제 Confluence 인스턴스에 대해 end-to-end로 검증했다 — "계정 관리" 페이지가 없는 상태에서
  `saveAccountMeta` 호출 한 번으로 페이지가 자동 생성되고 `accountIndex`에 항목이 기록되는 것,
  이름/이메일(대소문자 무시)/팀 부분 일치 검색이 실제로 동작하는 것, `setAccessEnabled`
  off/on이 인덱스에도 즉시 반영되는 것을 모두 확인했다. 검증 후 테스트 계정
  (`donghyun.lee@s-food.com`)은 다시 이름·팀이 빈 상태(`accessEnabled: true`)로 복원해,
  이 계정으로 온보딩 흐름을 계속 테스트할 수 있게 남겨뒀다.
- `accountMeta`를 쓰는 세 함수 내부에 `accountIndex` 동기화를 강제해, 향후 새로운 호출자가
  추가되어도 동기화를 빠뜨릴 수 없는 구조로 만들었다(`saveAccountMeta`가 `accessEnabled`를
  바꿀 수 없게 막은 기존 설계와 같은 방식).
- `ListSearchTable` 템플릿을 그대로 써서 CLAUDE.md의 "템플릿 우선" 원칙을 지켰다 — 목록+검색
  화면이라는 요구사항과 정확히 일치하는 템플릿이 있어 직접 마크업을 짜지 않았다.

### 주의사항
- `ListSearchTable`은 `min-h-screen`을 하드코딩한 전체 화면 템플릿이다. `/editor/accounts`가
  `EditorShell`의 `<div className="flex-1 overflow-y-auto">` 안에 중첩되면서, 뷰포트 높이만큼의
  최소 높이를 요구하는 자식이 이미 스크롤 가능한 부모 안에 들어가는 형태가 된다 — 실제로는
  `overflow-y-auto`가 이를 흡수해 깨지지 않지만(다른 전체 화면 템플릿이 이 앱에 아직 없어
  직접 비교할 대상은 없음), 필요 이상의 스크롤 여백이 생길 수 있다는 점은 인지하고 있다.
  인증이 필요한 화면이라 미인증 미리보기 라우트로는 이 중첩 상태 자체를 재현하지 못해
  이번 검증에서는 확인하지 못했다 — 실사용 중 눈에 띄면 `className`으로 `min-h-screen`을
  덮어쓰는 후속 조치를 고려한다.
- `accountIndex` 배열은 계정 수만큼 커지는 단일 property라, 동시 upsert 경쟁(마지막 쓰기가
  이전 쓰기를 덮어쓸 가능성)이 여전히 남아 있다 — `architecture.md`/`data-spec.md`에 이미
  "규모가 커지면 재검토"로 기록된 기존 한계이고, 이번 작업 범위에서 새로 만든 문제는 아니다.

### 우려사항
- 없음.
