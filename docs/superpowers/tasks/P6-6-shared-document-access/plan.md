# P6-6: 공유 문서 접근 권한 확장 — 구현 계획

## Global Constraints
- `requireDocumentOwner`는 그대로 두고(의미를 "엄격하게 소유자만"으로 유지), 새 함수
  `requireDocumentAccess`를 추가하는 방식을 쓴다 — 삭제처럼 소유자 전용으로 남겨야 하는
  호출부와 조회·수정처럼 공유 대상까지 허용해야 하는 호출부를 함수 자체로 구분해, 호출부가
  실수로 잘못된 검사를 쓰기 어렵게 만든다(기존 `saveAccountMeta`가 `accessEnabled`를 바꿀 수
  없게 막은 것과 같은 "설계를 코드로 강제" 원칙).
- 두 함수는 "이메일이 authorMeta.actualAuthorEmail과 같은가"라는 같은 판단을 공유하므로,
  private 헬퍼로 중복을 없앤다.
- `page.tsx`의 기존 방식(권한 오류를 그대로 노출하지 않고 `notFound()`로 치환 — "존재하지만
  내 것 아님"과 "존재하지 않음"을 구별 못 하게 함)은 그대로 유지한다 — `UnauthorizedError`를
  던지는 방식 자체는 바뀌지 않으므로 catch 로직 수정 불필요.

## Files
- Modify: `src/lib/editor/documents.ts`, `src/lib/editor/documents.test.ts`
- Modify: `src/app/editor/[pageId]/page.tsx`
- Modify: `src/app/api/editor/documents/[pageId]/route.ts`(PUT만), `.route.test.ts`
- Modify: `src/app/api/editor/documents/[pageId]/publish/route.ts`, `.route.test.ts`
- Modify: `src/app/api/editor/documents/[pageId]/images/route.ts`, `.route.test.ts`
- Modify: `src/app/api/editor/documents/[pageId]/versions/route.ts`, `.route.test.ts`
- Modify: `src/app/api/editor/documents/[pageId]/tags/route.ts`, `.route.test.ts`
- 문서: `docs/product/prd.md`

## Steps
- [ ] **Step 1**: `documents.ts`에 `requireDocumentAccess(pageId, email)` 추가(소유자 또는
  `sharingMeta.sharedWith` 포함). `documents.test.ts`에 소유자 통과·공유 대상 통과·제3자
  거부 세 경우 유닛 테스트.
- [ ] **Step 2**: 6개 호출부(`page.tsx`, PUT, publish, images, versions, tags)를
  `requireDocumentAccess`로 교체. DELETE는 그대로 `requireDocumentOwner` 유지.
- [ ] **Step 3**: 각 라우트 테스트에 "공유받은 계정도 통과", "공유되지 않은 제3자는 401" 케이스
  추가(이미 있는 "소유자 아니면 401" 테스트는 이름/의도를 "공유도 안 된 제3자"로 명확히 함).
  DELETE 라우트 테스트에는 "공유받은 계정도 여전히 401" 케이스 추가.
- [ ] **Step 4**: 실제 Confluence 인스턴스로 end-to-end 검증(소유자 문서를 임시 계정에
  공유 → 그 계정으로 `getDocumentDetail`+`requireDocumentAccess` 통과 확인 → 공유되지 않은
  제3의 계정은 거부 확인 → 공유받은 계정으로 `requireDocumentOwner`(삭제 기준)는 여전히
  거부되는지 확인 → 정리).
- [ ] **Step 5**: 전체 테스트/lint/typecheck/build 통과 확인, `prd.md` 갱신(P6-6 완료로 Phase 6
  본편 항목 모두 완료 — P6-2/P6-3/P6-5만 요청 대기로 남음).

각 Step은 `npm test -- <파일명>`으로 검증 가능한 단위로 쪼갠다.
