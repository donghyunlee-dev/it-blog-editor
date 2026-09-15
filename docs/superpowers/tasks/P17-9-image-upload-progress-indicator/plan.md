# P17-9: 이미지 업로드 진행 상태 표시 — 구현 계획

## Global Constraints
- `@sfood/ui`의 `Spinner`를 로딩 표시에 쓴다(디자인 시스템 우선순위 규칙, CLAUDE.md).
- 자리표시자의 임시 attrs(`uploading`, `uploadId`)는 Confluence storage 변환
  (`tiptap-to-storage.ts`)에 절대 노출되지 않아야 한다 — 그 변환은 이미 `src`/`filename`/
  `alt`만 읽으므로 별도 방어 코드 없이도 안전하지만, attrs에 `rendered: false`를 줘 HTML
  파싱/직렬화 왕복에서도 새지 않게 한다.
- 전체 `npm test`는 돌리지 않는다 — 이미지 업로드(드래그앤드롭·붙여넣기·슬래시 메뉴)와
  직접 연관된 `RichTextEditor.test.tsx`/`SlashCommandExtension.test.ts`만 실행한다.

## Files
- Modify: `src/components/editor/RichTextEditor.tsx`
- Modify: `src/components/editor/RichTextEditor.test.tsx`
- Modify: `docs/product/prd.md`

## Steps
- [x] **Step 1**: `AttachmentImage`(TiptapImage 확장)에 `uploadId`(자리표시자를 나중에
      다시 찾기 위한 식별자)·`uploading`(boolean) attrs를 `rendered: false`로 추가하고,
      `addNodeView()`로 `ReactNodeViewRenderer(ImageView)`를 연결한다.
- [x] **Step 2**: `ImageView` 컴포넌트를 추가한다 — `node.attrs.uploading`이 true면
      `Spinner` + "{파일명} 업로드 중…" 문구를 보여주고, 아니면 기존과 동일하게 `<img>`를
      렌더링한다.
- [x] **Step 3**: 기존 `insertUploadedImage`(업로드 완료 후에만 노드를 삽입하던 함수)를
      제거하고, 세 함수로 대체한다: `insertUploadPlaceholder`(업로드 시작 시 즉시
      `uploading: true` 노드 삽입), `findUploadPlaceholder`(현재 문서에서 uploadId로
      재탐색), `resolveUploadPlaceholder`(성공 시 attrs를 실제 src/filename으로 갱신),
      `removeUploadPlaceholder`(실패 시 노드 삭제). 위치 추적을 transaction mapping으로
      하지 않고 "완료 시점에 현재 문서를 다시 스캔"하는 방식을 써서, 그 사이 사용자가
      다른 곳을 편집해도 안전하다.
- [x] **Step 4**: `handleDrop`/`handlePaste`/`createImageSlashItem`의 run() 세 곳 모두
      "업로드 → 완료 후 삽입" 순서를, "자리표시자 즉시 삽입 → 업로드 → 성공 시 해소/실패
      시 제거"로 바꾼다. `uploadId`는 `crypto.randomUUID()`로 발급한다.
- [x] **Step 5**: `ImageBubbleMenu`(alt 텍스트 편집 버블)가 업로드 중인 자리표시자에는
      뜨지 않도록 `isImageActive` 판정에 `!uploading` 조건을 추가한다.
- [x] **Step 6**: 테스트 — 드래그앤드롭 기준으로 (a) 업로드가 끝나기 전엔 자리표시자가
      보이고 완료되면 실제 이미지로 바뀌는지, (b) 실패하면 자리표시자가 사라지고 에러
      토스트가 뜨는지 확인한다(업로드 완료 시점을 직접 제어하는 수동 Promise 사용).
- [x] **Step 7**: 테스트 작성 중 발견한 기존 버그 — `docWithImages()` 테스트 헬퍼가
      image(block-group) 노드를 paragraph(content: "inline*") 안에 중첩해 스키마를
      위반하고 있었다(초기 `content` prop 로드는 이 위반을 조용히 허용하지만, 이번처럼
      그 자리에 `tr.insert`를 시도하면 "Invalid content for node paragraph"로 실패).
      image를 doc의 최상위 블록으로 바로 두도록 고친다.
- [x] **Step 8**: `npx vitest run RichTextEditor.test.tsx SlashCommandExtension.test.ts
      DocumentEditor.test.tsx`, `npx eslint <바뀐 파일>`, `npm run build`.
