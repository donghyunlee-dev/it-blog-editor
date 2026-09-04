# P5-4: 계정 정보 수정 팝업 — 구현 계획

## Global Constraints
- 저장 성공/실패 안내는 인라인 텍스트가 아니라 `Toast`로 한다(CLAUDE.md 규칙, `PublishForm.tsx`/`DeletedDocumentsModal.tsx`와 동일한 패턴).
- 조회 실패 시 Modal 안에 오류 메시지를 보여주는 패턴은 `DeletedDocumentsModal.tsx`를 그대로 따른다(로딩/에러/성공 3상태).
- `GET`/`PUT /api/editor/account`는 P5-2에서 이미 만들어져 있다 — 새 API가 필요 없다.

## Files
- Create: `src/components/editor/AccountInfoModal.tsx`
- Create: `src/components/editor/AccountInfoModal.test.tsx`
- Modify: `src/components/editor/EditorSidebar.tsx` (이메일을 클릭 가능한 진입점으로, Modal 마운트)
- Modify: `src/components/editor/EditorSidebar.test.tsx`(있다면 회귀 확인) — 없으면 생략

## Steps
- [ ] **Step 1**: `AccountInfoModal.tsx` 작성 — 마운트 시 `GET /api/editor/account` 조회(로딩/에러/성공 3상태), 성공 시 이메일(읽기전용)·이름·팀 폼 표시, 저장 시 `PUT /api/editor/account` 호출 후 Toast.
- [ ] **Step 2**: `AccountInfoModal.test.tsx` 작성 — 로딩/에러/성공 렌더링, 저장 성공/실패 각각의 Toast 안내를 검증.
- [ ] **Step 3**: `EditorSidebar.tsx`에 `accountInfoOpen` 상태 추가, 이메일 `<span>`을 `<button type="button">`으로 바꿔 Modal을 열고, 하단에 `<Modal>` + `<AccountInfoModal />` 마운트.

각 Step은 `npm test -- AccountInfoModal`/`EditorSidebar`로 검증 가능한 단위로 쪼갠다.
