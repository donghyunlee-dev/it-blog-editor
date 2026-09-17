# P18-2: 이미지/문서 링크 카드 크기 조절 — 구현 결과

## 구현 내용

### 1. 공용 리사이즈 인프라 (`src/components/editor/RichTextEditor.tsx`)
- `RESIZE_MIN_WIDTH = 100` — 두 노드뷰가 공유하는 최소 너비 상수.
- `clampResizeWidth(width, maxWidth, minWidth?)` — 너비를 `[최소, 최대]` 범위로
  자르는 순수 함수. `maxWidth`가 `minWidth`보다 작아도(예: 아주 좁은 컨테이너)
  최소 너비를 우선하도록 `Math.max(maxWidth, minWidth)`로 방어했다. **`export`로
  바꿔 단위 테스트에서 직접 임포트**(이 파일에 이미 `createImageSlashItem` 등
  테스트용 export 선례가 있어 같은 패턴을 따름).
- `useDragResize(onDelta)` — mousedown 시작 좌표를 기록하고, `window` 레벨
  `mousemove`/`mouseup` 리스너를 등록해 각각 `phase: "preview"`/`"commit"`으로
  델타(px)를 콜백에 넘긴다. mouseup 시 리스너를 정리한다.
- `ResizeHandle` — 우측 경계에 표시되는 `role="slider"` 핸들 컴포넌트. 접근성을
  위해 `aria-valuenow`(현재 너비)/`aria-valuemin`을 채운다.

### 2. `documentLink` 노드에 `width` attr 추가
- `addAttributes()`에 `width: { default: null }` 추가.
- `parseHTML`/`renderHTML`에 `data-width` 왕복 로직 추가(값이 있을 때만 속성을
  내보내 하위 호환 유지 — 값이 없으면 기존과 동일한 마크업).

### 3. `ImageView` — 이미지 리사이즈
- 우측 경계에 `ResizeHandle` 추가. 드래그 시작 시 현재 렌더 크기와
  `naturalWidth`/`naturalHeight` 기반 종횡비, 부모 컨테이너(에디터 본문 폭)를
  기준 `maxWidth`로 기록한다.
- 드래그 중에는 로컬 `previewSize` state로만 미리보기하고, mouseup에 한 번만
  `updateAttributes({ width, height })` 호출(P17-9 자리표시자 패턴과 동일한
  이유 — 픽셀마다 히스토리 스텝이 쌓이는 것을 피함).
- 저장된 `width`/`height`가 없으면 인라인 스타일을 아예 넣지 않아 기존 이미지는
  이전과 동일하게(Tailwind Preflight의 100% 폭) 보인다.

### 4. `DocumentLinkView` — 카드 리사이즈
- 같은 방식으로 우측 경계에 핸들 추가, 너비만 조절(높이는 내용 기준 자동).
- 저장된 `width`가 없으면 인라인 스타일 없이 기존 `.document-link-card { width:
  100% }` CSS 그대로 적용된다(하위 호환).

### 5. `globals.css`
- `.document-link-card`에 `position: relative` 추가(핸들의 절대 위치 기준).
- `.resizable-node`/`.node-resize-handle` 스타일 추가 — 핸들은 평소 `opacity: 0`
  로 숨겨져 있다가 호버·포커스 시에만 보인다(표의 `column-resize-handle`은
  항상 보이는 것과 달리, 이미지/카드는 클릭 전에는 크기 조절 UI가 없다는 느낌을
  주지 않기 위해 호버로 발견 가능하게 설계).

## 실사용 중 발견한 버그와 수정

### 버그: 이미지 크기 조절 핸들을 드래그하면 이미지가 복제됨
Browser pane에서 실제 드래그로 검증하던 중, 핸들을 왼쪽에서 오른쪽으로(너비를
늘리는 방향으로) 드래그하자 `updateAttributes`가 호출되기는커녕 **이미지 노드가
그대로 복제**되고(캡션 편집용 `ImageBubbleMenu`가 뜬 상태로) 원본은 그대로
남는 현상이 나타났다.

