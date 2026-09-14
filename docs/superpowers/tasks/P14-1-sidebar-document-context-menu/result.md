# P14-1: 사이드바 문서 행 컨텍스트 메뉴 전환 — 결과

## 커밋
- (커밋 후 기록 예정)

## 변경 파일
- `src/components/editor/EditorSidebar.tsx`
  - `@sfood/ui` import에 `DropdownMenu`를 추가했다.
  - `MoveToFolderIcon` 뒤에 `MoreIcon`(세로 점 3개, 기존 아이콘과 같은 스타일) 함수를 추가했다.
  - `renderDocumentRow`의 "이동 가능한 폴더가 있음" 분기에서 `<button aria-label="다른 폴더로
    이동">` 단일 버튼을 `<DropdownMenu trigger={<button aria-label="문서 옵션">⋯</button>}
    items={[{ label: "다른 폴더로 이동", icon, onClick }]} />`로 교체했다. 트리거 버튼의 호버/
    포커스 노출 클래스와 정렬(`mt-1.5`)은 기존 값을 그대로 옮겼다. 이동 가능한 폴더가 없을 때
    트리거 자체를 숨기는 기존 분기(`flatFolderOptions.length === 0`)는 그대로 유지했다.
- `src/components/editor/EditorSidebar.test.tsx` — "다른 폴더로 이동" 버튼을 직접 클릭하던
  테스트들을 "'문서 옵션'(⋯) 트리거 클릭 → 메뉴 항목 '다른 폴더로 이동' 클릭"의 2단계
  흐름으로 갱신했다(`openMoveMenuItem` 헬퍼로 통일). 트리거 유무를 확인하는 테스트 2개도
  이름을 "문서 옵션"으로 갱신했다.
- `docs/product/design.md` — 컴포넌트 매핑 표와 "확인된 사항"에 `DropdownMenu` 도입을
  기록했다.
- `docs/product/prd.md` — Phase 14 계획·체크리스트 추가, P7-6 항목에 후속 갱신 메모 추가.

## 자체 검토
- **긍정**: `@sfood/ui`가 이미 제공하는 `DropdownMenu`를 그대로 재사용해 새 UI 컴포넌트를
  직접 만들지 않았다 — 같은 패키지의 `FileExplorer.itemActions`가 이미 같은 패턴을 쓰고
  있다는 것도 확인해, 이 프로젝트만의 임의 선택이 아니라 디자인 시스템이 이미 의도한 쓰임새와
  일치한다. 클릭 동작(모달 열기)은 전혀 바꾸지 않고 트리거·메뉴 껍데기만 바꿔 회귀 위험이
  낮다.
- **주의사항**: `DropdownMenu`의 트리거는 컴포넌트가 `onClick`을 내부적으로 주입하므로, 트리거
  버튼에 별도 `onClick`을 달지 않도록 주의했다(컴파일된 `node_modules/@sfood/ui/dist/index.js`의
  `DropdownMenu` 구현을 직접 읽고 확인).
- **우려사항**: `DropdownMenu`의 메뉴 항목 자체도 내부적으로 `hover:bg-surface-raised`를 쓰는데,
  이는 `@sfood/ui` 패키지 내부 구현이라 이 프로젝트에서 고칠 수 없다 — 라이트 모드에서 메뉴
  항목 호버가 잘 안 보일 가능성이 있다(P13-2에서 발견한 것과 같은 원인). 사용자 확인이
  필요하고, 필요하면 별도로 `@sfood/ui` 쪽에 문의해야 한다.

## 산출물
- `docs/superpowers/tasks/P14-1-sidebar-document-context-menu/{task,plan,result,test}.md`
- `src/components/editor/EditorSidebar.tsx`
- `src/components/editor/EditorSidebar.test.tsx`
- `docs/product/design.md`
- `docs/product/prd.md`
