# P1-7b: 표 컬럼 리사이즈를 활성화한다 — 구현 결과 보고서

## 구현 내용
`src/components/editor/RichTextEditor.tsx`의 `TableWithToolbar.configure({ resizable: false })`를 `{ resizable: true }`로 바꿔 TipTap `@tiptap/extension-table`(prosemirror-tables 기반)의 컬럼 리사이즈를 켰다.

**P1-7a와의 충돌, 그리고 리팩터링**: `resizable: true`가 되면 `@tiptap/extension-table`의 `addNodeView()`는 스스로 `null`을 반환하고, 대신 prosemirror-tables의 `columnResizing` 플러그인이 **자기 자신의 `nodeViews` 등록**으로 표의 View 클래스를 생성한다는 것을 소스(`node_modules/prosemirror-tables/dist/index.cjs`)로 확인했다. 이 등록부는 View 생성자에 `(node, cellMinWidth, view)` 세 인자만 넘긴다 — P1-7a의 `StickyTableView`가 그동안 의존하던 네 번째 인자 `getPos`를 받을 방법이 없어, `resizable: true`로 바꾸는 순간 표별 sticky 툴바가 그대로 깨지는 구조적 충돌이 있었다.

이를 해결하기 위해:
- `StickyTableView` 클래스를 `createStickyTableView(editor: Editor)` **팩토리 함수**로 바꿨다 — `editor`를 생성자 인자가 아니라 팩토리의 클로저로 캡처해, TipTap 자체 `addNodeView()`(4개 인자 가능)와 `columnResizing`의 `nodeViews`(3개 인자만 가능) 두 호출부 모두와 호환되는 생성자 시그니처(`node, cellMinWidth, view, HTMLAttributes?`)로 통일했다.
- "커서가 이 표 안에 있는가" 판단을 `getPos()` + `nodeSize` 범위 비교에서, `findParentNodeClosestToPos`(`@tiptap/extension-table`이 `deleteRow`/`deleteColumn` 내부에서 이미 쓰는 것과 같은 TipTap 코어 유틸)로 현재 선택 위치에서 가장 가까운 표 조상을 찾아 `this.node`와 **객체 참조가 같은지** 비교하는 방식으로 바꿨다. ProseMirror 노드는 불변 객체라 참조 비교가 안전하고, `getPos` 없이도 두 렌더링 경로(리사이즈 켜짐/꺼짐) 모두에서 동일하게 동작한다.
- `TableWithToolbar`의 `addNodeView()`/`addProseMirrorPlugins()`를 `@tiptap/extension-table`의 원본 구현과 동일한 분기(`resizable && editor.isEditable`)로 오버라이드하되, `View` 자리에 `createStickyTableView(this.editor)`를 넣어 리사이즈 여부와 무관하게 항상 표별 sticky 툴바가 딸린 View가 쓰이게 했다.

**CSS 추가**: prosemirror-tables의 `columnResizing`은 CSS를 전혀 제공하지 않는다(소스 확인) — `globals.css`에 손잡이(`.column-resize-handle`)·드래그 커서(`.resize-cursor`)·표가 넓어질 때의 가로 스크롤(`.tableWrapper { overflow-x: auto }`)을 추가했다(TipTap 공식 문서가 권장하는 CSS를 이 프로젝트의 CSS 변수 토큰에 맞게 이식).

**2026-09-02 사용자 실사용 확인 1차 후 CSS 버그 수정**: "리사이즈 할 때 컨텐츠 영역 우측에 레드 바가 보인다"는 신고를 받았다. 손잡이 자체는 의도된 기능이 맞았지만(브랜드 컬러 `--color-brand`가 실제로 빨간색 `#e4002b`), 위치가 잘못돼 있었다 — prosemirror-tables는 손잡이 `<div>`를 각 셀의 DOM 안에 직접 끼워 넣고 `position: absolute; right: -2px`로 "그 셀 기준 오른쪽 끝"에 배치하는데, 기준이 되어야 할 `td`/`th`에 `position: relative`가 빠져 있어 브라우저가 포지셔닝 기준을 계속 위로 찾아 올라가다 결국 뷰포트 기준으로 떨어져 화면 오른쪽 끝에 막대로 보였다. `.ProseMirror table td, .ProseMirror table th`에 `position: relative`를 추가해 손잡이가 자기 컬럼 경계에 정확히 붙도록 고쳤다 — 사용자가 "불필요하면 제거"라고 물었지만, 실제로는 필요한 기능(리사이즈 손잡이)이 위치 버그로 엉뚱하게 보였던 것이라 삭제 대신 위치를 고쳤다.

**2026-09-02 사용자 실사용 확인 2차 후 z-index 버그 수정**: 위 수정 직후 "헤더와 로우의 바 사이즈가 달라. 헤더가 더 얇아"라는 후속 신고를 받았다(스크린샷 첨부 — 헤더 구간만 가느다란 선으로, 본문 구간은 굵은 막대로 보임). `.column-resize-handle`의 `width`는 헤더/본문 구분 없이 4px 하나뿐임을 먼저 코드로 확인해 "선언된 폭 자체가 다르다"는 가설을 배제했다. 실제 원인은 **직전 수정(`position: relative`)이 낳은 새 부작용**이었다: `z-index`를 안 준 `position: relative` 요소끼리는 CSS 페인팅 순서(CSS2.1 Appendix E)상 DOM 트리 순서로 쌓인다 — 손잡이는 `right: -2px`로 옆 셀 영역까지 살짝 넘쳐 그려지는데, "다음"(오른쪽) 셀도 이제 `position: relative`라 같은 계층에서 나중에 그려져 그 넘친 부분 위를 덮는다. 헤더(`th`)는 `background: var(--color-surface-subtle)`로 불투명 배경이 있어 이 가림이 드러나 보였고, 본문(`td`)은 배경이 투명해 같은 현상이 있어도 안 보였을 뿐이다. `.column-resize-handle`에 `z-index: 10`을 추가해, `z-index`가 없는(auto) 옆 셀의 쌓임 순서보다 항상 위에 그려지도록 고쳤다.

