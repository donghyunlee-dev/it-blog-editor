# P17-8: 이미지 노드 삭제/재업로드 버튼 — 구현 계획

## Global Constraints
- 새 노드뷰 구조를 만들지 않는다 — 기존 `ImageBubbleMenu`(alt 텍스트 입력이 이미
  있는 자리)에 버튼만 추가한다.
- 재업로드는 P17-9의 업로드 자리표시자 패턴(`uploadId`+`uploading` attrs,
  `resolveUploadPlaceholder`)을 그대로 재사용한다 — 실패 시에는 자리표시자를
  지우는 대신(`removeUploadPlaceholder`는 새로 삽입된 걸 지우는 용도라 재업로드
  실패에 쓰면 기존 이미지가 사라진다) 재업로드 시작 전 attrs로 되돌리는 새 헬퍼
  (`revertUploadPlaceholder`)를 추가한다.
- `pageId`는 `ImageView`/`ImageBubbleMenu`가 `RichTextEditor` 밖(NodeView·
  BubbleMenu)에서 렌더링돼 props로 못 받으므로 React Context로 내려준다
  (`CodeBlockView`가 `useToast()`를 직접 쓰는 것과 같은 이유 — 포털이어도 같은
  React 트리라 정상 동작).
- 삭제는 확인 Modal 없이 즉시 실행한다(task.md 결정 참고).

## Files
- Modify: `src/components/editor/RichTextEditor.tsx`
- Modify: `src/components/editor/RichTextEditor.test.tsx`
- Modify: `docs/product/prd.md`

## Steps
- [x] **Step 1**: `NOT_SAVED_IMAGE_REUPLOAD_MESSAGE` 상수, `revertUploadPlaceholder`
      헬퍼 추가.
- [x] **Step 2**: `ImagePageIdContext`(React Context) 추가, `RichTextEditor`의
      최상위 반환을 이 Provider로 감싸 `pageId`를 제공한다.
- [x] **Step 3**: `ImageBubbleMenu`에 "다시 업로드"/"이미지 삭제" 버튼 추가 —
      `handleDelete`(`deleteSelection`), `handleReupload`(pageId 확인 → 파일
      선택 → `updateAttributes`로 같은 노드를 업로드 중 상태로 → `uploadImage` →
      성공 시 `resolveUploadPlaceholder`, 실패 시 `revertUploadPlaceholder` +
      에러 토스트). `TableToolbarButton`에서 이미 겪은 mousedown 선택 리셋 문제
      (P17-12)를 예방하기 위해 두 버튼 모두 `onMouseDown` preventDefault를 둔다.
- [x] **Step 4**: `ImageReuploadIcon` SVG 컴포넌트 추가(기존 `TrashIcon`과 같은
      시각 스타일). 삭제 버튼은 기존 `TrashIcon`을 재사용한다.
- [x] **Step 5**: 테스트 — 이미지 클릭 시 두 버튼이 보이는지, 삭제가 실제로
      노드를 지우는지, pageId 없이 재업로드 시 안내 토스트만 뜨는지, 재업로드
      성공/실패 각각의 결과(새 이미지로 교체 / 원래 이미지로 복귀 + 에러 토스트)를
      확인한다. `@tiptap/extension-bubble-menu`의 기본 `shouldShow`가
      `view.hasFocus()`를 요구해(node_modules 확인) 이미지를 클릭하기 전에
      `.ProseMirror`를 먼저 focus해야 jsdom에서도 버블 메뉴가 뜬다(기존 "서식
      버블 메뉴" 테스트의 `selectText`와 같은 이유).
- [x] **Step 6**: `npx vitest run RichTextEditor.test.tsx`, `npx eslint <바뀐 파일>`,
      `npm run build`. Browser pane에서 실제 클릭으로 버블 메뉴·삭제 동작 시각
      확인(floating-ui 기반 BubbleMenu는 jsdom에서 위치 계산이 실제 브라우저와
      다를 수 있어 최종 확인은 실제 브라우저 렌더링으로 한다).
