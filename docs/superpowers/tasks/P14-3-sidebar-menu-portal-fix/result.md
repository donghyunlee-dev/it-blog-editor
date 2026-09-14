# P14-3: 문서 옵션 메뉴 클리핑 수정 — 결과

## 커밋
- `edc49fa` fix: 문서 옵션 메뉴가 사이드바 스크롤 영역에 잘리는 문제 수정 (P14-3)

## 변경 파일
- `src/components/editor/EditorSidebar.tsx`
  - `@sfood/ui`의 `DropdownMenu` import를 제거했다(더 이상 쓰지 않음).
  - `openDocumentMenu` state(`{ document, anchorRect, triggerEl }`)와
    `documentMenuPopupRef`를 추가했다.
  - 바깥 클릭(mousedown)·Escape·스크롤/리사이즈 시 메뉴를 닫는 `useEffect`를 추가했다
    (`@sfood/ui` `DropdownMenu`의 내부 동작을 그대로 재현).
  - `renderDocumentRow`에서 `<DropdownMenu>`를 제거하고 트리거 `<button>`만 남겼다 — 클릭
    시 자신의 `getBoundingClientRect()`로 좌표를 잡아 `openDocumentMenu`를 토글한다.
  - 메뉴 항목 조립 로직을 `buildDocumentMenuItems(document)` 함수로 분리했다(팝업 렌더
    쪽에서만 필요).
  - `<nav>` 바로 다음(형제 위치)에 실제 팝업을 조건부로 렌더링한다 — `position: fixed`로
    `anchorRect.bottom`/`anchorRect.left` 좌표에 그린다. `role="menu"`/`role="menuitem"`은
    그대로 유지했다. 항목 hover는 `.sidebar-row-hover`를 재사용한다.
- `src/app/globals.css` — `.sidebar-row-menu-right [role="menu"]` 규칙을 제거하고, 왜
  없어졌는지(더 근본적인 원인·해법)를 주석으로 남겼다.
- `docs/product/design.md`, `docs/product/prd.md` — 갱신(경위 전체를 한 문단으로 정리).

## 자체 검토
- **긍정**: `role="menu"`/`role="menuitem"`/`aria-haspopup`/`aria-expanded` 등 접근성 계약을
  그대로 유지해, 기존 회귀 테스트(트리거를 `role="button"`으로, 항목을 `role="menuitem"`으로
  찾는 테스트들)가 코드 변경 없이 그대로 통과했다 — 인터페이스를 유지한 채 구현만 바꾼
  전형적인 리팩터링이었다.
- **주의사항**: `@sfood/ui`의 `DropdownMenu`를 더 이상 쓰지 않게 됐다 — CLAUDE.md의
  "①`@sfood/ui` 컴포넌트 최우선" 원칙에서 벗어나는 결정이라, design.md에 왜 이 컴포넌트를
  포기했는지(포탈/fixed positioning을 지원하는 prop이 없어 스크롤 컨테이너 안에서 근본적으로
  못 씀) 구체적으로 남겼다 — TagInput이 `ChipGroup` 대신 커스텀 구현을 쓴 것과 같은 성격의
  예외다.
- **우려사항**: 스크롤/리사이즈 시 메뉴를 다시 위치시키는 대신 그냥 닫는 방식을 택했다 —
  사용자가 메뉴를 열어둔 채 사이드바를 스크롤하면 메뉴가 사라지는데, 이건 의도된
  단순화(앵커가 스크롤과 함께 움직이는 걸 실시간으로 따라가게 만드는 것보다 안전하고 흔한
  패턴)이지만 실제 사용성은 확인이 필요하다.

## 산출물
- `docs/superpowers/tasks/P14-3-sidebar-menu-portal-fix/{task,plan,result,test}.md`
- `src/components/editor/EditorSidebar.tsx`
- `src/app/globals.css`
- `docs/product/design.md`
- `docs/product/prd.md`
