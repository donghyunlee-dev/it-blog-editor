# P17-11: 코드 블록 IDE 스타일 다크 테마 + 줄 번호 — 구현 계획

## Global Constraints
- 하드코딩 hex 없이 `@sfood/ui`의 기본 팔레트 토큰(`--gray-*`, 테마 무관 고정)만
  참조한다.
- 줄 번호 거터는 ProseMirror 콘텐츠(`contentDOM`) 밖의 순수 표시용 요소로만 만든다 —
  편집 가능한 텍스트 구조를 바꾸지 않는다(언어 선택 툴바와 같은 패턴).
- 전체 `npm test`는 돌리지 않는다 — 코드 블록과 직접 연관된 `RichTextEditor.test.tsx`만
  실행한다.

## Files
- Modify: `src/app/globals.css`
- Modify: `src/components/editor/RichTextEditor.tsx`
- Modify: `src/components/editor/RichTextEditor.test.tsx`
- Modify: `docs/product/prd.md`

## Steps
- [x] **Step 1**: `.prose pre`에 `--tw-prose-pre-bg: var(--gray-900)`/
      `--tw-prose-pre-code: var(--gray-50)`/`--color-secondary: var(--gray-300)`/
      `--color-muted: var(--gray-400)`를 고정 오버라이드해, 코드 블록 배경·기본
      글자색·hljs-attr류(secondary)·hljs-comment류(muted) 색을 테마와 무관하게
      항상 다크 테마 값으로 고정한다(`--color-brand`/`success`/`warning`/`info`/
      `danger`는 애초에 테마 간 값이 안 바뀌어 그대로 둔다).
- [x] **Step 2**: `CodeBlockView`에 줄 번호 거터(`.code-block-gutter`,
      `contentEditable={false}`, `node.textContent.split("\n").length`으로 계산)를
      `<pre>` 안 `<code>` 앞 형제로 추가한다. `.prose pre`를 `display: flex`로 바꿔
      거터·코드가 나란히 놓이고 같은 padding-top 기준으로 줄이 맞도록 한다.
- [x] **Step 3**: 임시 디버그 페이지(커밋 안 함)로 Browser pane에서 라이트/다크 테마
      둘 다 확인한다.
- [x] **Step 4**: (버그 발견) 라이트 테마에서 언어 선택 드롭다운 글자색
      (`text-foreground` → 라이트 테마에선 어두운 회색)이 새로 고정한 어두운 배경과
      겹쳐 안 보이는 회귀를 발견 — `.code-block-toolbar`에도 `--color-foreground`/
      `--color-border`/`--color-muted`를 같은 방식으로 고정해 그 안의 어떤 디자인
      시스템 컴포넌트를 쓰든 항상 올바른 대비를 갖게 한다.
- [x] **Step 5**: 같은 디버그 페이지로 수정 후 재확인(라이트/다크 둘 다 드롭다운 글자
      정상 표시).
- [x] **Step 6**: 디버그 페이지를 삭제한다.
- [x] **Step 7**: 테스트 — 코드 줄 수만큼 거터 번호가 순서대로 보이는지, 빈 코드
      블록엔 "1"만 보이는지 확인하는 테스트 2개 추가.
- [x] **Step 8**: `npx vitest run RichTextEditor.test.tsx`, `npx eslint <바뀐 파일>`,
      `npm run build`.
