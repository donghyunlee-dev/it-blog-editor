# P17-6: 슬래시 메뉴 항목 아이콘 추가 — 구현 계획

## Global Constraints
- `createSlashMenuRenderer`는 순수 DOM(`document.createElement`) 렌더러라 아이콘은
  문자열(SVG 마크업 또는 이모지)로 전달한다 — React 컴포넌트를 그대로 쓸 수 없다.
- `icon`은 optional로 둔다 — 기존 테스트 픽스처(`{ title, run }`만 있는 `CommandItem`)
  가 계속 통과해야 한다(하위 호환).
- 아이콘은 장식용이라 버튼에 `aria-hidden="true"`로 감싸 스크린 리더가 중복으로
  읽지 않게 한다 — 버튼의 접근성 이름은 계속 title 텍스트만으로 결정된다.
- 새 아이콘 라이브러리를 추가하지 않는다 — 기존 `TableIcon`/`CodeCopyIcon` 시각
  스타일(viewBox 0 0 24 24, stroke=currentColor, stroke-width=2, h-4 w-4)을 그대로
  따르고, 패널 3종은 이미 있는 `DEFAULT_PANEL_ICONS` 이모지를 재사용한다.

## Files
- Modify: `src/components/editor/SlashCommandExtension.ts`
- Modify: `src/components/editor/RichTextEditor.tsx`
- Modify: `src/components/editor/SlashCommandExtension.test.ts`
- Modify: `docs/product/prd.md`

## Steps
- [x] **Step 1**: `CommandItem` 인터페이스에 `icon?: string` 필드를 추가한다.
- [x] **Step 2**: 기본 13개 항목에 아이콘 상수(SVG 마크업 문자열, 패널 3종은
      `DEFAULT_PANEL_ICONS` 이모지)를 지정한다.
- [x] **Step 3**: `createImageSlashItem`/`createDocumentLinkSlashItem`(RichTextEditor.tsx)
      에도 아이콘(이미지 아이콘·링크 아이콘)을 지정한다.
- [x] **Step 4**: `renderItems()`가 `item.icon`이 있으면 `aria-hidden` 아이콘 span을
      제목 앞에 렌더링하도록 수정한다. 버튼 레이아웃을 `flex items-center gap-2`로
      바꿔 아이콘·텍스트가 나란히 놓이게 한다.
- [x] **Step 5**: 테스트 — 13개 항목 전부 non-empty `icon`을 갖는지, 렌더러가 아이콘이
      있는 항목엔 아이콘 요소를, 없는 항목(icon 없는 기존 픽스처)엔 아이콘 없이
      제목만 렌더링하는지, 아이콘 span이 `aria-hidden="true"`인지 확인한다.
- [x] **Step 6**: `npx vitest run SlashCommandExtension.test.ts RichTextEditor.test.tsx`,
      `npx eslint <바뀐 파일>`, `npm run build`.
