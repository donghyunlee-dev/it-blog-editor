# P1-1a 후속: Ctrl+K 검색 팝업 Notion 스타일 재구성 — 구현 계획

## Global Constraints
- 기존 API 계약(`GET /api/editor/documents/search?q=...`)의 쿼리 파라미터는 바꾸지 않는다 —
  응답 바디에 `snippet` 필드만 추가한다(하위 호환 유지, 기존 소비자 없음).
- `@sfood/ui`에 필요한 폭(2단 레이아웃)을 지원하는 컴포넌트가 없으므로 커스텀 오버레이를 쓰되,
  `Modal`의 접근성 동작(포커스 트랩·body 스크롤 잠금·Escape·배경 클릭 닫기)은 그대로 재현한다.
- 기존 `EditorSidebar`의 제목·태그 검색, `listDocuments()`는 건드리지 않는다.

## Task 1 — 서버: 스니펫 계산
### Files
- `src/lib/editor/documents.ts`
- `src/lib/editor/documents.test.ts`
- `src/app/api/editor/documents/search/route.test.ts`

### Interfaces
- `DocumentSearchResult extends DocumentSummary { snippet: string }`
- `searchDocuments(accountFolderId, query): Promise<DocumentSearchResult[]>` — 반환 타입 변경

### Steps
- [x] `buildSnippet(bodyText, normalizedQuery)` 추가 — 쿼리가 본문에 있으면 앞뒤 문맥(약 140자,
      매치 앞 40자)을, 없으면 본문 앞부분을 자른다. 본문이 비어 있으면 빈 문자열.
- [x] `searchDocuments`가 각 결과에 `snippet`을 포함하도록 매핑.
- [x] 스니펫 관련 단위 테스트 3건 추가.
- [x] 라우트 테스트의 mock/기대값에 `snippet` 필드 추가(타입 에러 수정).

## Task 2 — 클라이언트: 2단 레이아웃 + 그룹핑 + 필터
### Files
- `src/components/editor/GlobalSearchModal.tsx`
- `src/components/editor/GlobalSearchModal.test.tsx`

### Interfaces
- 내부 함수: `groupByRecency(documents): { label, documents }[]`, `startOfDay(date): Date`

### Steps
- [x] 커스텀 오버레이(배경 클릭 닫기, 포커스 트랩, body 스크롤 잠금, Escape)로 `Modal` 대체 —
      JSDoc으로 이유와 design.md 참고 링크 명시.
- [x] 좌측 결과 목록 + 우측 미리보기 패널의 2단 flex 레이아웃 구성.
- [x] "제목만" 토글 필 추가 — `titleOnly` 상태로 `visibleDocuments`를 클라이언트에서 필터링.
- [x] `groupByRecency`로 오늘/어제/최근 7일/이전 구간 헤더와 함께 렌더링.
- [x] 결과 행: `StatusIcon` + 제목 + (태그 있으면) " — 태그" 보조 텍스트.
- [x] 우측 패널: 강조된 문서의 태그(`Tag`)·제목·스니펫 표시, 없으면 안내 문구.
- [x] 키보드 탐색 시 `flatIndexByPageId`(useMemo)로 순수하게 인덱스 조회(렌더 중 변수 mutate 금지).
- [x] 테스트 10건: 열기/닫기, 검색 결과+자동 미리보기, 무결과, 오류, 클릭 이동, 방향키 이동,
      날짜 그룹핑, "제목만" 필터, idle/미리보기 문구.

## Task 3 — 문서화
### Files
- `docs/product/design.md`
- `docs/product/prd.md`
- `docs/superpowers/tasks/P1-1a-search-notion-style-redesign/{result,test}.md`

### Steps
- [x] design.md에 "Ctrl+K 검색 팝업" 절 추가 — `Modal` 대신 커스텀 오버레이를 쓴 이유 기록.
- [x] PRD의 "문서 전체 검색(Ctrl+K)" 기능 블록을 새 UI(그룹핑·필터·미리보기)에 맞게 갱신.
- [x] result.md·test.md 작성.
