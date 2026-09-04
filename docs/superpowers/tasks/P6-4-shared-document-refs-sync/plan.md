# P6-4: 공유받은 문서 인덱스 기록 — 구현 계획

## Global Constraints
- `shareDocument`/`unshareDocument`의 기존 시그니처(P6-1, `pageId, email`)를 바꾼다 —
  실제 프로덕션 호출부가 아직 없어(P6-3 미착수) 하위 호환을 고려할 필요가 없다. P6-1이
  만든 유닛 테스트만 새 시그니처로 갱신하면 된다.
- `sharedDocumentRefs` 갱신은 `pageId` 기준으로 upsert한다(교체, 중복 추가 아님) — 같은
  문서를 다시 공유했을 때 `sharedDocumentRefs`에 같은 문서가 두 번 쌓이지 않게 한다.
- `sharing.ts`는 여전히 `documents.ts`/`folder.ts`를 import하지 않는다(순환 참조 방지 —
  `documents.ts`가 이미 `sharing.ts`를 import하고 있다). `ownerEmail`/`documentTitle`/
  `accountFolderId`는 모두 호출자(향후 P6-3의 API 라우트)가 파라미터로 전달한다.

## Files
- Modify: `src/lib/editor/sharing.ts`, `src/lib/editor/sharing.test.ts`

## Steps
- [ ] **Step 1**: `ShareTarget`/`SharedDocumentMeta` 타입 정의. `shareDocument`가 문서 쪽
  갱신 후 대상 계정 폴더의 `sharedDocumentRefs`에 upsert(같은 `pageId` 항목 교체)하도록
  확장. 이미 공유된 대상 재호출은 기존처럼 아무 것도 쓰지 않음(idempotent) — 유닛 테스트로
  신규 추가·재공유(교체)·이미 공유됨(no-op) 세 경우 확인.
- [ ] **Step 2**: `unshareDocument`를 확장해 대상 계정 폴더의 `sharedDocumentRefs`에서 해당
  `pageId` 항목을 제거. 원래 공유되지 않았던 경우 no-op 유지 — 유닛 테스트로 제거·이미
  없음(no-op) 확인.
- [ ] **Step 3**: 실제 Confluence 인스턴스로 end-to-end 검증(임시 문서 + 임시 "수신자" 역할
  계정 폴더로 공유 추가 → 양쪽 property 확인 → 해제 → 양쪽 제거 확인 → 정리).
- [ ] **Step 4**: 전체 테스트/lint/typecheck/build 통과 확인, `prd.md` 갱신.

각 Step은 `npm test -- <파일명>`으로 검증 가능한 단위로 쪼갠다.
