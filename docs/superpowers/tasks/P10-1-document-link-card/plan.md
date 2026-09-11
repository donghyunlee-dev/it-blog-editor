# P10-1: 문서 링크 카드 블록 — 구현 계획

## Global Constraints
- 새 npm 패키지를 설치하지 않는다 — 기존 검색 API·`Modal`(`@sfood/ui`)·`ReactNodeViewRenderer`(P9-2에서 이미 쓴 패턴)만 재사용한다.
- 검색은 기존 `GET /api/editor/documents/search`(`searchDocuments`)를 그대로 쓴다 — 새 API 라우트를 만들지 않는다. 이 API가 이미 "호출한 계정의 문서만" 범위로 좁혀져 있어 별도 권한 체크가 필요 없다.
- `documentLink`는 atom 노드(내부 편집 불가, 삽입 시점 attrs만 표시)로 만든다 — `panel`(block+ 콘텐츠)과 다른 성격이다.
- `tiptap-to-storage.ts`는 여전히 단방향 직렬화만 한다(역방향 파서 신설 없음, `panel`과 동일한 기존 원칙).

## Files
- Create: `src/components/editor/DocumentLinkPickerModal.tsx`
- Create: `src/components/editor/DocumentLinkPickerModal.test.tsx`
- Modify: `src/components/editor/RichTextEditor.tsx` (`DocumentLink` 노드 + `DocumentLinkView` NodeView, 슬래시 확장 설정에 문서 링크 항목 연결, 피커 모달 렌더링·상태)
- Modify: `src/components/editor/RichTextEditor.test.tsx`
- Modify: `src/components/editor/SlashCommandExtension.ts` (`createDocumentLinkSlashItem` 추가)
- Modify: `src/components/editor/SlashCommandExtension.test.ts`
- Modify: `src/lib/editor/tiptap-to-storage.ts` (`documentLink` case 추가)
- Modify: `src/lib/editor/tiptap-to-storage.test.ts`
- Modify: `src/app/globals.css` (`.document-link-card` 등 카드 스타일)

## Steps
- [ ] **Step 1**: `SlashCommandExtension.ts`에 `createDocumentLinkSlashItem(onOpen: (range: Range) => void): CommandItem`을 추가한다 — "이미지" 항목과 같은 패턴으로, `run`이 텍스트를 바로 삭제/삽입하지 않고 `onOpen(range)`만 호출한다(실제 삭제·삽입은 모달에서 문서를 고른 뒤 일어난다).
- [ ] **Step 2**: `DocumentLinkPickerModal.tsx` — `Modal`(size="md") 안에 검색 입력 + 결과 목록. `GlobalSearchModal.tsx`의 디바운스(300ms)·`fetch(/api/editor/documents/search?q=...)` 패턴을 재사용하되, 미리보기 패널 없이 목록만 있는 단순한 버전으로 만든다. `excludePageId` prop으로 현재 문서 자신을 결과에서 제외한다. 결과 클릭 시 `onSelect({ pageId, title })`를 호출한다.
- [ ] **Step 3**: `RichTextEditor.tsx`에 `DocumentLink` TipTap 노드를 추가한다 — `atom: true`, attrs `{ pageId: {default: null}, title: {default: ""} }`, `parseHTML`/`renderHTML`(저장·클립보드 경로용 `<a data-document-link href="/editor/{pageId}">{title}</a>`), `addNodeView()`로 `DocumentLinkView`(카드: 📄 아이콘 + 제목 + 화살표, `useRouter().push()`로 이동, `contentEditable={false}`) 연결.
- [ ] **Step 4**: `RichTextEditor.tsx` 컴포넌트에 `documentLinkPicker: { range: Range } | null` 상태를 추가하고, `pageId`가 있을 때 슬래시 확장의 `extraItems`에 `createDocumentLinkSlashItem((range) => setDocumentLinkPicker({ range }))`를 추가한다(기존 `createImageSlashItem`과 나란히). `<DocumentLinkPickerModal>`을 렌더링해 `onSelect`에서 `editor.chain().focus().deleteRange(range).insertContent({type:"documentLink", attrs:{pageId, title}}).run()`을 호출하고 모달을 닫는다.
- [ ] **Step 5**: `tiptap-to-storage.ts`의 `serializeNode`에 `documentLink` case를 추가한다 — `escapeHtml`로 제목·pageId를 이스케이프해 `<p>🔗 <strong>{title}</strong> (문서 ID: {pageId})</p>` 형태로 직렬화한다.
- [ ] **Step 6**: `globals.css`에 `.document-link-card`(테두리·라운드·hover 배경 — 기존 토큰만 사용)와 제목 말줄임(`text-overflow: ellipsis`), 화살표 정렬 스타일을 추가한다.
- [ ] **Step 7**: `DocumentLinkPickerModal.test.tsx` — 검색어 입력 시 디바운스 후 API 호출, 로딩/에러/빈 결과 상태, 결과 클릭 시 `onSelect` 호출, `excludePageId`로 자기 자신 제외를 검증한다.
- [ ] **Step 8**: `SlashCommandExtension.test.ts` — "문서 링크" 항목이 `onOpen(range)`만 호출하고 편집기를 직접 조작하지 않는지 검증.
- [ ] **Step 9**: `RichTextEditor.test.tsx` — `pageId` 없을 때 "문서 링크" 슬래시 항목이 노출되지 않는지, 카드가 렌더링되면 제목·아이콘이 보이는지, 카드 클릭 시 라우터 `push`가 호출되는지(`next/navigation`의 `useRouter` 모킹) 검증.
- [ ] **Step 10**: `tiptap-to-storage.test.ts` — `documentLink` 직렬화 결과와 XSS 이스케이프를 검증.
- [ ] **Step 11**: `npx vitest run` (변경/신규 테스트 파일 전체), `npx eslint` (변경 파일), `npm run build`로 최종 확인한다.

각 Step은 `npx vitest run src/components/editor/DocumentLinkPickerModal.test.tsx src/components/editor/RichTextEditor.test.tsx src/components/editor/SlashCommandExtension.test.ts src/lib/editor/tiptap-to-storage.test.ts`로 검증 가능한 단위로 쪼갠다.
