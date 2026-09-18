# P19-1: 문서 "이력" 페이지 전환 — 구현 결과

## 구현 내용
- `src/components/editor/VersionHistoryPage.tsx` 신규 — `initialVersions`를 prop으로 받아
  `DeletedDocumentsPage.tsx`와 같은 레이아웃(제목·부제, `max-w-[830px]`, 카드형 `<ul>/<li>`,
  `@sfood/ui`의 `EmptyState`)으로 버전 이력을 보여준다. 클라이언트 fetch·로딩/에러 상태가
  없다 — 서버가 미리 조회해 내려준다.
- `src/app/editor/history/[pageId]/page.tsx` 신규 — `src/app/editor/[pageId]/page.tsx`의
  `requireDocumentAccess` → `try/catch` → `NotFoundError`/`UnauthorizedError` 시 `notFound()`
  패턴을 그대로 따른다.
- `EditorSidebar.tsx` — "이력" 메뉴 항목의 `onClick`을
  `router.push(`/editor/history/${document.pageId}`)`로 변경. `historyDocumentTarget` state,
  이력 `Modal`, `VersionHistory` import 제거.
- `VersionHistory.tsx`/`VersionHistory.test.tsx` 삭제(기능이 `VersionHistoryPage.tsx`로
  대체됨). `ShareForm.tsx` 주석에서 삭제된 파일에 대한 참조를 정리.
- 기존 `GET /api/editor/documents/{pageId}/versions` 라우트·`getDocumentVersionHistory`는
  그대로 유지(트래시의 `GET .../deleted`처럼 클라이언트에서 직접 쓰이진 않지만 API 계약을
  건드리지 않는다는 선례를 따름 — 새 서버 페이지는 `getDocumentVersionHistory`를 직접
  호출한다).

## 파일 변경 내역
| 파일 | 변경 사항 |
|------|---------|
| `src/app/editor/history/[pageId]/page.tsx` | 신규 — 서버 컴포넌트, 이력 조회+접근 제어 |
| `src/components/editor/VersionHistoryPage.tsx` | 신규 — 이력 목록 렌더링(트래시 페이지 패턴) |
| `src/components/editor/VersionHistoryPage.test.tsx` | 신규 — 목록/빈 상태 테스트 |
| `src/components/editor/VersionHistory.tsx` | 삭제 |
| `src/components/editor/VersionHistory.test.tsx` | 삭제 |
| `src/components/editor/EditorSidebar.tsx` | "이력" 메뉴 항목을 페이지 이동으로 변경, 관련 state/Modal/import 제거 |
| `src/components/editor/EditorSidebar.test.tsx` | 이력 모달 테스트 → 이력 페이지 이동 테스트로 교체 |
| `src/components/editor/ShareForm.tsx` | 주석에서 삭제된 파일 참조 정리 |

## 커밋 내역
| SHA | 메시지 |
|-----|--------|
| `c4b83eb` | feat: 문서 "이력"을 Modal에서 전용 페이지(/editor/history/{pageId})로 전환 (P19-1) |

## 자체 검토 (Self-Review)
### 긍정 사항
- "삭제된 문서" 페이지와 완전히 같은 구조(서버 프리페치, `EmptyState`, 카드 리스트)를
  따라 사용자가 이미 익숙한 패턴을 재사용했다.
- 접근 제어(`requireDocumentAccess` + 404 처리)를 기존 `/editor/[pageId]/page.tsx`와
  동일한 방식으로 맞춰, 공유 안 된 문서의 이력을 URL로 직접 접근해도 "존재하지 않음"과
  "존재하지만 권한 없음"을 구별할 수 없게 했다(기존 정책 유지).

### 주의사항
- 트래시 페이지와 달리 검색 입력을 넣지 않았다(task.md에 범위 밖으로 명시) — 버전 이력
  항목엔 제목/태그가 없어 검색할 대상이 없기 때문. 나중에 버전마다 메모/설명이 생기면
  재검토가 필요할 수 있다.
- `GET /api/editor/documents/{pageId}/versions` 라우트는 이제 어떤 클라이언트 코드에서도
  호출하지 않는다(서버 페이지가 `getDocumentVersionHistory`를 직접 호출) — 트래시의
  `GET .../deleted`와 같은 상황이라 일부러 남겨뒀지만, 나중에 "안 쓰는 라우트 정리" 작업이
  생기면 두 라우트를 함께 검토하는 게 자연스럽다.

### 우려사항
- 없음.
