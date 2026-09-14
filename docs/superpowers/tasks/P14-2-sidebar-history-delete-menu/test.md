# P14-2: 사이드바 문서 옵션 메뉴에 "이력"·"삭제" 추가 — 검증

## 자동화 테스트
- `npx vitest run src/components/editor/EditorSidebar.test.tsx` — 75개 전부 통과.
  - 신규 7개(P14-2 describe 블록): 폴더 없어도 메뉴 표시, 이력 모달, 삭제 확인 → API 호출,
    삭제 취소, 활성 문서 삭제 → `/editor` 이동, 비활성 문서 삭제 → 이동 없이 새로고침만,
    삭제 실패 → 오류 Toast.
  - 갱신 1개: "폴더가 하나도 없는 계정에서도 옵션 트리거는 보인다"(기존 "숨긴다" 테스트를
    뒤집음 — 이력·삭제가 항상 유효해졌기 때문).
- `npx vitest run src/components/editor/DocumentEditor.test.tsx` — 37개 전부 통과(삭제 3개·
  이력 1개 테스트 제거 반영).
- `npx eslint src/components/editor/EditorSidebar.tsx src/components/editor/EditorSidebar.test.tsx src/components/editor/DocumentEditor.tsx src/components/editor/DocumentEditor.test.tsx` — 0 errors.
- `npm run build` — Turbopack 프로덕션 빌드 성공, TypeScript 통과, 19개 라우트 정상 생성.
- **`npm test`(전체) — 63개 파일, 691개 테스트 전부 통과.** 이번 변경이 에디터 헤더 제거 +
  사이드바 추가 두 파일에 걸쳐 있고 삭제/네비게이션 흐름(공용 동작)을 건드려 회귀 위험이
  있다고 판단해 전체 스위트를 추가로 돌렸다.

## 수동/시각 검증
AX Auth 로그인 제약으로 이 세션에서는 실제 `/editor` 화면을 열어볼 수 없다(기존 항목들과
동일한 한계). 메뉴 위치 CSS 오버라이드(`[role="menu"]` 좌측 정렬)가 실제로 페이지 방향으로
펼쳐지는지는 사용자 캡처로 확인이 필요하다.

## 문제 → 조치 → 재검증
- P14-1이 추가했던 "폴더가 하나도 없으면 옵션 트리거를 숨긴다" 테스트가 이번 변경 후 실패함
  → 원인: 이력·삭제가 항상 유효해지면서 트리거가 더 이상 숨겨지지 않는 게 의도된 새 동작 →
  조치: 테스트를 "폴더 없어도 트리거는 보인다"로 뒤집음 → 재검증: 전체 재통과.

## 새로운 결정 사항
없음 — `task.md` "결정이 필요한 사항" 참고(범위·메뉴 방향을 사용자가 대화 중 직접 정정·확정).
