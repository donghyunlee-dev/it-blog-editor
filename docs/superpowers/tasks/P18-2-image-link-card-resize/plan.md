# P18-2: 이미지/문서 링크 카드 크기 조절 — 구현 계획

## Global Constraints
- `image` 노드는 `@tiptap/extension-image`가 이미 `width`/`height` attrs를
  기본 제공한다(node_modules 확인, `AttachmentImage`가 `...this.parent?.()`로
  그대로 물려받음) — 새로 추가할 필요 없다.
- `documentLink` 노드에는 `width` attr가 없으므로 새로 추가한다.
- 드래그 로직(마우스 이벤트 수명주기: mousedown→mousemove→mouseup)은 이미지·
  문서 링크 카드가 동일하게 필요하므로 공용 훅으로 뺀다 — "무엇을 어떻게
  리사이즈하는지"(종횡비 유지 여부)만 호출부가 정한다.
- 드래그 중에는 로컬 React state로만 미리보기하고, `mouseup` 시점에 한 번만
  `updateAttributes`를 호출한다(P17-9 자리표시자 패턴과 같은 이유 — 매 픽셀
  이동마다 히스토리 스텝이 쌓이는 것을 피한다).
- 표(P1-7b)의 `column-resize-handle`과 마찬가지로 실제 드래그 동작은 이 세션의
  자동화 도구(jsdom, Browser pane 합성 마우스 이벤트)로 안정적으로 재현되지
  않을 수 있다 — 드래그의 "계산 로직"(clamp, 종횡비)은 순수 함수로 분리해 단위
  테스트하고, 실제 드래그 자체는 Browser pane에서 시각적으로 확인한다.

## Files
- Modify: `src/components/editor/RichTextEditor.tsx`
- Modify: `src/app/globals.css`
- Modify: `src/components/editor/RichTextEditor.test.tsx`
- Modify: `docs/product/prd.md`

## Steps
- [x] **Step 1**: `documentLink` 노드에 `width: { default: null }` attr 추가.
- [x] **Step 2**: 크기 조절 clamp 계산을 순수 함수(`clampResizeWidth(width,
      min, max)`)로 뺀다 — 단위 테스트 대상.
- [x] **Step 3**: 공용 드래그 훅(`useDragResize`) 추가 — mousedown 시작 좌표
      기록, mousemove마다 델타 기반 미리보기 콜백 호출, mouseup에 커밋 콜백
      호출 + 리스너 정리.
- [x] **Step 4**: `ImageView`에 우측 경계 리사이즈 핸들 추가 — 드래그 중
      종횡비(첫 렌더 시 `naturalWidth`/`naturalHeight` 또는 현재 렌더 크기
      기준)를 유지하며 width/height 미리보기, mouseup에 `updateAttributes({
      width, height })`.
- [x] **Step 5**: `DocumentLinkView`에 같은 방식으로 우측 경계 리사이즈 핸들
      추가 — 너비만 조절(높이 없음), mouseup에 `updateAttributes({ width })`.
- [x] **Step 6**: `globals.css`에 `.resizable-node`/`.node-resize-handle`
      스타일 추가 — 선택된(또는 호버된) 상태에서만 핸들이 보이게 한다.
- [x] **Step 7**: 테스트 — `clampResizeWidth` 단위 테스트(최소/최대 경계),
      이미지·문서 링크 카드에 저장된 `width`(이미지는 `height`도)가 실제로
      인라인 스타일에 반영되는지 확인.
- [x] **Step 8**: `npx vitest run RichTextEditor.test.tsx`, `npx eslint <바뀐
      파일>`, `npm run build`. Browser pane에서 실제 드래그로 이미지·카드 둘 다
      크기가 줄고 늘어나는지, 편집기 폭을 넘지 않는지 시각 확인.
