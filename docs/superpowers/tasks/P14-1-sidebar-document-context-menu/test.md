# P14-1: 사이드바 문서 행 컨텍스트 메뉴 전환 — 검증

## 자동화 테스트
- `npx vitest run src/components/editor/EditorSidebar.test.tsx` — 68개 전부 통과.
  - 갱신한 트리거 유무 테스트 2개("문서 옵션" 트리거가 폴더 있음/없음에 따라 보이는지)
  - 갱신한 상호작용 테스트 5개(옵션 메뉴 열기 → "다른 폴더로 이동" 클릭 → 모달/API 호출/
    Toast 흐름) 모두 기존과 동일한 최종 동작을 확인.
- `npx eslint src/components/editor/EditorSidebar.tsx src/components/editor/EditorSidebar.test.tsx` — 0 errors.
- `npm run build` — Turbopack 프로덕션 빌드 성공, TypeScript 통과, 19개 라우트 정상 생성.

## 수동/시각 검증
AX Auth 로그인 제약으로 이 세션에서는 실제 `/editor` 화면을 열어볼 수 없다(기존 항목들과
동일한 한계). `DropdownMenu`는 `@sfood/ui`가 이미 배포·테스트한 컴포넌트를 그대로 쓰는 것이라
새로운 상호작용 로직을 직접 구현한 것보다 회귀 위험이 낮다고 판단했다. 다만 result.md
"우려사항"에 적었듯 메뉴 항목의 호버가 라이트 모드에서 잘 보이는지는 실제 화면 확인이
필요하다.

## 문제 → 조치 → 재검증
없음 — 트리거·메뉴 교체 + 테스트 갱신만으로 첫 시도에 테스트·린트·빌드가 모두 통과했다.

## 새로운 결정 사항
없음 — `task.md` "결정이 필요한 사항" 참고(범위·사용 컴포넌트를 사용자가 대화 중 직접
확정).
