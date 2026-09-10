# P7-10: 모바일 대응 + 접근성 — 검증

## 자동화 테스트
- `npx vitest run src/components/editor/EditorSidebar.test.tsx` — 67개 전부 통과(기존 59개 + 신규 P7-10 8개).
- `npx vitest run src/components/editor/EditorShell.test.tsx` — 18개 전부 통과(기존 16개 + 신규 P7-10 2개).
- `npm test` — 63개 파일, 646개 테스트 전부 통과.
- `npm run lint` — 0 errors, 2 warnings(`postcss.config.js`/`tailwind.config.js`의 기존 경고, 이 작업과 무관).
- `npm run build` — Turbopack 프로덕션 빌드 성공, TypeScript 통과, 19개 라우트 정상 생성.

## 문제 → 조치 → 재검증
1. **원인**: 첫 구현 뒤 `npm run lint`가 `EditorSidebar.tsx`에서 `jsx-a11y/role-has-required-aria-props` 에러를 냈다 — `role="treeitem"`을 붙인 요소는 `aria-selected`가 있어야 한다는 규칙인데, 처음엔 붙이지 않았다.
   **조치**: 폴더 `<li>`에는 `aria-selected={false}`(폴더는 선택 대상이 아니라 펼치고 접는 대상), 문서 `<li>`에는 기존에 이미 갖고 있던 "지금 열려 있는 문서"(`isActive`, `aria-current="page"`와 같은 값)를 그대로 재사용해 붙였다.
   **재검증**: `npm run lint` 재실행 → 이 파일 관련 에러 사라짐(기존 무관한 경고 2건만 남음).

## 수동 검증
- AX Auth 로그인 제약으로 이 세션에서는 실제 브라우저·스크린리더로 확인할 수 없었다(PRD의 기존 항목들과 동일한 한계). 자동화 테스트(키보드 이벤트 시뮬레이션, ARIA 속성 어서션)로만 검증했다.

## 새로운 결정 사항
없음.
