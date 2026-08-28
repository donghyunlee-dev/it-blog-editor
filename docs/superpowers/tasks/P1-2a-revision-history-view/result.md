# P1-2a: 버전 이력 조회 화면 — 구현 결과 보고서

## 구현 내용
- `confluence/client.ts`에 `listPageVersions(pageId)`를 추가했다 — `GET /api/v2/pages/{id}/versions`를 `_links.next` 커서로 끝까지 순회하고, 서버 정렬에 기대지 않고 클라이언트에서 `createdAt` 내림차순으로 정렬한다(실제 인스턴스 미검증 — "우려사항" 참고).
- `documents.ts`에 `getDocumentVersionHistory(pageId)`를 추가했다 — 가장 높은 버전 번호에 `isCurrent: true`를 붙인다.
- `GET /api/editor/documents/{pageId}/versions` 라우트를 추가했다 — 기존 `tags/route.ts`와 동일한 패턴(`requireSessionEmail` → `requireDocumentOwner` → 도메인 호출 → `toErrorResponse`).
- `VersionHistory.tsx`(신규 컴포넌트) — 마운트 시 위 라우트를 호출해 로딩/성공/실패/빈 목록 네 가지 상태를 보여준다. 이 프로젝트에서 클라이언트 쪽에서 데이터를 직접 fetch하는 첫 컴포넌트다(다른 화면은 전부 서버 컴포넌트가 props로 초기 데이터를 내려준다).
- `DocumentEditor.tsx` 헤더에 "이력" 버튼(설정과 저장 사이)을 추가하고, 클릭하면 `VersionHistory`를 담은 읽기 전용 `Modal`이 뜬다.

## 파일 변경 내역
| 파일 | 변경 사항 |
|------|---------|
| `src/lib/confluence/client.ts` | `ConfluencePageVersion`, `listPageVersions` 추가 |
| `src/lib/confluence/client.test.ts` | 신규 테스트 2개 |
| `src/lib/editor/documents.ts` | `DocumentVersion`, `getDocumentVersionHistory` 추가 |
| `src/lib/editor/documents.test.ts` | 신규 테스트 1개 |
| `src/app/api/editor/documents/[pageId]/versions/route.ts` | 신규 |
| `src/app/api/editor/documents/[pageId]/versions/route.test.ts` | 신규 |
| `src/components/editor/VersionHistory.tsx` | 신규 |
| `src/components/editor/VersionHistory.test.tsx` | 신규 |
| `src/components/editor/DocumentEditor.tsx` | "이력" 헤더 버튼 + Modal 추가 |
| `src/components/editor/DocumentEditor.test.tsx` | 신규 테스트 1개, `VersionHistory` 대역 추가 |

## 자체 검토 (Self-Review)

### 긍정 사항
- TDD로 진행했다 — 저수준(client.ts) → 도메인(documents.ts) → API 라우트 → 컴포넌트 → 통합(DocumentEditor) 순서로 각 계층마다 먼저 실패를 확인한 뒤 구현했다.
- 소유권 검사(`requireDocumentOwner`)를 이 프로젝트의 다른 모든 변경/조회 라우트와 동일하게 적용했다.
- 클라이언트 fetch 컴포넌트의 로딩·오류·빈 상태를 전부 명시적으로 다뤘다 — 빈 화면으로 방치하지 않는다는 이 프로젝트의 기존 원칙(EditorSidebar의 EmptyState 등)과 일관된다.

### 주의사항
- `react-hooks/set-state-in-effect` lint 에러를 하나 더 만났다(`VersionHistory.tsx`) — 이번엔 "데이터 가져오기"라는, React 문서가 useEffect의 정당한 용도로 직접 드는 사례라 억제 처리했다(오늘 나온 세 번째 종류의 케이스: ①SSR/CSR 2-pass, ②렌더 중 상태 조정으로 대체 가능한 경우, ③이번처럼 진짜 데이터 페칭).

### 우려사항 → 해소됨 (2026-08-28 갱신)
- ~~`listPageVersions`의 Confluence API 가정을 실제 인스턴스로 검증하지 못했다.~~ 사용자 승인 하에 실제(미사용) Confluence 인스턴스에 임시 페이지를 만들어 직접 확인했다: `GET /api/v2/pages/{id}/versions`가 `results[].number`/`results[].createdAt`을 정확히 그 필드명으로 반환하고, 서버가 이미 최신순(내림차순)으로 정렬해 준다는 것도 확인했다(우리 코드는 서버 정렬에 기대지 않고 클라이언트에서 재정렬하므로 이 부분은 안전망이 이미 있었다). 다만 버전이 2개뿐인 테스트 페이지라 `_links.next` 커서를 통한 페이지네이션 자체는 실제로 여러 페이지에 걸쳐 확인하지는 못했다 — 이 프로젝트의 다른 모든 목록 엔드포인트가 같은 커서 패턴을 실제로 검증받아 쓰고 있다는 점에서 위험은 낮다고 판단한다. 자세한 절차와 응답 예시는 `test.md` 참고.