**원인**: `@tiptap/extension-image`의 노드 스펙은 기본적으로 `draggable: true`다
(`node_modules/@tiptap/extension-image/dist/index.js` 확인). `AttachmentImage`가
`TiptapImage.extend({...})`로 이를 물려받으면서 별도로 끄지 않았다.
`prosemirror-view`의 `LeftMouseDown` 클래스(`node_modules/prosemirror-view/dist/
index.cjs`)는 **노드 스펙이 draggable인 노드 안에서 mousedown이 일어나면, 클릭
위치가 어디든(우리 커스텀 리사이즈 핸들이라도) 그 DOM에 `draggable=true`를
직접 세팅**하고 드래그-이동/복제 처리를 시작한다. 이 로직은 ProseMirror가
`view.dom`에 직접 등록한 네이티브 리스너에서 실행되는데, React의 synthetic
이벤트(우리 핸들의 `onMouseDown`에서 부르는 `stopPropagation()`)가 도달하기
전에(React 17+ 델리게이션은 `view.dom`보다 상위 루트 컨테이너에서 처리되므로)
이미 실행돼버려, 우리 쪽에서 막을 방법이 없었다.

**수정**: 이 앱은 이미지 드래그 재정렬 UI를 제공하지 않으므로, `AttachmentImage`
확장에 `draggable: false`를 추가해 애초에 ProseMirror의 네이티브 드래그 로직이
동작하지 않게 했다(`documentLink`는 `Node.create`의 기본값이 `draggable: false`라
원래부터 문제가 없었다).

**재검증**: Browser pane에서 이미지 핸들을 좌/우로 여러 차례 드래그 — 복제 없이
정확히 1개의 이미지만 유지되며 너비/높이가 의도대로 변경됨을 확인(아래 test.md
참고).

## 파일 변경
- `src/components/editor/RichTextEditor.tsx` — 리사이즈 인프라, `ImageView`/
  `DocumentLinkView` 리사이즈 핸들, `documentLink` `width` attr, `AttachmentImage`
  `draggable: false`.
- `src/app/globals.css` — 리사이즈 핸들 스타일.
- `src/components/editor/RichTextEditor.test.tsx` — `clampResizeWidth` 단위
  테스트 + 저장된 width/height가 인라인 스타일에 반영되는지 확인하는 테스트.
- `docs/superpowers/tasks/P18-2-image-link-card-resize/{task,plan,result,test}.md`
- `docs/product/prd.md` — Phase 18 체크리스트 P18-2 완료 표시.

## 자체 검토
**긍정적인 부분**
- 사용자가 명시한 두 가지 수용 기준(이미지 종횡비 유지, 카드는 너비만)을 모두
  만족하고, 실사용 검증 중 발견한 진짜 버그(드래그 시 이미지 복제)까지 같은
  작업에서 근본 원인을 찾아 고쳤다.
- 기존 문서/이미지는 `width`/`height`가 없으면 인라인 스타일을 넣지 않아
  완전히 하위 호환된다.

**주의할 점**
- 리사이즈 핸들은 마우스 드래그만 지원한다(task.md에서 범위 밖으로 명시). 키보드
  접근성이 필요해지면 별도 작업이 필요하다.
- Confluence storage export(`ac:width`)는 이번 범위에 포함하지 않았다 — 에디터
  내부 편집/재로드 왕복에만 반영된다.

**우려 사항**
- `draggable: false`로 바꾼 것이 이미지 노드의 다른 동작(예: 향후 드래그앤드롭
  재정렬 기능)에 영향을 줄 수 있다 — 다만 현재 이 앱에는 그런 기능이 없으므로
  지금 시점에는 부작용이 없다.

## P18-2 후속(PR 리뷰 중, 사용자 실사용 확인 후 리포트)

