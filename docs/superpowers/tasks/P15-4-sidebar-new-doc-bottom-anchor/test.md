# P15-4: "새 문서" 버튼 하단 고정(짧은 목록 포함) — 검증

## 자동화 테스트
- `npx vitest run src/components/editor/EditorSidebar.test.tsx` — 78개 전부 통과(1개
  갱신 — sticky 클래스 확인 → 스크롤 영역 바깥 구조 확인).
- `npx eslint src/components/editor/EditorSidebar.tsx src/components/editor/EditorSidebar.test.tsx` — 0 errors.
- `npm run build` — Turbopack 프로덕션 빌드 성공, TypeScript 통과, 20개 라우트 정상 생성.
- 사용자 요청대로 범위를 위치 이동 + 새 문서 기능으로 좁혀 전체 `npm test`는 실행하지
  않았다(CLAUDE.md 갱신된 테스트 루틴 반영).

## 수동/시각 검증
AX Auth 로그인 제약으로 이 세션에서는 확인 불가. 문서가 몇 개 없는 계정(짧은 목록)과
많은 계정(긴 목록, 스크롤 발생) 두 경우 모두에서 "새 문서" 버튼이 패널 맨 아래에 계속
보이는지 확인이 필요하다 — 이번 수정은 P15-3(sticky)이 놓쳤던 "짧은 목록" 케이스를
정확히 겨냥한 것이라 이 검증이 특히 중요하다.

## 문제 → 조치 → 재검증
없음 — 원인(sticky는 스크롤이 있어야만 작동) 진단부터 구조 변경까지 한 번에 반영됐고,
lint/테스트/빌드 모두 첫 시도에 통과했다.

## 새로운 결정 사항
없음.
