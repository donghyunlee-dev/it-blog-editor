# P17-18: 본문 폭 확대 + Wide mode + 워크스페이스 중앙 정렬 — 구현 계획

## Global Constraints
- 값은 모두 Issue #161에서 확인된 대로 쓴다(920px/1200px/문서 전체 토글/워크스페이스
  중앙 정렬 함께 처리) — 추측하지 않는다.
- Wide mode는 사이드바 폭·접힘(EditorShell.tsx)과 같은 패턴(localStorage, 마운트
  후 2-pass 동기화, try/catch)으로 구현한다 — 새 저장 메커니즘을 만들지 않는다.
- 워크스페이스 중앙 정렬이 기존 `fixed`/좌표 계산 코드 두 곳(사이드바 드래그, 접힘
  펼치기 버튼)의 "화면 왼쪽 끝 = 사이드바 왼쪽 끝" 가정을 깨므로, 그 두 곳을 반드시
  함께 고친다(방치하면 넓은 화면에서 드래그가 어긋나거나 버튼이 엉뚱한 자리에 뜬다).

## Files
- Modify: `src/components/editor/DocumentEditor.tsx`
- Modify: `src/components/editor/DocumentEditor.test.tsx`
- Modify: `src/components/editor/EditorShell.tsx`
- Modify: `src/components/editor/EditorShell.test.tsx`
- Modify: `src/components/editor/VersionHistoryPage.tsx`
- Modify: `src/components/editor/DeletedDocumentsPage.tsx`
- Modify: `docs/product/prd.md`

## Steps
- [x] **Step 1**: `DocumentEditor.tsx`에 `NORMAL_CONTENT_WIDTH`("max-w-[920px]")/
      `WIDE_CONTENT_WIDTH`("max-w-[1200px]") 상수와 `wideMode` state·
      `WIDE_MODE_STORAGE_KEY` localStorage 동기화(마운트 시 읽기, 토글 시 쓰기)를
      추가한다. 본문 폭 클래스를 `wideMode`에 따라 두 값 중 하나로 바꾼다.
- [x] **Step 2**: 헤더에 "넓게 보기"/"좁게 보기" 토글 버튼(`WideModeIcon`,
      `aria-pressed`)을 추가한다 — mode/pageId와 무관하게 항상 보인다.
- [x] **Step 3**: `EditorShell.tsx`의 루트를 `h-screen w-full bg-background`(바깥,
      여백을 실제로 채움) + `workspaceRef`를 단 `relative mx-auto flex h-full w-full
      max-w-[1800px] ...`(안쪽, 기존 3컬럼 레이아웃 그대로)로 감싼다.
- [x] **Step 4**: 사이드바 폭 조절 `handleMouseMove`가 `event.clientX`를 그대로 쓰던
      것을 `event.clientX - workspaceRef.current.getBoundingClientRect().left`로
      바꾼다.
- [x] **Step 5**: 접힌 사이드바를 다시 펴는 버튼의 `fixed left-3 top-3`를
      `absolute left-3 top-3`로 바꾼다(`workspaceRef`가 `relative`라 그 기준으로
      포지셔닝된다 — 이 컨테이너 자체는 스크롤되지 않아 시각적으로 `fixed`와 동일).
- [x] **Step 6**: `VersionHistoryPage.tsx`/`DeletedDocumentsPage.tsx`의
      `max-w-[830px]`를 `max-w-[920px]`로 맞춘다(편집 화면과의 폭 일관성).
- [x] **Step 7**: 테스트 갱신/추가 —
      - `DocumentEditor.test.tsx`: 기존 830px 단언을 920px로 갱신, Wide mode
        describe 블록(기본 920px, 토글 시 1200px, 되돌리기, localStorage 유지) 추가.
      - `EditorShell.test.tsx`: 워크스페이스 오프셋을 반영한 드래그 계산을 검증하는
        회귀 테스트 추가(`getBoundingClientRect`를 왼쪽 오프셋 200px로 모킹).
- [x] **Step 8**: GitHub Issue #161에 결정 사항 코멘트 남기고 닫는다.
- [x] **Step 9**: 임시 디버그 페이지(`/dev-preview-workspace-width`, 검증 후 삭제)로
      Browser pane에서 2200px 뷰포트 기준 워크스페이스 1800px 중앙 정렬, Wide mode
      토글, 오프셋을 반영한 사이드바 드래그를 모두 실측 확인.
- [x] **Step 10**: `npx vitest run src/components/editor/{DocumentEditor,EditorShell,
      VersionHistoryPage,DeletedDocumentsPage,TableOfContents,EditorSidebar}.test.tsx`,
      관련 `npx eslint`, `npm run build`.
