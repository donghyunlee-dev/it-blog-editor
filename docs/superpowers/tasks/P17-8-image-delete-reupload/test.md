# P17-8: 이미지 노드 삭제/재업로드 버튼 — 검증

## 자동화 테스트
- `npx vitest run src/components/editor/RichTextEditor.test.tsx` — 71개 전부 통과
  (새로 추가한 5개 포함):
  1. 이미지를 클릭해 선택하면 삭제·다시 업로드 버튼이 있는 버블 메뉴가 뜬다.
  2. 삭제 버튼을 누르면 이미지 노드가 문서에서 사라지고 onChange에 반영된다.
  3. 문서 저장 전(pageId 없음)에 다시 업로드를 누르면 안내 토스트만 뜨고 파일
     선택 창을 열지 않는다.
  4. 다시 업로드가 성공하면 새 이미지로 교체되고 onChange에 반영된다.
  5. 다시 업로드가 실패하면 원래 이미지로 되돌아가고 에러 토스트가 뜬다.
- `npx eslint src/components/editor/RichTextEditor.tsx
  src/components/editor/RichTextEditor.test.tsx` — 0 errors.
- `npm run build` — Turbopack 프로덕션 빌드 성공, TypeScript 통과, 20개 라우트 정상
  생성.
- 사용자 요청대로 범위를 이미지 기능과 직접 연관된 파일로 좁혀 전체 `npm test`는
  실행하지 않았다(CLAUDE.md 테스트 루틴).

## 테스트 중 발견 및 조치
- **문제**: 처음 작성한 테스트가 전부 실패했다 — 이미지를 클릭해도(NodeSelection은
  정상적으로 생겼음, `ProseMirror-selectednode` 클래스로 확인) 버블 메뉴 자체가
  DOM에 전혀 나타나지 않았다.
- **원인**: `@tiptap/extension-bubble-menu`(`node_modules` 확인)의 기본
  `shouldShow`가 `view.hasFocus()`를 요구한다. 실제 브라우저는 편집 불가
  NodeView를 클릭해도 가장 가까운 편집 가능 조상(`.ProseMirror`)으로 포커스를
  자동으로 옮기지만, jsdom/happy-dom은 이 자동 포커스 이동을 흉내 내지 않는다.
- **조치**: 이미지를 클릭하기 전에 `.ProseMirror`를 명시적으로 `.focus()`하는
  `selectImage(container)` 헬퍼를 추가했다 — 기존 "서식 버블 메뉴(P1-9e)" 테스트가
  쓰는 `selectText` 헬퍼(같은 이유로 이미 `editorEl.focus()`를 먼저 호출)와 같은
  패턴이다.
- **재검증**: 위 조치 후 5개 테스트 전부 통과.

## 수동/시각 검증(Browser pane으로 실제 확인)
AX Auth 로그인 제약으로 실제 `/editor/[pageId]` 화면은 열 수 없어, 이미지 1개를
렌더링하는 임시 디버그 페이지(검증 후 삭제)로 확인했다.

1. 이미지를 클릭하니 alt 입력 폼 옆에 다시 업로드(순환 화살표)·삭제(휴지통) 아이콘
   버튼이 있는 버블 메뉴가 정상적으로 떴다(스크린샷 확인) — jsdom에서는 안 뜨던
   것과 달리 실제 브라우저는 클릭만으로 포커스가 자동으로 옮겨져 `shouldShow`
   조건을 그대로 만족한다.
2. 삭제 버튼을 클릭하니 이미지가 즉시 문서에서 사라졌다(`get_page_text`로 빈
   본문 확인).
3. 임시 디버그 페이지를 삭제했다.
- 다시 업로드의 실제 파일 선택 다이얼로그(OS 네이티브 UI)는 이 세션의 Browser
  pane 자동화로 직접 조작할 수 없어(브라우저 밖 OS 다이얼로그), 성공/실패 각
  경로는 위 자동화 테스트(uploadImage를 모킹해 resolve/reject 직접 제어)로
  검증했다 — 실제 파일 선택은 사용자가 실브라우저에서 확인해 주면 좋다.

## 새로운 결정 사항
없음 — task.md에 정리한 대로, 삭제 확인 Modal 여부·재업로드 시 alt 유지 여부는
기존 관례(P17-7 결정, "데이터를 덜 파괴하는 쪽")에서 직접 도출했다.
