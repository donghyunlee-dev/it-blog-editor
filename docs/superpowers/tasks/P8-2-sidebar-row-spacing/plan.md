# P8-2: 사이드바 목록 행 간격/비율 재조정 — 구현 계획

## Global Constraints
- 새 디자인 토큰을 만들지 않는다 — `@sfood/ui`가 이미 제공하는 `rounded-card`(`--radius-card` = 12px)를 재사용한다(이 코드베이스가 카드 아닌 요소에도 12px가 필요하면 `rounded-card`를 쓰는 기존 관례를 그대로 따름).
- 활성 항목 표시(`sidebar-row-active`, 브랜드색 10% 배경 믹스)는 손대지 않는다 — design.md가 이미 "유지" 결정을 내렸다.
- 같은 트리 안에서 문서 행과 폴더 행의 세로 높이가 어긋나지 않도록, 패딩을 맞추는 두 종류의 행(문서/폴더) 모두 함께 조정한다.

## Files
- Modify: `src/components/editor/EditorSidebar.tsx` (문서 행·공유 문서 행·폴더 행의 패딩/radius 클래스, "이동" 버튼의 정렬 오프셋)

## Steps
- [x] **Step 1**: `renderDocumentRow`의 `<Link>` className을 `rounded-btn py-1.5 pr-3` → `rounded-card py-2 pr-2`로 바꾼다. 왼쪽 패딩은 `<li>`의 `paddingLeft: 8 + depth * 14`가 depth 0에서 이미 8px라 그대로 둔다.
- [x] **Step 2**: 같은 행의 "이동" 버튼 `mt-1.5` → `mt-2`(Link의 새 상단 패딩과 정렬 맞춤).
- [x] **Step 3**: "공유받은 문서" 행의 className을 `rounded-btn py-1.5 pl-2 pr-3` → `rounded-card py-2 pl-2 pr-2`로 바꾼다(`pl-2`는 이미 8px라 그대로).
- [x] **Step 4**: `renderFolderNode`의 wrapper `<div>` className을 `rounded-btn` → `rounded-card`로, 토글 `<button>`의 `py-1.5` → `py-2`로 바꾼다.
- [x] **Step 5**: 기존 `EditorSidebar.test.tsx`(태그 필터/정렬/페이지네이션 포함)를 재실행해 회귀가 없는지 확인한다 — 클래스 문자열을 직접 검사하는 테스트가 이 파일에 없으므로(이 코드베이스의 일반적인 테스트 관례) 새 스타일 전용 테스트는 추가하지 않는다.
- [x] **Step 6**: 실제 앱 화면 캡처가 불가능한 조건(AX Auth)이라, 이 프로젝트의 실제 디자인 토큰 값을 그대로 쓴 정적 HTML로 변경 전/후를 재현해 Artifact로 공유한다(수용 기준의 "스크린샷 비교"에 대한 대체 자료).
- [x] **Step 7**: `npm test`, `npm run lint`, `npm run build`로 최종 확인한다.

각 Step은 `npm test -- EditorSidebar.test.tsx`로 검증 가능한 단위로 쪼갠다.
