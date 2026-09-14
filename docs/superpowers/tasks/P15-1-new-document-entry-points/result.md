# P15-1: 새 문서 생성 진입점 개편 — 결과

## 커밋
- (커밋 전 — 아래 커밋 생성 후 SHA 기록)

## 변경 파일
- `src/components/editor/EditorSidebar.tsx`
  - 문서 옵션 메뉴 state(`openDocumentMenu`)를 `openMenu: { target: MenuTarget; anchorRect;
    triggerEl } | null`로 일반화했다. `MenuTarget = { kind: "document"; document } |
    { kind: "folder"; folder }`. 바깥 클릭·Escape·스크롤/리사이즈로 닫는 `useEffect`,
    `<nav>` 바깥 `position: fixed` 팝업 렌더는 문서/폴더 두 메뉴가 공유한다.
  - `buildDocumentMenuItems`는 그대로 두고, 새 `buildFolderMenuItems(folder)`(하위 폴더
    추가·이름 변경·삭제)를 추가했다. 둘을 감싸는 `buildMenuItems(target)`이 kind로 분기해
    팝업 렌더 쪽에서 호출한다.
  - 폴더 행의 액션 버튼 3개(하위 폴더 추가·이름 변경·삭제)를 2개로 줄였다 — "+"(`Link`,
    `/editor/new?folder={id}`, aria-label `"{폴더명}"에 새 문서`로 사이드바 맨 아래 "새
    문서" 버튼과 접근성 이름이 겹치지 않게 함)와 "..."(폴더 옵션 메뉴 트리거).
  - 사이드바 상단의 독립 "새 문서" `<Link>` 블록을 제거하고, `<nav>` 콘텐츠 맨 끝("더 보기"
    버튼 다음)으로 옮겼다 — 항상 렌더링되며(문서/폴더 유무와 무관), 폴더 파라미터 없이
    `/editor/new`로 이동해 미분류 문서를 만든다.
- `src/app/editor/new/page.tsx` — `searchParams: Promise<{ folder?: string }>`를 받아
  `folder` 쿼리가 있으면 `findPersonalFolder` + `listFolders` + `buildFolderPath`로
  `folderPath`를 조회하고, `DocumentEditor`에 `initialFolderId`·`folderPath`로 전달한다
  (`/editor/[pageId]/page.tsx`의 P7-7 로직과 같은 패턴). 유효하지 않은 `folderId`(오래된
  링크 등)는 `folderPath`가 빈 배열이 되어 `initialFolderId`도 `null`로 떨어진다(존재하지
  않는 폴더에 배정을 시도하지 않는다).
- `src/components/editor/DocumentEditor.tsx` — `initialFolderId?: string | null` prop을
  추가하고, `mode === "create"`의 `POST /api/editor/documents` body에
  `folderId: initialFolderId ?? null`을 포함시켰다. `folderPath` prop의 JSDoc을 "mode=
  edit 전용"에서 "create에도 쓰일 수 있음"으로 갱신했다(실제 렌더 조건은 처음부터
  `folderPath.length > 0`뿐이라 코드 변경은 필요 없었다).
- `src/components/editor/EditorSidebar.test.tsx`
  - P7-5 describe 블록의 "하위 폴더 추가"/"이름 변경"/"삭제" 직접 버튼 클릭 테스트를
    `openFolderMenuItem(user, itemName)` 헬퍼(트리거 "폴더 옵션" → menuitem 2단계 클릭)로
    갱신했다(P14-2가 문서 쪽에서 했던 것과 동일한 패턴).
  - 폴더 행 "+"가 `/editor/new?folder=f1`로 가는 링크인지 확인하는 테스트를 추가했다.
  - "'새 문서' 링크가 '폴더' 섹션 바로 위에 있다" 테스트를 "아래에 있다"로 뒤집었다.
- `src/components/editor/DocumentEditor.test.tsx`
  - 기존 "새 문서 생성 요청 payload" 단언에 `folderId: null`을 추가했다(POST body가
    바뀌었으므로).
  - `initialFolderId`가 있으면 POST body에 `folderId`로 실린다는 테스트, mode="create"에서도
    `folderPath`를 넘기면 브레드크럼이 보인다는 테스트를 추가했다.
- `docs/product/design.md`, `docs/product/prd.md` — P15-1 경위·결정 사항을 갱신했다(사이드바
  절 서술, Phase 15 체크리스트 신규 추가).

## 자체 검토
- **긍정**: 백엔드 변경이 전혀 없다 — `folderId`를 받는 생성 API는 P7-3에서 이미 있었고,
  이번 작업은 순수하게 프론트 배선(쿼리 파라미터 → prop → POST body)과 사이드바 UI
  재구성이다. 문서/폴더 옵션 메뉴를 처음부터 공통 `openMenu` 상태로 설계해, 폴더 메뉴가
  P14-3에서 겪은 것과 같은 클리핑 문제를 처음부터 피해간다(중복 구현 없이).
- **주의사항**: 폴더 행의 "+" 의미가 "하위 폴더 추가"에서 "새 문서"로 바뀌는 것은 사용자
  입장에서 학습된 동작이 바뀌는 것이다 — 사용자가 대화 중 명시적으로 요청한 변경이라
  진행했지만, 실제 사용 중 혼선이 있으면 아이콘을 구분되게(예: 다른 모양) 바꾸는 후속
  조정이 필요할 수 있다.
- **우려사항**: `/editor/new?folder={id}`에서 폴더가 삭제된 채로(오래된 북마크 등) 열리면
  조용히 미분류로 떨어진다(`folderPath` 빈 배열 → `initialFolderId: null`) — 에러 메시지
  없이 그냥 다른 위치에 저장되는 것이라, 사용자가 "폴더에 넣었는데 왜 미분류에 있지?"라고
  혼란스러워할 수 있다. 브레드크럼이 안 보이는 것 자체가 신호이긴 하지만, 명시적인 안내는
  아니다 — 실사용 확인 필요.

## 산출물
- `docs/superpowers/tasks/P15-1-new-document-entry-points/{task,plan,result,test}.md`
- `src/components/editor/EditorSidebar.tsx`, `EditorSidebar.test.tsx`
- `src/components/editor/DocumentEditor.tsx`, `DocumentEditor.test.tsx`
- `src/app/editor/new/page.tsx`
- `docs/product/design.md`, `docs/product/prd.md`
