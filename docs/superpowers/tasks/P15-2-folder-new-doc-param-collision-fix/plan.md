# P15-2: 폴더 "+" 클릭 시 메인 화면으로 튕기는 버그 수정 — 구현 계획

## Global Constraints
- P7-7의 기존 동작(브레드크럼에서 도착 시 펼침·스크롤·강조·쿼리 정리)은 그대로 유지한다 —
  범위를 `/editor` 경로로 좁히기만 한다.

## Files
- Modify: `src/components/editor/EditorSidebar.tsx`
- Modify: `src/components/editor/EditorSidebar.test.tsx`
- Modify: `docs/product/prd.md`

## Steps
- [x] **Step 1**: `focusFolderId` 계산을 `pathname === "/editor"`일 때만 `searchParams`를
      읽도록 바꾼다 — 다른 경로면 항상 `null`(effect가 아예 반응하지 않음).
- [x] **Step 2**: 테스트 파일의 `next/navigation` 모킹에 `usePathname`을 추가한다(기존
      P7-7 테스트들의 기본 동작을 유지하기 위해 기본값 `"/editor"`), `beforeEach`에서
      리셋한다.
- [x] **Step 3**: `pathname`이 `/editor/new`(폴더 "+"로 도착한 화면)이고 `folder` 쿼리가
      있어도 `router.replace`가 호출되지 않는다는 회귀 테스트를 추가한다.
- [x] **Step 4**: `npx vitest run EditorSidebar.test.tsx`, `npx eslint
      src/components/editor/EditorSidebar.tsx src/components/editor/EditorSidebar.test.tsx`,
      `npm run build`. 사이드바 공통 컴포넌트의 라우팅 로직을 건드리는 수정이라 `npm test`
      전체도 돌린다.
