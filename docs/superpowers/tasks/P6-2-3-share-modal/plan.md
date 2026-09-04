# P6-2/P6-3: 계정 검색 연동 + 공유 버튼/팝업 UI — 구현 계획

## Global Constraints
- `POST/DELETE .../share*`는 `requireDocumentOwner`(엄격히 소유자만, P6-6에서 이미 삭제
  전용으로 좁혀둔 그 함수)를 그대로 재사용한다 — "재공유는 소유자만"이 곧 "소유자 전용
  동작"이라는 뜻이라 `requireDocumentAccess`가 아니라 `requireDocumentOwner`를 쓴다.
- API 라우트는 대상 계정 폴더 ID를 클라이언트에서 받지 않는다 — `findPersonalFolder(email)`
  로 서버가 직접 조회한다(내부 식별자를 클라이언트가 알거나 조작할 수 없게 하는 기존 관례,
  P5-7의 계정 검색 API가 `accountFolderId`를 응답에서 뺀 이유와 동일).
- `ShareForm`(팝업 내용)은 `PublishForm.tsx`/`VersionHistory.tsx`와 같은 관례를 따른다 —
  `Modal` 자체를 소유하지 않고, `DocumentEditor.tsx`가 `<Modal><ShareForm .../></Modal>`로
  감싼다.
- 검색 디바운스는 300ms — 이 프로젝트에 이미 있는 디바운스 사례가 없어 일반적인 관례값을
  쓴다(값 자체는 결정이 필요한 사항이 아니라 구현 세부사항으로 판단).

## Files
- Modify: `src/lib/editor/account-index.ts`(`getAccountsByEmails` 추가), `.test.ts`
- Modify: `src/lib/editor/documents.ts`(`DocumentDetail`에 `ownerEmail`/`sharedWith` 추가),
  `.test.ts`
- Create: `src/app/api/editor/documents/[pageId]/share/route.ts`(POST), `.test.ts`
- Create: `src/app/api/editor/documents/[pageId]/share/[email]/route.ts`(DELETE), `.test.ts`
- Create: `src/components/editor/ShareForm.tsx`, `.test.tsx`
- Modify: `src/components/editor/DocumentEditor.tsx`(공유 버튼·Modal 연결), `.test.tsx`
- Modify: `src/app/editor/[pageId]/page.tsx`(`isOwner`/`initialSharedWith` 전달)
- 문서: `docs/product/prd.md`, `docs/product/api-spec.md`, `docs/product/design.md`(필요 시)

## Steps
- [ ] **Step 1**: `account-index.ts`에 `getAccountsByEmails(emails)` 추가(accountIndex에서
  주어진 이메일 집합만 필터링). 유닛 테스트.
- [ ] **Step 2**: `documents.ts`의 `getDocumentDetail`을 확장해 `ownerEmail`(authorMeta에서),
  `sharedWith`(`sharingMeta.sharedWith`를 `getAccountsByEmails`로 이름까지 채운 배열, 인덱스에
  없는 이메일은 이름 없이 이메일만)를 반환하도록. 유닛 테스트.
- [ ] **Step 3**: `POST /api/editor/documents/{pageId}/share`, `DELETE .../share/{email}` 라우트
  작성 — 소유자 검사, 자기 자신 400, 대상 폴더 없으면 404, `shareDocument`/`unshareDocument`
  호출. 각각 라우트 테스트(성공/소유자 아님/자기 자신/대상 없음).
- [ ] **Step 4**: `ShareForm.tsx` 작성(검색+추가, 공유 목록+제거, 디바운스, Toast). RTL 테스트
  (검색 디바운스 후 API 호출, 추가/제거 흐름, 실패 시 토스트).
- [ ] **Step 5**: `DocumentEditor.tsx`에 "공유" 헤더 버튼(소유자만) + Modal 연결.
  `page.tsx`에서 `isOwner`/`initialSharedWith` 전달. 기존 테스트 갱신.
- [ ] **Step 6**: 실제 Confluence 인스턴스로 end-to-end 검증(소유자 문서를 실제 검색으로 찾은
  임시 계정에 공유 → 양쪽 property 확인 → 제거 → 확인 → 정리).
- [ ] **Step 7**: 임시 미인증 미리보기 라우트로 공유 팝업 UI를 실제 브라우저에서 확인 후 삭제.
- [ ] **Step 8**: 전체 테스트/lint/typecheck/build 통과, `prd.md`/`api-spec.md` 갱신(P6-2·P6-3
  완료 표시).

각 Step은 `npm test -- <파일명>`으로 검증 가능한 단위로 쪼갠다.
