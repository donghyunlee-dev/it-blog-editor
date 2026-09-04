# P6-5: 공유받은 문서 목록 조회 — 구현 결과 보고서

## 구현 내용
- `src/lib/editor/documents.ts` — `SharedDocumentSummary` 타입과 `listSharedDocuments(email)`
  추가. 내 계정 폴더의 `sharedDocumentRefs`(P6-1/P6-4)를 근거로 참조를 읽고, 각 참조를
  `getPageOrThrow` + `fetchDocumentEntry`(`listDocuments()`가 이미 쓰는 헬퍼)로 다시 조회해
  제목·게시 여부·태그·최종 수정일을 항상 현재 상태로 반환한다(캐시된 스냅샷을 그대로
  믿지 않음). 소유자 이름은 `account-index.ts`의 `getAccountsByEmails`로 일괄 조회해 채운다.
  참조된 문서가 이미 완전히 삭제된 경우(`NotFoundError`)는 그 항목만 조용히 제외해, 전체
  조회가 깨지지 않는다.
- `GET /api/editor/documents/shared`(신규) — `listSharedDocuments`를 호출해
  `{ documents: [...] }`를 반환한다.
- `EditorLayout`(`src/app/editor/layout.tsx`)이 `listDocuments`와 함께
  `listSharedDocuments(email)`를 병렬로 조회해 `EditorShell` → `EditorSidebar`로 전달한다.
- `EditorSidebar.tsx` — "새 문서" 버튼과 검색/정렬 컨트롤 사이에 "공유받은 문서" 영역을
  추가했다. 공유받은 문서가 없으면 영역 자체를 렌더링하지 않는다(빈 상태 문구도 없음).
  각 행은 기존 "내 문서" 행과 같은 스타일(`StatusIcon` + 제목)에 공유자 표시
  (`formatAccountLabel`)를 작은 글씨로 덧붙였고, `title` 속성으로 호버 시에도 공유자를
  알 수 있게 했다.

## 파일 변경 내역
| 파일 | 변경 사항 |
|------|---------|
| `src/lib/editor/documents.ts`, `.test.ts` | `listSharedDocuments` 추가 |
| `src/app/api/editor/documents/shared/route.ts`, `.test.ts` | 신규 |
| `src/app/editor/layout.tsx` | 병렬 조회 + 전달 |
| `src/components/editor/EditorShell.tsx` | `sharedDocuments` prop 통과 |
| `src/components/editor/EditorSidebar.tsx`, `.test.tsx` | "공유받은 문서" 영역 추가 |
| `docs/product/prd.md`, `docs/product/api-spec.md` | 체크리스트 완료 표시, 응답 예시 확인 |

## 커밋 내역
| SHA | 메시지 |
|-----|--------|
| (PR에서 확인) | feat: 공유받은 문서 목록을 사이드바에 표시 (Phase 6, P6-5) |

## 자체 검토 (Self-Review)
### 긍정 사항
- 실제 Confluence 인스턴스로 end-to-end 검증했다 — 소유자가 두 문서를 임시 수신자에게
  공유 → 수신자 관점에서 두 문서 모두 최신 제목·소유자 이름과 함께 조회됨을 확인 → 소유자가
  한 문서를 완전히 삭제(휴지통 이동)한 뒤 재조회해도 전체가 깨지지 않고 그 항목만 조용히
  빠짐을 확인(드리프트 처리) → 나머지 문서도 공유 해제하면 빈 목록으로 돌아옴을 확인 →
  정리.
- 실제 브라우저에서 "공유받은 문서" 영역이 "내 문서" 목록과 시각적으로 분리돼 표시되고,
  게시/초안 아이콘과 소유자 이름(이름 없는 계정은 이메일만 폴백)이 올바르게 나타남을
  확인했다.
- 제목·게시 여부 등을 `sharedDocumentRefs`의 스냅샷이 아니라 매번 다시 읽게 만들어, 소유자가
  문서 제목을 바꾸거나 게시 상태를 바꿔도 공유받은 사람 쪽 목록이 자동으로 최신 상태를
  반영한다(별도 동기화 로직 없이).
- `fetchDocumentEntry`를 그대로 재사용해 "내 문서" 목록과 "공유받은 문서" 목록이 완전히
  같은 방식으로 현재 상태를 읽도록 보장했다 — 별도 구현을 만들지 않았다.

### 주의사항
- 문서 수만큼 `getPage`를 개별 호출한다(N+1) — `listDocuments()`도 이미 같은 패턴(계정
  범위로 한정된 N+1)을 쓰고 있어 새로운 문제는 아니지만, 공유받은 문서가 매우 많아지면
  느려질 수 있다는 한계는 동일하게 남는다.

### 우려사항
- 없음.
