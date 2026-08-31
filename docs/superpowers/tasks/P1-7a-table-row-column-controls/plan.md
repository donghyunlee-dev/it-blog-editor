# P1-7a: 표 행/열 추가·삭제 컨트롤 — 구현 계획

## Global Constraints
- 기존 `TableControls`의 스타일(플랫 텍스트 버튼, `variant="ghost"`, `size="sm"`, `editor.can()`으로 비활성화)을 그대로 따른다.
- TipTap이 제공하는 커맨드를 그대로 호출한다 — 직접 ProseMirror 트랜잭션을 작성하지 않는다.

## Task: `RichTextEditor.tsx`의 `TableControls`에 행/열 컨트롤 추가
### Files
- `src/components/editor/RichTextEditor.tsx` (수정)
- `src/components/editor/RichTextEditor.test.tsx` (테스트 추가)

### Steps
- [ ] `TableControls`에 6개 버튼 추가: 행 추가(위)/행 추가(아래)/행 삭제/열 추가(왼쪽)/열 추가(오른쪽)/열 삭제. 각각 `editor.chain().focus().addRowBefore().run()` 등을 호출하고 `disabled={!editor.can().addRowBefore()}` 등으로 비활성화.
- [ ] 기존 "셀 병합"/"셀 분할"과 시각적으로 구분되도록 구분선(`border-l`)을 둔다(행/열 조작과 셀 조작은 다른 그룹).
- [ ] 테스트: 표가 문서의 첫 노드일 때(기본 선택이 표 안으로 들어가는 것을 활용, 별도 클릭 시뮬레이션 불필요 — 확인됨) `TableControls`가 렌더링되고 새 버튼들이 보이는지 확인.
- [ ] 테스트: "행 추가(아래)" 클릭 시 표의 행 수가 2→3으로 늘어나는지 `onChange`로 전달된 JSON을 확인.
- [ ] 테스트: "열 삭제" 클릭 시 열 수가 2→1로 줄어드는지 확인.
- [ ] 테스트: 표 밖(예: 표 뒤에 별도 문단이 있고 그쪽에 커서가 있는 문서)에서는 컨트롤이 렌더링되지 않는지 확인(기존 회귀).
- [ ] 전체 테스트·`tsc`·`lint`·`build` 재확인.
