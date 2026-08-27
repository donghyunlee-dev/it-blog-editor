# P0-4b: 이미지 업로드 개수 제한 — 구현 계획

## Global Constraints
- 세 업로드 진입점(드래그앤드롭·붙여넣기·슬래시 메뉴 "이미지")이 같은 상수·같은 카운트 로직을 공유한다 — 값이 세 곳에서 따로 놀지 않게 한다.
- 이미지 개수는 ProseMirror `doc` 노드를 직접 순회(`descendants`)해서 센다 — 이미 메모리에 있는 에디터 상태를 그대로 쓰고, 별도 네트워크 호출이나 JSON 직렬화를 거치지 않는다.
- 상한에 도달했을 때는 업로드 함수(`uploadImage`)를 아예 호출하지 않는다 — 이미 시작된 업로드를 중간에 취소하는 게 아니라, 애초에 시작하지 않는다.

## Files
- Modify: `src/components/editor/RichTextEditor.tsx`
- Create: `src/components/editor/RichTextEditor.test.tsx`(신규 — 이 컴포넌트는 지금까지 테스트가 없었다. 이번 상한 로직만 다루는 최소 테스트를 추가한다.)

## Steps
- [ ] **Step 1**: `RichTextEditor.tsx`에 `MAX_IMAGES_PER_DOCUMENT = 30` 상수와 `countImageNodes(doc: ProseMirrorNode): number`(descendants로 `node.type.name === "image"` 카운트) 헬퍼를 추가한다.
- [ ] **Step 2**: `handleDrop`/`handlePaste`에서 업로드 직전(`uploadImage` 호출 전) `countImageNodes(view.state.doc) >= MAX_IMAGES_PER_DOCUMENT`면 안내 토스트("이미지는 문서당 최대 30장까지 첨부할 수 있습니다.")를 띄우고 `return true`로 끝낸다.
- [ ] **Step 3**: `createImageSlashItem`의 `run`에도 같은 검사를 추가한다(파일 선택 다이얼로그를 열기 전에 미리 막을 수도 있지만, 사용자가 이미 파일을 고른 뒤(`input`의 `change` 핸들러 안)에 검사해도 실질적으로 같은 효과이고 구조가 더 단순하다 — 파일 선택 자체를 막을 필요는 없다).
- [ ] **Step 4**: `RichTextEditor.test.tsx` 신규 작성 — 이미지 노드 30개가 이미 있는 `content`로 렌더링한 뒤, `handleDrop`/`handlePaste`를 시뮬레이션해 `uploadImage`(모킹)가 호출되지 않고 안내 토스트가 뜨는지, 30개 미만이면 정상 호출되는지 확인한다. TipTap이 실제 DOM 이벤트를 필요로 하므로 `editorProps.handleDrop`/`handlePaste`를 직접 호출하기보다, 컴포넌트가 노출하는 실제 DOM에 `drop`/`paste` 이벤트를 디스패치하는 방식으로 검증한다.
- [ ] **Step 5**: `npx vitest run src/components/editor/RichTextEditor.test.tsx`로 통과 확인.
- [ ] **Step 6**: `npm test`(전체) + `npm run lint` + `npx tsc --noEmit` + `npm run build`로 회귀 없는지 확인.
