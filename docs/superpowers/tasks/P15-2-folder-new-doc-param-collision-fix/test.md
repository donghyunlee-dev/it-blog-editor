# P15-2: 폴더 "+" 클릭 시 메인 화면으로 튕기는 버그 수정 — 검증

## 자동화 테스트
- `npx vitest run src/components/editor/EditorSidebar.test.tsx` — 77개 전부 통과(기존
  P7-7 테스트 3개 변경 없이 그대로 통과, 신규 회귀 테스트 1개 추가).
- `npx eslint src/components/editor/EditorSidebar.tsx src/components/editor/EditorSidebar.test.tsx` — 0 errors.
- `npm run build` — Turbopack 프로덕션 빌드 성공, TypeScript 통과, 20개 라우트 정상 생성.
- **`npm test`(전체) — 63개 파일, 700개 테스트 전부 통과.** 사이드바 공통 컴포넌트의
  라우팅 관련 effect를 건드리는 수정이라(모든 `/editor/*` 화면에 영향), 다른 화면에
  부작용이 없는지 확인하기 위해 전체 스위트를 추가로 돌렸다.

## 수동/시각 검증
AX Auth 로그인 제약으로 이 세션에서는 실제 `/editor` 화면을 열어볼 수 없다. 사용자가
실제로 폴더 "+"를 눌러 `/editor/new?folder={id}`에 정상적으로 머무는지, 그리고 기존
P7-7 기능(에디터 헤더 브레드크럼에서 폴더 클릭 → 사이드바가 그 폴더로 스크롤·강조)이
여전히 잘 동작하는지 확인이 필요하다.

## 문제 → 조치 → 재검증
없음 — 원인 진단부터 수정까지 코드 분석과 재현 테스트만으로 한 번에 해결됐다.

## 새로운 결정 사항
없음.
