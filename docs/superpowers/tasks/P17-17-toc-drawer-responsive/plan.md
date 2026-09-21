# P17-17: 좁은 화면에서 목차를 드로어로 열기 — 구현 계획

## Global Constraints
- 새 드로어 로직을 직접 구현하지 않는다 — `@sfood/ui`의 `Drawer`(열림 상태·Escape·
  바깥 클릭 닫힘을 이미 구현)를 그대로 쓴다.
- 레일(xl)과 드로어(md~xl)가 완전히 같은 목록 마크업을 공유하게 만든다 — 두 곳에
  같은 로직(활성 헤딩 강조, 클릭 시 스크롤)을 복붙하지 않는다.
- `EditorShell.tsx`의 `xl` 레일 슬롯(`TocRailContext`, `hidden w-60 shrink-0
  xl:block`)은 손대지 않는다 — 이번 작업은 그 옆에 완전히 별개의(md~xl 전용)
  UI를 추가하는 것이다.

## Files
- Modify: `src/components/editor/TableOfContents.tsx`
- Modify: `src/components/editor/TableOfContents.test.tsx`
- Modify: `docs/product/prd.md`

## Steps
- [x] **Step 1**: 헤딩 목록 `<ul>` 렌더링을 `renderHeadingList()` 함수로 추출한다 —
      기존 레일 콘텐츠(`setTocRail` 안)는 이 함수를 호출하도록 바꾼다(동작 변화 없음).
- [x] **Step 2**: `drawerOpen` state를 추가하고, `headings.length > 0`일 때
      컴포넌트가 `null` 대신 다음을 반환하게 한다: (a) `md:flex xl:hidden`으로
      `md`~`xl` 구간에서만 보이는 고정 위치 토글 버튼, (b) `@sfood/ui`의 `Drawer`
      (`side="right"`, `title="이 페이지"`, children은 `renderHeadingList()`).
- [x] **Step 3**: 드로어 안의 헤딩 클릭 핸들러에 `setDrawerOpen(false)` 호출을
      추가한다(레일의 핸들러와 나머지는 동일).
- [x] **Step 4**: 기존 테스트 중 `document.querySelectorAll("h2, h3")`처럼 전역
      DOM을 스캔하는 테스트가 있으면, `Drawer`가 접근성용 실제 `<h2>` 타이틀을
      그리는 것과 충돌하지 않도록 실제 본문 컨테이너로 스코프를 좁힌다.
- [x] **Step 5**: 새 테스트 4개 추가(`md~xl 구간 목차 드로어(P17-17)` describe) —
      토글 버튼 노출/미노출, 클릭 시 드로어 오픈과 항목 노출, 항목 클릭 시
      스크롤+드로어 닫힘.
- [x] **Step 6**: 임시 디버그 페이지(`/dev-preview-toc-drawer`, 검증 후 삭제)로
      Browser pane에서 세 breakpoint(375px 모바일/1024px 노트북/1440px 데스크톱)의
      실제 `getComputedStyle` 표시 여부와 드로어 오픈/클릭 닫힘을 실측 확인.
- [x] **Step 7**: `npx vitest run src/components/editor/TableOfContents.test.tsx
      src/components/editor/EditorShell.test.tsx
      src/components/editor/DocumentEditor.test.tsx`, `npx eslint
      src/components/editor/TableOfContents.tsx
      src/components/editor/TableOfContents.test.tsx`, `npm run build`.
