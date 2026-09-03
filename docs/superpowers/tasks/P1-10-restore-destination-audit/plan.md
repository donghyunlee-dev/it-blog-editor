# P1-10: 삭제된 문서 복구 시 Space 최상위로 이동하던 사례 후속 조치 — 구현 계획

## Global Constraints
- 실제 Confluence 인스턴스에 쓰기 작업(pageId `212959235` 이동)은 사용자 승인 없이 하지 않는다.
- 코드 변경은 최소화한다 — 이미 안전한 구조를 재확인하는 감사(audit) 작업이 중심이다.

## Files
- Modify: `src/lib/editor/deleted-documents.test.ts` — 기존 "계정 폴더로 이동" 테스트의 주석에 이 테스트가 P1-10 회귀(Space 홈페이지로의 이동)도 함께 막고 있음을 명시(중복 테스트 추가 없이 기존 테스트의 의도를 명확히 함).
- Create: `docs/superpowers/tasks/P1-10-restore-destination-audit/{task,plan,result,test}.md`

## Steps
- [x] **Step 1**: 현재 `restoreDocument`/`findPersonalFolder`/`createPersonalFolder` 코드를 읽고, `folder.accountFolderId`가 `space.homepageId`와 같아질 수 있는 경로가 있는지 확인.
- [x] **Step 2**: `git show 469c3bb^1:src/lib/editor/deleted-documents.ts`, `git show 469c3bb^1:src/lib/editor/folder.ts`(P0-8 커밋의 부모, 즉 P0-8 이전 상태)로 원래 구현을 확인.
- [x] **Step 3**: 조사 결과를 `result.md`/`test.md`에 기록.
- [x] **Step 4**: 기존 `deleted-documents.test.ts`의 관련 테스트 주석에 P1-10 회귀 방지 의도를 추가.
- [x] **Step 5**: `npx vitest run "src/lib/editor/deleted-documents.test.ts"`로 검증.
