# P0-1b: 자동 저장 도입 — 구현 계획

## Global Constraints
- 기존 수동 저장(`handleSave`)의 동작·API 계약(`PUT /api/editor/documents/{pageId}`, 버전 충돌 처리)을 그대로 재사용한다 — 자동 저장 전용 API를 새로 만들지 않는다.
- 자동 저장은 별도의 `autosaveStatus` 상태로 표시하고, 기존 `status`(저장/삭제 버튼 비활성화에 쓰임)는 건드리지 않는다 — 매 분마다 툴바 전체가 깜빡이며 비활성화되면 안 된다.
- `localStorage` 접근은 항상 `try/catch`로 감싼다(프라이빗 브라우징 등에서 실패할 수 있음, `ThemeToggle.tsx`/`EditorShell.tsx`와 같은 기존 패턴).
- 1분 주기 타이머는 매 키 입력마다 리셋되면 안 된다 — "1분마다 체크"는 고정 주기지 "마지막 입력 후 1분"이 아니다. `useRef`로 최신 상태값을 들고, `setInterval`은 `mode`/`pageId`가 바뀔 때만 다시 만든다.

## Files
- Create: `src/lib/editor/autosave-storage.ts`(순수 함수 — localStorage read/write/clear)
- Create: `src/lib/editor/autosave-storage.test.ts`
- Modify: `src/components/editor/DocumentEditor.tsx`
- Modify: `src/components/editor/DocumentEditor.test.tsx`

## Steps
- [ ] **Step 1**: `autosave-storage.test.ts`를 먼저 작성한다(TDD) — `writeAutosaveSnapshot`/`readAutosaveSnapshot`/`clearAutosaveSnapshot`가 문서별로 구분된 키로 값을 담고/읽고/지우는지, `savedAt`이 자동으로 채워지는지, `localStorage`가 없거나 예외를 던지는 환경에서도(스텁으로 흉내) 조용히 실패하는지.
- [ ] **Step 2**: `npx vitest run src/lib/editor/autosave-storage.test.ts`로 실패 확인.
- [ ] **Step 3**: `autosave-storage.ts` 작성 — `AutosaveSnapshot { title, doc, tags, savedAt }`, 키는 `sfood-editor-autosave:{pageId}`.
- [ ] **Step 4**: `npx vitest run src/lib/editor/autosave-storage.test.ts`로 통과 확인.
- [ ] **Step 5**: `DocumentEditor.test.tsx`에 실패하는 테스트를 추가한다(TDD, `vi.useFakeTimers()` 활용) —
  1. 변경사항이 있는 상태에서 60초가 지나면 자동으로 PUT 요청이 나간다(태그 요청은 안 나감).
  2. 변경사항이 없으면 60초가 지나도 요청이 나가지 않는다.
  3. 자동 저장 성공 시 `localStorage`의 임시 저장본이 지워진다.
  4. 자동 저장 실패 시 임시 저장본이 남아있고 경고 토스트가 뜬다.
  5. 마운트 시 `localStorage`에 서버 최종 수정 시각보다 최신인 임시 저장본이 있으면 복구 확인 모달이 뜨고, "복구"를 누르면 제목/본문/태그가 그 값으로 바뀐다.
  6. 서버 최종 수정 시각보다 오래된(이미 반영된) 임시 저장본은 조용히 지워지고 모달이 뜨지 않는다.
- [ ] **Step 6**: `npx vitest run src/components/editor/DocumentEditor.test.tsx`로 실패 확인.
- [ ] **Step 7**: `DocumentEditor.tsx` 수정.
  - `useUnsavedChanges()`에서 `isDirty`도 함께 받아온다.
  - 최신 상태(title/doc/tags/version/isDirty/status)를 담는 ref들을 두고, 렌더마다(의존성 배열 없는 `useEffect`) 갱신한다.
  - `mode==="edit" && pageId`일 때만 마운트 시 `readAutosaveSnapshot`으로 복구 대상 확인 → `initialUpdatedAt`보다 최신이면 복구 확인 `Modal`용 state에 담고, 아니면 `clearAutosaveSnapshot` 후 무시.
  - `mode==="edit" && pageId`일 때만 60초 `setInterval`을 등록해 `performAutosave` 실행(의존성은 `[mode, pageId]`만).
  - `performAutosave`: `isDirtyRef`가 false거나 `statusRef`가 idle이 아니면 건너뜀 → `writeAutosaveSnapshot` → PUT 요청(태그 없이 title/doc만) → 성공 시 `setVersion`/`setDirty(false)`/`clearAutosaveSnapshot`/`autosaveStatus="saved"` → 실패 시 `autosaveStatus="failed"` + 경고 토스트(임시 저장본은 그대로 둠).
  - 복구 `Modal`: "복구" 클릭 시 title/doc/tags를 스냅샷 값으로 설정 + `setDirty(true)` + `clearAutosaveSnapshot`. "무시" 클릭 시 `clearAutosaveSnapshot`만.
  - 자동 저장 상태를 보여줄 최소한의 텍스트(예: 기존 "최종 수정" 풋터 옆에 "자동 저장됨" 표시) 추가.
- [ ] **Step 8**: `npx vitest run src/components/editor/DocumentEditor.test.tsx`로 통과 확인.
- [ ] **Step 9**: `npm test`(전체) + `npm run lint` + `npx tsc --noEmit` + `npm run build`로 회귀 없는지 확인.
- [ ] **Step 10**: 구현 완료 후 `gh issue close 1`로 Issue #1을 닫고, `_pending-decisions.md`에서 이 항목을 "반영됨"으로 갱신한다.
