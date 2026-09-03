# P1-1a 후속: 문서 본문 검색(Ctrl+K 전체 검색) — 구현 계획

## Global Constraints
- `listDocuments()`의 기존 동작·시그니처를 바꾸지 않는다 — 사이드바가 매 렌더링마다 의존하는 함수라 회귀 위험이 크다. 공통 로직만 private 헬퍼로 추출해 재사용한다.
- 새 검색은 온디맨드 API 하나로 캡슐화하고, 사이드바의 기존 필터(클라이언트 상태, 제목·태그)는 손대지 않는다.

## Files
- Modify: `src/lib/editor/documents.ts` — `fetchDocumentEntry` 헬퍼로 `listDocuments`의 조회 로직을 추출하고, 그걸 재사용하는 `searchDocuments(accountFolderId, query)` 추가. `extractPlainText` 헬퍼 추가.
- Modify: `src/lib/editor/documents.test.ts` — `searchDocuments` 테스트 추가.
- Create: `src/app/api/editor/documents/search/route.ts`, `route.test.ts`.
- Modify: `src/components/editor/EditorSidebar.tsx` — `StatusIcon`을 export하고(재사용), 기존 검색창 아래 Ctrl+K 힌트 문구 추가.
- Create: `src/components/editor/GlobalSearchModal.tsx`, `GlobalSearchModal.test.tsx`.
- Modify: `src/components/editor/EditorShell.tsx` — `<GlobalSearchModal />`를 한 번 마운트.

## Steps
- [x] **Step 1**: `documents.ts`에서 `listDocuments`의 페이지별 조회 로직을 `fetchDocumentEntry`(요약 + 본문 텍스트)로 추출, `listDocuments`는 그 결과에서 `summary`만 뽑아 기존과 동일한 반환값을 유지.
- [x] **Step 2**: `extractPlainText(node)` 헬퍼 추가(TipTap JSON 텍스트 노드를 재귀적으로 이어붙임).
- [x] **Step 3**: `searchDocuments(accountFolderId, query)` 추가 — 빈 쿼리는 즉시 빈 배열(조회 자체를 안 함), 제목/태그/본문 텍스트 중 하나라도 포함하면 매치.
- [x] **Step 4**: `documents.test.ts`에 `searchDocuments` 테스트 5건(빈 쿼리, 제목 매치, 태그 매치, 본문 매치, 매치 없음) 추가.
- [x] **Step 5**: `search/route.ts` 추가 — 세션 확인 → 개인 폴더 조회(없으면 빈 목록) → `searchDocuments` 호출. `route.test.ts` 4건.
- [x] **Step 6**: `EditorSidebar.tsx`의 `StatusIcon`을 `export`로 바꾸고, 기존 검색창 아래 "본문까지 찾으려면 Ctrl+K" 힌트 문구 추가.
- [x] **Step 7**: `GlobalSearchModal.tsx` 구현 — 전역 Ctrl+K/Cmd+K 리스너, 디바운스 검색, 방향키 탐색, 클릭/Enter로 이동. `EditorShell.tsx`에 마운트.
- [x] **Step 8**: `GlobalSearchModal.test.tsx` 7건(닫힘 기본값, 토글, 디바운스 검색 결과, 빈 결과, 오류, 클릭 이동, 방향키+Enter 이동).
- [x] **Step 9**: `npm test`, `npm run lint`, `npm run build` 전체 실행.
