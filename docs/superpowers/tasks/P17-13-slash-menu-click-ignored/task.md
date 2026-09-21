# P17-13: 슬래시 메뉴 항목을 클릭해도 반응이 없는 문제 — task

## 배경
- 사용자 리포트: "슬래시 사용으로 툴바를 선택하면 동작하지 않고 있어" — `/`를 입력해
  슬래시 메뉴(`SlashCommandExtension.ts`)를 띄운 뒤 마우스로 항목을 클릭해도 아무
  일도 일어나지 않는다.
- 관련 문서: PRD `docs/product/prd.md`(P17-12 — 같은 근본 원인이 표 툴바 버튼에서
  이미 한 번 발견·수정된 적이 있다: `docs/superpowers/tasks/P17-12-table-toolbar-selection-reset/`).

## 원인
`createSlashMenuRenderer`(`SlashCommandExtension.ts`)가 만드는 메뉴 버튼은 `onClick`
(정확히는 `addEventListener("click", ...)`)만 등록하고, `mousedown`의 기본 동작을
막지 않았다.

1. 사용자가 버튼을 누르면(mousedown) 브라우저가 에디터(contenteditable)의 포커스를
   버튼으로 옮기며 기존 선택을 바꾼다.
2. 이 선택 변화가 `selectionchange` → ProseMirror `domObserver` → 트랜잭션 dispatch로
   이어지고, `@tiptap/suggestion`의 플러그인 `apply()`가 "현재 선택이 슬래시 메뉴의
   `range` 밖으로 벗어났다"고 판단해 즉시 `active = false`로 전이시킨다.
3. `active`가 꺼지면 `onExit`이 호출되어 `props.mount()`가 반환한 `unmount()`가
   실행되고, 메뉴 DOM(`menuEl`)이 `document.body`에서 제거된다.
4. mousedown~click(mouseup) 사이에 대상 버튼이 DOM에서 사라지므로, 브라우저가
   `click` 이벤트 자체를 디스패치하지 않는다 — 버튼의 `click` 리스너(`item.run()`
   호출)가 아예 실행되지 않는다.

P17-12(표 툴바 버튼)와 증상은 다르지만(그쪽은 "잘못된 대상에 커맨드가 적용됨",
이쪽은 "클릭 이벤트 자체가 사라짐") 근본 원인은 같다 — 리치 텍스트 에디터 밖의
버튼이 `mousedown` 기본 동작을 막지 않아 에디터 선택/포커스가 예기치 않게 바뀐다.

## 수용 기준 (Acceptance Criteria)
- [x] 슬래시 메뉴의 각 항목 버튼이 `mousedown` 이벤트의 기본 동작을 막는다
      (`event.preventDefault()`), 표 툴바 버튼(P17-12)과 동일한 패턴.
- [x] 회귀 테스트: 렌더링된 각 메뉴 버튼에 `mousedown`을 디스패치하면
      `event.defaultPrevented`가 `true`다.
- [x] 기존 슬래시 메뉴 테스트(키보드 탐색, 클릭 시 `run` 호출, ARIA 등)가 모두
      통과한다(회귀 없음).

## 결정이 필요한 사항
없음 — 이미 이 코드베이스에 확립된 표준 패턴(mousedown에서 preventDefault)을
그대로 적용하는 수정이라 새 값/방식을 정할 필요가 없다.

## 범위 밖
- 실제 브라우저(Chromium/Edge 등)에서의 수동 재현·재확인 — 이 세션은 로그인이
  MS 계정 인증에 걸려 있어(로컬 dev-login 우회가 코드에 구현돼 있지 않음) 앱을
  직접 띄워 재현하지 못했다. jsdom 테스트 환경도 P17-12 때와 마찬가지로 브라우저
  고유의 "mousedown 시 선택 되돌림" 동작 자체는 재현하지 않는다. 사용자의 실제
  브라우저 재확인이 필요하다.
