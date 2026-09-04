# P6-7: 동시 편집 충돌 감지 + 마지막 수정자 표시 — 구현 계획

## Global Constraints
- 기존 P0-3 낙관적 동시성 제어(page version 불일치, sourceDocument property version 불일치
  두 갈래 모두 ConflictError)는 그대로 두고, 각 예외 발생 지점에 `lastEditedBy` 조회만
  추가한다 — 검사 로직 자체를 바꾸지 않는다.
- `ConflictError`에 구조화된 `details`를 추가하되 기존 호출부(개인 폴더 중복 생성 등)는
  `details`를 생략하면 그대로 동작해야 한다(하위 호환).
- 저장자 이름은 세션 이메일만으로는 알 수 없다 — 라우트에서 `findPersonalFolder` +
  `getAccountMeta`로 조회해 `updateDocument`에 넘긴다(`GET /api/editor/account`가 이미 쓰는
  패턴과 동일).

## Files
- Modify: `src/lib/editor/errors.ts`(`ConflictError.details`), `src/lib/api-response.ts`
  (409 응답에 `details` 병합), `src/lib/editor/documents.ts`(`getDocumentDetail`/
  `updateDocument`), `src/lib/editor/documents.test.ts`,
  `src/app/api/editor/documents/[pageId]/route.ts`(저장자 이름 조회 + `editor` 전달),
  `src/app/api/editor/documents/[pageId]/route.test.ts`,
  `src/components/editor/DocumentEditor.tsx`(마지막 수정자 상태·풋터 표시),
  `src/components/editor/DocumentEditor.test.tsx`,
  `src/app/editor/[pageId]/page.tsx`(`initialLastEditedBy` 전달)
- 문서: `docs/product/prd.md`, `docs/product/api-spec.md`

## Steps
- [ ] **Step 1**: `ConflictError`에 선택적 `details` 필드 추가, `toErrorResponse`가 409 응답에
  병합. 기존 `api-response.test.ts`가 그대로 통과하는지 확인(details 없는 기존 호출).
- [ ] **Step 2**: `documents.ts` — `getDocumentDetail`이 `getSharingMeta`를 함께 읽어
  `lastEditedBy`를 반환. `updateDocument`가 `editor: {email, name}`을 받아 성공 시
  `updateLastEditedBy` 호출 + 응답에 `lastEditedBy` 포함, 두 ConflictError 발생 지점 모두
  현재 `sharingMeta.lastEditedBy`를 메시지·details에 포함.
- [ ] **Step 3**: `route.ts` — 저장자 이름을 조회해 `editor`로 전달. `route.test.ts` 갱신.
- [ ] **Step 4**: `DocumentEditor.tsx` — `initialLastEditedBy` prop + 상태, 저장 성공 시
  응답의 `lastEditedBy`로 갱신, 풋터에 "마지막 수정자" 표시(있을 때만).
- [ ] **Step 5**: 실제 Confluence 인스턴스로 end-to-end 검증(임시 문서 생성 → 수정 저장 →
  `lastEditedBy` 반영 확인 → 낡은 버전으로 재저장해 충돌 메시지·details 확인 → 정리).
- [ ] **Step 6**: 임시 미인증 미리보기 라우트로 풋터 표시를 실제 브라우저에서 확인 후 삭제.
- [ ] **Step 7**: 전체 테스트/lint/typecheck/build 통과 확인, `api-spec.md`/`prd.md` 갱신.

각 Step은 `npm test -- <파일명>`으로 검증 가능한 단위로 쪼갠다.
