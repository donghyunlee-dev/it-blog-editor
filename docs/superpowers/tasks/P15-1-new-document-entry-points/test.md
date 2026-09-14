# P15-1: 새 문서 생성 진입점 개편 — 검증

## 자동화 테스트
- `npx vitest run src/components/editor/EditorSidebar.test.tsx` — 76개 전부 통과(3개는
  이번 변경으로 갱신, 1개 신규 추가).
- `npx vitest run src/components/editor/DocumentEditor.test.tsx` — 39개 전부 통과(1개는
  이번 변경으로 갱신, 2개 신규 추가).
- `npx eslint src/components/editor/EditorSidebar.tsx src/components/editor/EditorSidebar.test.tsx src/components/editor/DocumentEditor.tsx src/components/editor/DocumentEditor.test.tsx src/app/editor/new/page.tsx` — 0 errors.
- `npm run build` — Turbopack 프로덕션 빌드 성공, TypeScript 통과, 19개 라우트 정상 생성.
- **`npm test`(전체) — 63개 파일, 694개 테스트 전부 통과.** 문서 옵션 메뉴 state를
  일반화(`openDocumentMenu` → `openMenu`)하고 사이드바 상단 레이아웃(새 문서 버튼 위치)을
  바꾼 변경이라, 다른 화면에 부작용이 없는지 확인하기 위해 전체 스위트를 추가로 돌렸다.

## 수동/시각 검증
AX Auth 로그인 제약으로 이 세션에서는 실제 `/editor` 화면을 열어볼 수 없다(기존 항목들과
동일한 한계). 다음은 사용자 캡처로 확인이 필요하다:
- 폴더 행의 "+"를 눌러 `/editor/new?folder={id}`로 이동하고, 저장하면 실제로 그 폴더
  아래에 문서가 나타나는지.
- 폴더 "..." 메뉴가 P14-3와 같은 이유로 클리핑되지 않고 온전히 보이는지.
- 목록 맨 아래로 옮긴 "새 문서" 버튼의 실제 위치·간격이 어색하지 않은지(위쪽 여백은
  `mt-2`로 "더 보기" 버튼과 같은 간격을 줬다).

## 문제 → 조치 → 재검증
- `DocumentEditor.test.tsx`의 "새 문서 생성 요청에도 markdown 문자열이 아닌 TipTap
  doc(JSONContent)을 담아 보낸다" 테스트가 POST body에 `folderId: null`이 추가되며
  `toEqual` 단언이 실패했다 → 조치: 기대값에 `folderId: null`을 추가 → 재검증: 통과.

## 새로운 결정 사항
없음 — task.md에서 이미 정리한 대로, 사용자가 대화 중 진입점 구조(폴더별 "+"/미분류
버튼 재배치)를 직접 확정했다.
