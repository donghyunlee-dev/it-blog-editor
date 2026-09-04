# P5-8: 계정 페이지 본문 가시성 — 구현 계획

## Global Constraints
- `client.ts`에 `movePage`가 이미 쓰는 "현재 페이지를 읽고 특정 필드만 바꿔 PUT" 패턴을
  그대로 재사용한다(`replacePageBody`) — 새로운 패턴을 만들지 않는다.
- 본문 갱신은 항상 property 저장이 끝난 *뒤에* best-effort로 시도한다(실패해도 throw하지
  않고 로그만 남김) — `documents.ts`의 `recordDeletedDocument`("이 함수 자체가 실패해도
  삭제를 막지는 않는다")와 같은 원칙.
- 사용자 자유 입력(이름·팀)은 반드시 이스케이프한다 — `tiptap-to-storage.ts`에 이미 있는
  것과 같은 규칙(`&`/`<`/`>`/`"`)을 별도 공유 유틸(`src/lib/html-escape.ts`)로 새로 만든다
  (기존 함수는 그 모듈 안에 비공개로 있어 재사용하기보다 작은 유틸을 새로 두는 쪽이 결합도가
  낮다).

## Files
- Create: `src/lib/html-escape.ts`, `.test.ts`
- Modify: `src/lib/confluence/client.ts`(`replacePageBody` 추가), `.test.ts`
- Modify: `src/lib/editor/account.ts`(계정 폴더 본문 갱신), `.test.ts`
- Modify: `src/lib/editor/account-index.ts`(계정 관리 페이지 본문 갱신), `.test.ts`
- 문서: `docs/product/prd.md`, `docs/product/data-spec.md`

## Steps
- [ ] **Step 1**: `src/lib/html-escape.ts`에 `escapeHtml` 작성 + 유닛 테스트.
- [ ] **Step 2**: `client.ts`에 `replacePageBody(pageId, bodyValue)` 추가(`movePage`와 같은
  get-then-put 패턴). `client.test.ts`에 `movePage` 테스트와 같은 방식으로 fetch mock 테스트.
- [ ] **Step 3**: `account.ts`에 `renderAccountFolderBody`/`syncAccountFolderBody`(best-effort)
  추가, `saveAccountMeta`/`initializeAccountMeta`/`setAccessEnabled` 세 곳 모두에서 호출.
  `account.test.ts`의 `beforeEach`에 `client.getPage`/`client.updatePage` 블랭킷 mock 추가하고,
  본문 내용을 검증하는 테스트 1건 추가.
- [ ] **Step 4**: `account-index.ts`에 `renderAccountIndexBody`/`syncAccountIndexBody`
  추가, `upsertAccountIndexEntry`에서 호출. `account-index.test.ts`도 같은 방식으로 갱신.
- [ ] **Step 5**: 실제 Confluence 인스턴스로 end-to-end 검증(계정 정보 저장 → 계정 폴더
  페이지 body 조회로 표 확인, 접속 권한 변경 → 계정 관리 페이지 body 조회로 표 확인 →
  이름에 HTML 특수문자를 넣어도 안전하게 이스케이프되는지 확인).
- [ ] **Step 6**: 전체 테스트/lint/typecheck/build 통과, `prd.md`(P5-8 신설)·`data-spec.md`
  갱신.

각 Step은 `npm test -- <파일명>`으로 검증 가능한 단위로 쪼갠다.
