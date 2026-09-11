# P10-1: 문서 링크 카드 블록 — 결과

## 커밋
- `24152b8` feat: 문서 링크 카드 블록 추가 (P10-1)

## 변경 파일
- `src/components/editor/DocumentLinkPickerModal.tsx`(신규) — `Modal`(`@sfood/ui`) 안에 검색 입력 + 결과 목록. `GlobalSearchModal.tsx`의 디바운스(300ms) `fetch(/api/editor/documents/search?q=...)` 패턴을 재사용하되, 미리보기 패널·날짜 그룹핑 없이 목록만 있는 단순한 버전으로 만들었다. `excludePageId` prop으로 현재 문서 자신을 결과에서 제외한다.
- `src/components/editor/RichTextEditor.tsx` — `DocumentLink` TipTap 노드(atom, attrs `{pageId, title}`) 추가. `DocumentLinkView`(NodeView)가 고정 아이콘(📄)+제목+화살표 카드를 렌더링하고, 클릭 시 `useRouter().push("/editor/{pageId}")`로 이동한다. `createDocumentLinkSlashItem`이 "이미지"와 같은 패턴으로 슬래시 메뉴에 "문서 링크" 항목을 추가하되, 실제 삭제·삽입은 하지 않고 `onOpen(range)`만 호출해 피커 모달을 연다. 컴포넌트에 `documentLinkPicker` 상태를 추가하고, 모달의 `onSelect`에서 `deleteRange` + `insertContent`로 카드를 삽입한다.
- `src/lib/editor/tiptap-to-storage.ts` — `documentLink` case 추가. Confluence storage에는 사람이 읽을 수 있는 텍스트(`🔗 <strong>{title}</strong> (문서 ID: {pageId})`)로 직렬화한다(이스케이프 포함, 역방향 파서 없음 — `panel`과 동일한 원칙).
- `src/app/globals.css` — `.document-link-card`(테두리·라운드·hover — 기존 토큰만 사용), `.document-link-title`(말줄임) 스타일 추가.
- `src/components/editor/DocumentLinkPickerModal.test.tsx`(신규) — 닫힘 상태, 검색·디바운스, 빈 결과, 오류, 선택 콜백, 자기 자신 제외 6건.
- `src/components/editor/RichTextEditor.test.tsx` — "문서 링크 카드(P10-1)" describe 블록 신설(3건) + `next/navigation` `useRouter` 모킹 추가.
- `src/lib/editor/tiptap-to-storage.test.ts` — `documentLink` 직렬화·제목 없음 대체·이스케이프 테스트 3건 추가.

## 자체 검토
- **긍정**: 새 API 라우트나 npm 패키지 없이 기존 문서 검색 API(`GET /api/editor/documents/search`)와 `Modal`/`ReactNodeViewRenderer`(P9-2에서 이미 검증한 패턴)만으로 구현했다. 검색 API가 이미 "호출한 계정 문서만" 범위로 좁혀져 있어, 피커에 별도 권한 체크를 추가할 필요가 없었다 — 기존 아키텍처 결정 위에 안전하게 얹혔다.
- **주의사항**: `documentLink`는 `panel`과 달리 atom 노드(편집 가능한 콘텐츠 없음)라, NodeView 안에서 `contentEditable={false}`만으로 충분했고 `NodeViewContent`가 필요 없었다 — 두 노드의 성격 차이를 `plan.md`에 명시해 둬 향후 유지보수 시 혼동을 줄였다.
- **우려사항**: 대상 문서의 실제 제목이 나중에 바뀌어도 카드는 삽입 시점 스냅샷을 그대로 보여준다(알려진 제약, `task.md` "범위 밖" 참고) — 노션의 실시간 참조와 다른 부분이라 사용자에게 안내가 필요할 수 있다. 실제 `/editor` 화면에서의 시각적 확인은 AX Auth 로그인 제약으로 하지 못했다.

## 산출물
- `docs/superpowers/tasks/P10-1-document-link-card/{task,plan,result,test}.md`
- `src/components/editor/DocumentLinkPickerModal.tsx`, `src/components/editor/RichTextEditor.tsx`, `src/lib/editor/tiptap-to-storage.ts`, `src/app/globals.css`