## 파일 변경 내역
| 파일 | 변경 사항 |
|------|---------|
| `src/components/editor/RichTextEditor.tsx` | `resizable: true`로 전환, `StickyTableView`를 `createStickyTableView(editor)` 팩토리로 리팩터링(`getPos` 의존 제거, `findParentNodeClosestToPos` 기반 판단으로 교체), `TableWithToolbar`의 `addNodeView`/`addProseMirrorPlugins` 함께 오버라이드 |
| `src/components/editor/RichTextEditor.test.tsx` | 기존 P1-7a 테스트 9건을 새 렌더링 경로(초기 마운트 시 NodeView가 한 번 더 재구성되며 생기는 비동기 타이밍)에 맞춰 `findByLabelText`/`waitFor`로 조정(아래 "발견된 문제" 참고) |
| `src/app/globals.css` | `.tableWrapper`/`.resize-cursor`/`.column-resize-handle` 추가, `td`/`th`에 `position: relative` 추가(1차 위치 버그 수정), `.column-resize-handle`에 `z-index: 10` 추가(2차 옆 셀에 가려지는 버그 수정) |
| `docs/product/prd.md` | P1-7b 체크리스트 완료 표시 |

## 커밋 내역
| SHA | 메시지 |
|-----|--------|
| `7790753` | feat: enable table column resize |
| `7b125ad` | docs: record P1-7b commit SHA in result.md |
| `cd8a09f` | fix: anchor column-resize-handle to its own cell (1차 실사용 확인 후 수정) |
| `b3879bd` | docs: record resize-handle fix commit SHA in result.md |
| `6a0aa2f` | fix: raise column-resize-handle z-index above sibling cells (2차 실사용 확인 후 수정) |

## 자체 검토 (Self-Review)
### 긍정 사항
- `resizable: true`를 켜기 전에 실제 소스 코드(`@tiptap/extension-table`, `prosemirror-tables`)를 읽어 "P1-7a의 NodeView가 깨질 것"이라는 충돌을 미리 발견하고, 추측이 아니라 두 라이브러리의 실제 호출 시그니처에 맞춰 고쳤다 — 켜본 뒤에야 사용자가 다시 "툴바가 안 보인다"고 보고하는, 이 작업에서 이미 세 번 반복됐던 패턴을 사전에 막았다.
- 리팩터링 과정에서 실제로 테스트가 깨졌고(아래 "발견된 문제"), 그 원인을 추측하지 않고 디버그 로그로 직접 관측한 뒤(같은 조건에서 로직 자체는 이미 옳게 `active: true`를 계산하고 있었음을 확인) 순수 타이밍 문제로 좁혀 고쳤다.
- 공개 뷰어(Tech Blog Viewer)에 리사이즈된 컬럼 너비가 반영 안 될 수 있다는 한계를 미리 코드로 확인해(`tiptap-to-storage.ts`가 `colwidth`를 직렬화하지 않음) `task.md`에 범위 밖으로 명시했다 — 동시에 **에디터 자체의 저장·재로드는 원본 TipTap JSON(`sourceDocument.doc`)을 그대로 쓰므로 영향이 없다**는 것도 코드로 확인해 과장되지 않게 문서화했다.

### 주의사항
- 실제 드래그로 컬럼 너비를 조절하는 상호작용 자체는 이 세션에서 검증하지 못했다 — happy-dom이 실제 레이아웃 정보를 계산하지 않아 자동화 테스트로 의미 있게 재현할 수 없고(task.md에 범위 밖으로 명시), AX Auth 로그인 제약으로 실제 화면에서 직접 드래그해보지도 못했다. 실제 화면에서의 확인을 요청한다.
- `z-index` 수정은 CSS 페인팅 순서(CSS2.1 Appendix E — `position:relative`+`z-index:auto` 요소는 DOM 트리 순서로 쌓인다)를 근거로 한 진단이지, 실제 화면에서 개발자 도구로 직접 확인한 것은 아니다(AX Auth 제약으로 로그인 불가) — 사용자가 준 스크린샷(헤더만 얇게 보임)과 정확히 들어맞는 설명이라 확신은 높지만, 재확인을 요청한다.
- 이번 리팩터링으로 P1-7a의 표별 sticky 툴바 판단 로직이 완전히 바뀌었다(`getPos` → `findParentNodeClosestToPos`) — 표 편집의 핵심 동작(셀 드래그 선택, 방향키 이동)에는 영향이 없는 변경이지만, "커서가 표 안에 있는가"를 판단하는 방식이 근본적으로 달라진 만큼 실제 화면에서 함께 재확인해 주시면 좋겠다.

### 우려사항
- 없음.