PR #146이 리뷰 대기 중일 때 사용자가 "사이즈 조절은 되는데 [이미지 캡션
편집 메뉴가] 랜덤하게 또 보이네"라고 보고했다. 크기 조절 자체(너비/높이 반영,
clamp)는 의도대로 동작하는데, 드래그를 마치고 나면 `ImageBubbleMenu`(캡션
입력·다시 업로드·삭제 버튼)가 원치 않게 뜨는 현상이었다.

### 원인 조사 — 두 번의 잘못된 가설과 실제 원인

**1차 가설(틀림)**: ProseMirror의 클릭 감지가 리사이즈 핸들 위 mousedown/mouseup을
"노드를 클릭했다"로 해석해 선택해버린다고 보고, NodeView의 `stopEvent` 콜백으로
그 이벤트를 걸러내려 했다(`isResizeHandleEvent` 함수 추가). 그런데 직접 계측
(`stopEvent` 호출 시마다 로그를 남기는 임시 코드)해보니, 실제 드래그 재현 중
이 콜백은 **단 한 번도 호출되지 않았다** — 엉뚱한 경로를 고치고 있었던 것이다.

**2차 확인 — 테스트 문서 자체의 착시**: 디버그 페이지가 이미지로 시작하는
문서였는데, 이 경우 ProseMirror의 기본 초기 선택(`Selection.atStart`)이 텍스트
커서를 둘 위치가 없어 이미지 자체를 `NodeSelection`으로 선택한 채 시작한다는
것을 발견했다 — 즉 "선택된 상태"가 리사이즈와 무관하게 페이지 로드 시점부터
이미 존재했다. 문서 맨 앞에 문단을 추가해 이 착시를 제거하고 나서야 진짜 원인을
격리할 수 있었다.

**실제 원인**: `window.getSelection()`을 드래그 도중 직접 찍어보니, 브라우저의
네이티브 `Range`가 이미 `.ProseMirror` 컨테이너를 앵커로 잡고 있었다. 이미지처럼
`contentEditable=false`인 원자적 노드 위에서 mousedown 후 버튼을 누른 채
움직이면(mousemove), **브라우저는 기본 동작으로 그 원자적 블록 전체를 네이티브
선택 영역으로 확장한다** — ProseMirror는 `selectionchange`를 구독해 이 네이티브
선택을 그대로 자신의 `NodeSelection`으로 반영하므로, 우리 리사이즈 로직과
완전히 무관하게 이미지가 선택돼버린 것이었다. `mousedown` 시점에만
`preventDefault()`를 부르는 걸로는 부족했다 — "선택 영역 확장"은 각
`mousemove`/`mouseup` 이벤트 자체의 기본 동작이라, 그 이벤트들 각각에도
`preventDefault()`를 불러야 막을 수 있었다.

### 조치
- `useDragResize`의 `mousemove`/`mouseup` 핸들러에 각각 `preventDefault()`를
  추가했다(기존엔 `mousedown`에만 있었다).
- 잘못 짚었던 1차 가설의 코드(`isResizeHandleEvent`, `ReactNodeViewRenderer`의
  `stopEvent` 옵션)는 실제로 아무 역할도 하지 않는 것으로 확인돼 걷어냈다 —
  불필요한 복잡도를 남기지 않기 위해서다.

### 재검증
Browser pane에서 (a) 이미지가 첫 노드가 아닌 현실적인 문서(문단 → 이미지 →
카드)로 재구성한 뒤, (b) 핸들 드래그로 크기를 조절하고 (c) 드래그 직후
`.ProseMirror-selectednode`/캡션 입력창이 나타나지 않는지 확인했다 — 이미지·
문서 링크 카드 모두 통과. 기존처럼 이미지를 직접 클릭했을 때 캡션 메뉴가 뜨는
동작(P17-8)은 자동화 테스트(`RichTextEditor.test.tsx`, "이미지를 클릭해
선택하면...")로 계속 보장된다 — 이번 수정은 그 테스트에 영향을 주지 않았다
(84개 전부 통과).
