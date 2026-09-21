# P17-15: 저장 버튼 상태 표현 강화 — 구현 계획

## Global Constraints
- 새 상태 변수를 최소로 추가한다 — 이미 있는 `status`(저장 중 여부)·`isDirty`(변경
  여부)를 그대로 재사용하고, 저장 완료 시각(`lastSavedAt`)만 새로 추가한다.
- 상태 표시가 두 곳(헤더 + 풋터)에서 서로 다른 시점을 보여주며 혼란을 주지 않도록,
  풋터의 기존 자동저장 상태 문구는 제거하고 헤더로 통합한다 — `autosaveStatus` state
  전체가 이 문구 렌더링에만 쓰였으므로 함께 제거한다(죽은 코드로 남기지 않는다).
- 색상은 `@sfood/ui`가 이미 제공하는 `text-success`/`text-muted` 토큰만 쓴다(다른
  파일에서 이미 쓰이는 토큰, 하드코딩 금지 규칙).

## Files
- Modify: `src/components/editor/DocumentEditor.tsx`
- Modify: `src/components/editor/DocumentEditor.test.tsx`
- Modify: `docs/product/prd.md`

## Steps
- [x] **Step 1**: `formatSavedTime(date: Date): string`(HH:MM, 24시간제) 헬퍼를
      `formatUpdatedAt` 근처에 추가한다.
- [x] **Step 2**: `SaveStatusIndicator({ isSaving, isDirty, lastSavedAt })` 컴포넌트를
      추가한다 — 우선순위 저장 중 > 변경사항 있음 > 저장됨, 셋 다 아니면 `null`.
- [x] **Step 3**: `lastSavedAt` state를 추가한다. 초깃값은 `mode === "edit" &&
      initialUpdatedAt ? new Date(initialUpdatedAt) : null`. `handleSave`와
      `performAutosave`의 성공 분기에서 `setLastSavedAt(new Date())`를 호출한다.
- [x] **Step 4**: 헤더의 저장 버튼 바로 앞에 `<SaveStatusIndicator .../>`를 렌더링한다.
- [x] **Step 5**: 풋터의 `autosaveStatus` 기반 span과 그 state(`autosaveStatus`/
      `setAutosaveStatus`) 전체를 제거한다 — 헤더로 통합됐으므로 더 이상 쓰이지 않는다.
- [x] **Step 6**: 회귀/신규 테스트 추가(`DocumentEditor — 헤더 저장 상태 표시(P17-15)`
      describe 블록) — 새 문서 무표시, 기존 문서 초기 "저장됨 HH:MM", 수정→"변경사항
      있음"→저장 후 "저장됨 HH:MM" 전환. 기존 자동저장 테스트의 "풋터+토스트 중복 문구"
      주석/단언도 갱신한다(이제 토스트만 남는다).
- [x] **Step 7**: 임시 디버그 페이지(`/dev-preview-save-status`, 검증 후 삭제)로
      Browser pane에서 초기 상태·dirty 전환·색상(success/muted)을 실측 확인.
- [x] **Step 8**: `npx vitest run src/components/editor/DocumentEditor.test.tsx`,
      `npx eslint src/components/editor/DocumentEditor.tsx
      src/components/editor/DocumentEditor.test.tsx`, `npm run build`.
