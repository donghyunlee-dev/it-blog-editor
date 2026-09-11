# P1-1b 후속: 사이드바 컨트롤 영역 레이아웃 재배치 — 구현 계획

## Global Constraints
- 검색/정렬/태그 필터/페이지네이션의 실제 필터링·정렬 로직(`filteredDocuments` 계산 등)은
  건드리지 않는다 — state(`query`/`sortBy`/`activeTag`)와 그 소비 로직은 그대로 두고, 그
  값을 조작하는 컨트롤(입력창/버튼)의 위치와 형태만 바꾼다.
- 옛 `<Select id="sidebar-doc-sort">`를 참조하는 테스트가 있으므로, 아이콘 버튼으로
  바뀌면서 접근 가능한 이름(aria-label)도 함께 바뀐다는 것을 테스트에서 갱신한다.

## Files
- Modify: `src/components/editor/EditorSidebar.tsx` — 검색 입력을 헤더 바로 아래로,
  "새 문서" 버튼을 폴더 섹션 바로 위로 이동. 정렬 `<Select>` 제거하고 "폴더" 행에
  아이콘 토글 버튼(`SortIcon`, 새로 추가) 삽입. 안내 문장 삭제. 이제 안 쓰는 `Select`
  import 제거.
- Modify: `src/components/editor/EditorSidebar.test.tsx` — 정렬 테스트를 드롭다운
  `selectOptions` → 아이콘 버튼 클릭으로 갱신, 레이아웃 순서(검색 → 새 문서 → 폴더)
  회귀 테스트 추가, 안내 문장이 사라졌음을 확인하는 테스트 추가.
- Modify: `docs/product/prd.md` — P1-1a/P1-1b 항목에 이번 레이아웃 재배치를 후속 기록으로
  추가(기존 "본문 검색 후속"/"Notion 스타일 재구성"과 같은 패턴 — 새 체크박스를 만들지
  않고 기존 항목에 이어 적는다).
- Create: `docs/superpowers/tasks/P1-1b-sidebar-layout-efficiency/{task,plan,result,test}.md`.

## Steps
- [x] **Step 1**: 헤더 행(h-14) 바로 아래에 검색 입력만 담은 블록을 새로 놓는다(안내
  문장·정렬 제거).
- [x] **Step 2**: 원래 위치(공유 문서 섹션 뒤)에 있던 검색+안내+정렬 블록 전체를 제거한다
  (Step 1로 검색은 이미 위로 옮겨졌다).
- [x] **Step 3**: "새 문서" 버튼 블록을 원래 자리(헤더 바로 아래)에서 제거하고, 태그 필터
  섹션과 `<nav>` 사이(=폴더 섹션 바로 위)에 다시 놓는다.
- [x] **Step 4**: "폴더" 행에 `SortIcon` 토글 버튼을 "새 폴더 만들기" 버튼 왼쪽에 추가한다
  (문서가 있을 때만 보임, 클릭마다 `sortBy` 토글).
- [x] **Step 5**: 안 쓰는 `Select` import 제거.
- [x] **Step 6**: `EditorSidebar.test.tsx`의 정렬 테스트 2개를 아이콘 버튼 기준으로 갱신하고,
  레이아웃 순서 회귀 테스트 2개(검색<새문서, 새문서<폴더)와 안내 문장 삭제 확인 테스트를
  추가한다. `npx vitest run EditorSidebar.test.tsx`로 검증.
- [x] **Step 7**: `npx eslint EditorSidebar.tsx EditorSidebar.test.tsx`, 연관 파일
  `EditorShell.test.tsx` 재실행으로 회귀 확인.
- [x] **Step 8**: PRD 갱신, `result.md`/`test.md` 작성.
