# P8-1: 헤더 레이아웃 정비 — 검색 트리거 버튼 추가 — 결과

## 커밋
- `7dcdf36` feat: 헤더에 검색 트리거 버튼 추가 (P8-1)

## 변경 파일
- `src/components/editor/GlobalSearchModal.tsx` — `openSignal?: number` prop 추가. 값이
  `undefined`가 아니게 바뀔 때만 `setOpen(true)`를 호출하는 effect를 달았다(마운트 시
  `undefined`라 즉시 열리지 않음). 컴포넌트는 여전히 자기 `open` 상태를 스스로 관리하고
  (Ctrl+K·Escape는 그대로 내부 처리) 이 prop은 "열어달라"는 요청만 추가로 받는 최소 확장이다
  — `open`/`onOpenChange` 같은 완전 제어형 API로 바꾸지 않아 기존 호출부·테스트에 영향이
  없다.
- `src/components/editor/EditorSidebar.tsx` — `SearchTriggerIcon`(export, 20×20 스타일의
  돋보기 아이콘)과 `onOpenSearch?: () => void` prop을 추가했다. 헤더 행(로고 Link와 접기
  버튼 사이)에 `onOpenSearch`가 주어졌을 때만 검색 버튼("검색" 텍스트 + 아이콘,
  `bg-surface-subtle`/`rounded-btn`)을 렌더링한다. 레퍼런스(140×30px 고정)와 달리 이
  프로젝트는 사이드바 폭이 220~440px로 가변이라 고정 픽셀 대신 내용물 기준으로 자연스럽게
  줄어들게 했다.
- `src/components/editor/EditorShell.tsx` — `searchOpenSignal`(단조 증가 카운터) state와
  `triggerSearch()`를 추가해 `GlobalSearchModal`(`openSignal`)과 `EditorSidebar`
  (`onOpenSearch`) 양쪽에 같은 트리거를 연결했다. 모바일 오프캔버스 드로어가 닫혀 있을 때
  보이는 상단 바에도 같은 아이콘 버튼을 추가해, 드로어를 열지 않고도 검색에 접근할 수 있다.
- 테스트: `GlobalSearchModal.test.tsx`(신규 2개 — `openSignal` 변경 시 열림/`undefined`면
  자동으로 안 열림), `EditorSidebar.test.tsx`(신규 2개 — `onOpenSearch` 없으면 버튼 없음/
  있으면 클릭 시 호출), `EditorShell.test.tsx`(신규 2개 — 모바일 상단 바/데스크톱 사이드바
  버튼 클릭 시 모달이 실제로 열림).
- `next-env.d.ts` — `next dev`가 재생성한 변경분(AGENTS.md 안내대로 함께 커밋).

## 자체 검토
- **긍정**: `GlobalSearchModal`의 기존 계약(자체 open 상태 관리, Ctrl+K·Escape는 내부 처리)을
  그대로 두고 `openSignal`이라는 선택적 prop 하나만 얹었다 — 기존 호출부(`<GlobalSearchModal />`,
  인자 없음)와 기존 테스트 10개가 코드 변경 없이 그대로 통과했다. 새 검색 로직·API 변경 없음.
- **주의사항**: 사이드바 최소 폭(220px)에서는 로고 텍스트가 더 일찍 잘릴 수 있다 —
  기존 `truncate` 처리가 그대로 흡수하므로 레이아웃이 깨지지는 않지만, 고정 140×30px
  레퍼런스와 픽셀 단위로 일치하지는 않는다(task.md "범위 밖" 참고 — 가변 폭 사이드바라는
  이 프로젝트의 기존 강점을 유지하는 쪽을 택했다).
- **우려사항**: AX Auth 로그인 제약으로 이 세션에서는 실제 브라우저로 두 버튼의 클릭 결과를
  스크린샷으로 확인하지 못했다(P7-7 등 기존 항목과 동일한 한계, `test.md` 참고) — 자동화
  테스트(컴포넌트 렌더링 + 클릭 이벤트 + 결과 DOM 확인)로만 검증했다.

## 산출물
- `docs/superpowers/tasks/P8-1-header-search-trigger/{task,plan,result,test}.md`
