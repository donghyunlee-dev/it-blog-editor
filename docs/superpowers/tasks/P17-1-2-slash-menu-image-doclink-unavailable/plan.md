# P17-1/P17-2: 슬래시 메뉴 이미지·문서 링크 무반응 수정 — 구현 계획

## Global Constraints
- 드래그앤드롭/붙여넣기 경로의 기존 안내 문구·토스트 스타일(`info` variant)을 그대로
  재사용한다 — 새 UX 패턴을 만들지 않는다.
- 전체 `npm test`는 돌리지 않는다 — 이 변경(슬래시 메뉴 이미지·문서 링크 항목)과 직접
  연관된 `RichTextEditor.test.tsx`/`SlashCommandExtension.test.ts`/`DocumentEditor.test.tsx`만
  실행한다(CLAUDE.md 테스트 루틴).

## Files
- Modify: `src/components/editor/RichTextEditor.tsx`
- Modify: `src/components/editor/RichTextEditor.test.tsx`
- Modify: `docs/product/prd.md`

## Steps
- [x] **Step 1**: 중복된 "문서를 먼저 저장한 뒤에 이미지를 추가할 수 있습니다." 문자열을
      상수(`NOT_SAVED_IMAGE_MESSAGE`)로 뽑고, 새 상수 `NOT_SAVED_DOCUMENT_LINK_MESSAGE`를
      추가한다. 기존 드래그앤드롭/붙여넣기 핸들러의 하드코딩 문자열 2곳을 상수 참조로
      바꾼다.
- [x] **Step 2**: `createImageSlashItem(pageId, onError)`의 시그니처를
      `(pageId: string | undefined, notify: (message, variant?) => void)`로 바꾸고,
      `run()` 맨 앞에서 `pageId`가 없으면 `notify(NOT_SAVED_IMAGE_MESSAGE, "info")`를
      호출하고 반환한다(파일 입력 자체를 만들지 않음).
- [x] **Step 3**: `createDocumentLinkSlashItem(onOpen)`도 같은 패턴으로
      `(pageId, onOpen, notify)`를 받게 바꾸고, `pageId`가 없으면 안내 토스트만 띄우고
      `onOpen`을 호출하지 않는다.
- [x] **Step 4**: `RichTextEditor`의 `useEditor` 설정에서 `pageId ? SlashCommandExtension
      .configure(...) : SlashCommandExtension` 삼항 분기를 제거하고, 항상
      `.configure(...)`로 두 항목을 주입한다(pageId는 그대로 전달, 없으면 undefined).
- [x] **Step 5**: 두 함수를 테스트 가능하도록 `export`로 바꾸고(기존에는 모듈
      비공개), `RichTextEditor.test.tsx`에 새 describe 블록을 추가해 pageId 없음/있음
      각각의 분기(파일 선택 창 열림 여부, 피커 열림 여부, 토스트 문구)를 검증한다.
- [x] **Step 6**: `npx vitest run RichTextEditor.test.tsx SlashCommandExtension.test.ts
      DocumentEditor.test.tsx`, `npx eslint <바뀐 파일>`, `npm run build`.
