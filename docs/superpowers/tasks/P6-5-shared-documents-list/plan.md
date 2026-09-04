# P6-5: 공유받은 문서 목록 조회 — 구현 계획

## Global Constraints
- `sharedDocumentRefs`는 "쓰기 시점에 갱신되는 캐시"라 실제 문서 상태와 어긋날 수 있다
  (data-spec.md에 이미 기록된 한계). 목록 조회 시 각 참조를 실제 문서 존재 여부까지
  다시 확인하고, 없어진 문서는 조용히 제외한다 — 이미 있는 `getPageOrThrow`(404 →
  `NotFoundError`)를 그대로 재사용해 이 판단을 특수 케이스로 새로 만들지 않는다.
- 제목·게시 여부·태그는 `listDocuments()`가 이미 쓰는 `fetchDocumentEntry` 헬퍼를 그대로
  재사용한다(중복 구현 금지) — "내 문서" 목록과 "공유받은 문서" 목록이 같은 방식으로 현재
  상태를 읽도록 보장한다.
- 사이드바 쪽 데이터는 `EditorLayout`(서버 컴포넌트)에서 한 번만 조회해 `EditorShell` →
  `EditorSidebar`로 내려준다(기존 `documents` prop과 같은 방식) — 클라이언트에서 별도로
  다시 fetch하지 않는다.

## Files
- Modify: `src/lib/editor/documents.ts`(`listSharedDocuments` 추가), `.test.ts`
- Create: `src/app/api/editor/documents/shared/route.ts`, `.test.ts`
- Modify: `src/app/editor/layout.tsx`(조회해 전달), `src/components/editor/EditorShell.tsx`
  (prop 통과), `src/components/editor/EditorSidebar.tsx`(공유받은 문서 영역), `.test.tsx`
- 문서: `docs/product/prd.md`

## Steps
- [ ] **Step 1**: `documents.ts`에 `SharedDocumentSummary` 타입과 `listSharedDocuments(email)`
  추가 — 계정 폴더 조회(`ensurePersonalFolder`) → `getSharedDocumentRefs` → 각 참조를
  `getPageOrThrow`+`fetchDocumentEntry`로 현재 상태 조회(존재하지 않으면 제외) →
  `getAccountsByEmails`로 소유자 이름 채움. 유닛 테스트(빈 목록, 정상 목록, 드리프트로
  일부 문서가 없어진 경우 제외, 소유자 이름 채움).
- [ ] **Step 2**: `GET /api/editor/documents/shared` 라우트 작성. 라우트 테스트.
- [ ] **Step 3**: `EditorLayout`이 `listSharedDocuments(email)`를 조회해 `EditorShell`에
  전달, `EditorShell`이 `EditorSidebar`로 통과. `EditorSidebar`에 "공유받은 문서" 영역
  추가(비어 있으면 렌더링 안 함) — 컴포넌트 테스트.
- [ ] **Step 4**: 실제 Confluence 인스턴스로 end-to-end 검증(소유자→수신자 공유 후 수신자
  관점에서 `listSharedDocuments` 결과 확인, 소유자가 문서를 완전히 삭제한 뒤 재조회해도
  깨지지 않고 조용히 제외되는지 확인 → 정리).
- [ ] **Step 5**: 임시 미인증 미리보기 라우트로 사이드바 영역을 실제 브라우저에서 확인 후
  삭제.
- [ ] **Step 6**: 전체 테스트/lint/typecheck/build 통과, `prd.md`/`api-spec.md` 갱신.

각 Step은 `npm test -- <파일명>`으로 검증 가능한 단위로 쪼갠다.
