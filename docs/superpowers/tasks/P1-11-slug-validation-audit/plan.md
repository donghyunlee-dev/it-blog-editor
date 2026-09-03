# P1-11: 게시 설정 slug에 슬래시가 저장되던 사례 후속 확인 — 구현 계획

## Global Constraints
- 실제 Confluence 인스턴스에 쓰기 작업(pageId `212959235`의 slug 정정)은 사용자 승인 없이 하지 않는다.
- 코드 변경은 하지 않는다 — P1-6c가 이미 해결했음을 확인하는 순수 감사 작업이다.

## Files
- Create: `docs/superpowers/tasks/P1-11-slug-validation-audit/{task,plan,result,test}.md`
- Modify: `docs/product/prd.md`

## Steps
- [x] **Step 1**: `src/lib/editor/publish.ts`의 `validateAndComposeViewers`/`SLUG_PATTERN`을 읽고 `"/root"`가 거부되는지 확인.
- [x] **Step 2**: `src/lib/editor/publish.test.ts`에서 이 사례를 재현하는 테스트가 이미 있는지 확인(`it.each`의 `"/root"` 케이스, 81번째 줄).
- [x] **Step 3**: 조사 결과를 `result.md`/`test.md`에 기록.
- [x] **Step 4**: PRD의 P1-11 항목을 갱신 — 코드 해소는 완료, 실제 데이터 정정은 사용자 승인 대기로 명시.
