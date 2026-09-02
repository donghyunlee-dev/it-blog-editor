# P1-8: 삽입된 이미지에 대체 텍스트(alt) 입력 UI 추가 — 구현 계획

## Global Constraints
- 기존 `EditorBubbleMenu`(텍스트 선택 시 굵게/기울임/색상/하이라이트/링크)의 동작·룩앤필을 건드리지 않는다 — 새 버블 메뉴를 별도로 추가하고, 겹쳐 뜨지 않도록 두 메뉴의 `shouldShow`만 서로 배타적으로 나눈다.
- `LinkPopoverForm`(같은 파일)이 이미 "선택 시 뜨는 팝오버 폼 + 초기 포커스 + 제출로 노드/마크 속성 갱신" 패턴을 쓰고 있으므로 그대로 재사용한다(새 UI 패턴을 만들지 않는다).
- `tiptap-to-storage.ts`의 이미지 직렬화는 순수 함수이므로 alt 유무에 따른 분기만 추가하고 기존 두 경로(첨부파일/외부 URL)의 기존 동작은 그대로 유지한다.

## Files
- Modify: `src/components/editor/RichTextEditor.tsx` — `ImageBubbleMenu`/`ImageAltPopoverForm` 컴포넌트 추가, `EditorBubbleMenu`에 `shouldShow` 추가(이미지 선택 시 숨김), 두 버블 메뉴를 함께 렌더링.
- Modify: `src/lib/editor/tiptap-to-storage.ts` — `image` 노드 직렬화 시 `alt` 속성이 있으면 `ac:alt="..."`를 `<ac:image>` 태그에 포함.
- Modify: `src/lib/editor/tiptap-to-storage.test.ts` — alt 있음/없음, 첨부파일/외부 URL 두 경로 조합 테스트 추가.
- Modify: `src/components/editor/RichTextEditor.test.tsx` — 이미지 선택 시 alt 입력 UI가 뜨는지, 입력값이 노드 속성에 반영되는지 테스트 추가.

## Steps
- [x] **Step 1**: `tiptap-to-storage.ts`의 `case "image"` 두 분기(`ri:attachment`/`ri:url`) 모두에서 `node.attrs?.alt`가 비어있지 않은 문자열이면 `<ac:image ac:alt="...">`로, 없으면 기존과 동일하게 `<ac:image>`로 직렬화하도록 수정. `escapeHtml`로 값을 이스케이프한다(기존 filename/src와 동일한 처리). `npm test -- tiptap-to-storage`로 검증.
- [x] **Step 2**: `RichTextEditor.tsx`에 `ImageAltPopoverForm({ editor })` 컴포넌트 추가 — `editor.getAttributes("image").alt`로 초기값을 읽고, 제출 시 `editor.chain().focus().updateAttributes("image", { alt: value }).run()`으로 반영. `LinkPopoverForm`과 동일하게 마운트 시 입력에 포커스.
- [x] **Step 3**: `ImageBubbleMenu({ editor })` 컴포넌트 추가 — `useEditorState`로 `editor.isActive("image")`를 구독해 `true`일 때만 `<BubbleMenu editor={editor} options={{ placement: "bottom" }}>` 안에 `ImageAltPopoverForm`을 직접(팝오버 트리거 없이) 렌더링. `EditorBubbleMenu`를 렌더링하는 곳 옆에 `<ImageBubbleMenu editor={editor} />` 추가.
- [x] **Step 4**: 기존 `EditorBubbleMenu`도 같은 방식(`useEditorState`로 `isActive("image")` 구독)으로 이미지 선택 시 `null`을 반환하게 해 텍스트 서식 메뉴와 겹치지 않게 한다. `shouldShow`를 직접 오버라이드하지 않는다 — `@tiptap/extension-bubble-menu`의 기본 `shouldShow`는 포커스가 메뉴 내부(예: 링크 팝오버 입력창)로 이동해도 메뉴를 유지하는 `isChildOfMenu` 로직을 갖고 있는데, `shouldShow`를 통째로 대체하면 이 로직이 함께 사라져 기존 링크 편집 UX가 깨진다(소스 확인, `node_modules/@tiptap/extension-bubble-menu/dist/index.js`). 조건부 렌더링(마운트/언마운트)으로 나누면 이 위험 없이 동일한 목표를 달성할 수 있다.
- [x] **Step 5**: `RichTextEditor.test.tsx`에 이미지 노드를 선택(`NodeSelection`)했을 때 alt 입력 UI가 나타나고, 입력 후 제출하면 `editor.getJSON()`에 alt가 반영되는지 확인하는 테스트 추가. `npm test -- RichTextEditor`로 검증.
- [x] **Step 6**: `npm run lint`, `npm run build` 실행.
