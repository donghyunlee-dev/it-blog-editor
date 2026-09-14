# P14-2: 사이드바 문서 옵션 메뉴에 "이력"·"삭제" 추가 — 결과

## 커밋
- (커밋 후 기록 예정)

## 변경 파일
- `src/components/editor/EditorSidebar.tsx`
  - `VersionHistory` import, `HistoryIcon`(DocumentEditor의 것과 같은 모양) 추가.
  - `historyDocumentTarget`/`deleteDocumentTarget`/`deletingDocument` state와
    `handleDeleteDocument`(활성 문서 여부에 따라 `/editor`로 push할지 분기, 아니면 목록만
    `router.refresh()`)를 `moveDocumentTarget`과 같은 자리에 추가했다.
  - `renderDocumentRow`에서 메뉴 항목을 배열로 조립하도록 바꿨다 — "이동"은
    `flatFolderOptions.length > 0`일 때만 추가하고, "이력"·"삭제"(danger, divider)는 항상
    추가한다. 이제 옵션 메뉴 자체는 폴더 유무와 무관하게 항상 렌더링된다(기존에는 폴더가
    없으면 트리거 자체가 사라졌다).
  - 트리거를 감싸는 `<div className="sidebar-row-menu-right">`를 추가했다 — 메뉴가 트리거
    기준 오른쪽(본문/페이지 방향)으로 펼쳐지도록 CSS로 위치를 덮어쓰기 위한 훅이다.
  - 이력 모달(`Modal` + `VersionHistory`)과 삭제 확인 모달(`Modal` + 취소/삭제 확인 버튼,
    DocumentEditor의 기존 모달과 같은 문구)을 `moveDocumentTarget` 모달 근처에 추가했다.
- `src/app/globals.css` — `.sidebar-row-menu-right [role="menu"] { left: 0; right: auto; }`
  추가(`DropdownMenu`가 위치를 바꾸는 props를 제공하지 않아 CSS로 덮어씀).
- `src/components/editor/DocumentEditor.tsx`
  - `TrashIcon`/`HistoryIcon` 함수, `deleteModalOpen`/`versionHistoryModalOpen` state,
    `handleDelete` 함수, 헤더의 "이력"·"삭제" 버튼과 구분선, 두 모달 렌더, `VersionHistory`
    import를 모두 제거했다.
  - `status` 타입을 `"idle" | "saving" | "deleting"`에서 `"idle" | "saving"`으로 좁혔다
    (`"deleting"`을 설정하는 코드가 더 이상 없음).
- `src/components/editor/DocumentEditor.test.tsx` — 삭제 관련 테스트 3개, 이력 버튼 테스트
  1개, `VersionHistory` mock을 제거했다.
- `src/components/editor/EditorSidebar.test.tsx` — `VersionHistory` mock 추가, 새 describe
  블록("EditorSidebar 문서 옵션 메뉴 — 이력·삭제(P14-2)")에 7개 테스트 추가(메뉴 표시 조건,
  이력 모달, 삭제 확인/취소/실패, 활성/비활성 문서 삭제 시 네비게이션 분기). P14-1이 추가했던
  "폴더 없으면 트리거 숨김" 테스트를 "폴더 없어도 트리거는 보인다"로 뒤집었다.
- `docs/product/design.md`, `docs/product/prd.md` — 갱신.

## 자체 검토
- **긍정**: 삭제 API·`VersionHistory` 컴포넌트는 그대로 재사용해 새 백엔드 로직을 만들지
  않았다. DocumentEditor에서 죽은 코드(아이콘 함수, state, 핸들러, 모달)를 남기지 않고 함께
  정리했다. 활성 문서 삭제 시에만 네비게이션하는 분기를 추가해, 사이드바의 임의 행에서
  삭제해도 지금 보고 있는 다른 문서 화면이 갑자기 사라지지 않는다.
- **주의사항**: `DropdownMenu`의 위치를 CSS로 덮어쓰는 방식은 컴포넌트 내부 DOM 구조(`
  [role="menu"]`)에 의존한다 — `@sfood/ui`가 이 마크업을 바꾸면 이 오버라이드도 함께
  깨질 수 있다. design.md에 이유를 남겨 다음에 이 컴포넌트가 바뀌면 확인하도록 했다.
- **우려사항**: 변경 범위가 두 파일(에디터 헤더 제거 + 사이드바 추가)에 걸쳐 있고 삭제/
  네비게이션 흐름을 건드려 회귀 위험이 있다고 판단, 개별 파일 테스트 외에 전체 `npm test`도
  추가로 돌렸다(test.md 참고).

## 산출물
- `docs/superpowers/tasks/P14-2-sidebar-history-delete-menu/{task,plan,result,test}.md`
- `src/components/editor/EditorSidebar.tsx`
- `src/components/editor/EditorSidebar.test.tsx`
- `src/components/editor/DocumentEditor.tsx`
- `src/components/editor/DocumentEditor.test.tsx`
- `src/app/globals.css`
- `docs/product/design.md`
- `docs/product/prd.md`
