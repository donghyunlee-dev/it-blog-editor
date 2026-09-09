# P2-6: 텍스트 글자 크기 서식 추가 — 구현 계획

## Global Constraints
- 커스텀 값 하드코딩 금지 원칙에 따라, 새 크기 값을 임의로 도입하지 않고 `docs/product/design.md`의 기존 "사이즈" 표에 이미 있는 값(14px/16px/20px/24px)만 재사용한다.
- `@tiptap/extension-text-style`(이미 설치된 의존성, `^3.30.2`)에 `FontSize` export가 이미 포함돼 있다(`node_modules/@tiptap/extension-text-style/dist/index.cjs` 확인 — `Color`와 마찬가지로 이 패키지에 통합됨). 새 패키지 설치가 필요 없다.
- `FontSize`는 `Color`와 같은 `textStyle` 마크의 속성(`fontSize`)으로 저장된다 — 즉 한 텍스트 조각에 색상과 크기를 동시에 지정할 수 있다. `tiptap-to-storage.ts`의 `textStyle` 핸들러가 `color`만 다루므로, `fontSize`도 함께 인라인 스타일에 반영하도록 고쳐야 한다(안 고치면 발행 시 유실되는 실제 버그).

## Files
- Modify: `src/components/editor/RichTextEditor.tsx` (`FontSize` extension 등록, 버블 메뉴에 "글자 크기" Popover 추가)
- Modify: `src/components/editor/RichTextEditor.test.tsx` (새 테스트)
- Modify: `src/lib/editor/tiptap-to-storage.ts` (`textStyle` 핸들러가 `fontSize`도 인라인 스타일에 포함하도록 수정)
- Modify: `src/lib/editor/tiptap-to-storage.test.ts` (새 테스트)

## Steps
- [ ] **Step 1**: `RichTextEditor.tsx`에 `FontSize`를 `@tiptap/extension-text-style`에서 가져와 extensions 배열에 추가한다.
- [ ] **Step 2**: `FONT_SIZE_OPTIONS`(작게=14px/보통=null/크게=20px/아주 크게=24px) 상수와, 이를 렌더링하는 목록형 메뉴 컴포넌트를 `SwatchGrid`와 같은 위치에 추가한다(색상은 원, 크기는 텍스트 라벨 버튼 — 시각적 은유가 다르므로 `SwatchGrid`를 그대로 재사용하지 않고 별도 컴포넌트로 분리).
- [ ] **Step 3**: `EditorBubbleMenu`에 "글자 크기" `Popover` 트리거 버튼을 색상/하이라이트 사이(또는 뒤)에 추가한다. 활성 크기는 `editor.getAttributes("textStyle").fontSize`로 판단한다.
- [ ] **Step 4**: `tiptap-to-storage.ts`의 `MARK_TAGS.textStyle`을 고쳐 `color`/`fontSize` 중 있는 것만 모아 하나의 `style` 속성으로 합친다(예: `style="color:...;font-size:..."`). 아무 것도 없으면 기존처럼 태그를 만들지 않는다.
- [ ] **Step 5**: `RichTextEditor.test.tsx`에 "글자 크기 메뉴에서 크기를 고르면 적용된다", "보통을 고르면 해제된다", "표 셀 안에서도 동일하게 동작한다" 테스트를 추가한다.
- [ ] **Step 6**: `tiptap-to-storage.test.ts`에 "color와 fontSize가 함께 있으면 한 span의 style에 합쳐진다", "fontSize만 있어도 반영된다" 테스트를 추가한다.
- [ ] **Step 7**: `npm test`, `npm run lint`, `npm run build`로 최종 확인한다.

각 Step은 `npm test -- <파일명>`으로 검증 가능한 단위로 쪼갠다.
