# P1-1a 후속: 문서 본문 검색(Ctrl+K 전체 검색) — 구현 결과 보고서

## 구현 내용
- **`searchDocuments` 도메인 함수**: `listDocuments()`가 애초에 `sourceDocument` property(본문 TipTap JSON 포함)를 문서마다 조회하면서도 제목만 쓰고 버리고 있었다는 것을 소스로 확인했다 — `fetchDocumentEntry`라는 공용 헬퍼로 그 조회 로직을 추출해 `listDocuments`(요약만 반환)와 `searchDocuments`(본문 텍스트까지 활용) 양쪽이 재사용하게 했다. `extractPlainText`로 TipTap JSON에서 순수 텍스트를 뽑아 제목·태그·본문 어디든 쿼리가 포함되면 매치로 판단한다.
- **`GET /api/editor/documents/search?q=...`**: 세션 확인 → 개인 폴더 조회(없으면 빈 목록) → `searchDocuments` 호출. 문서 생성·이미지 업로드·게시(P1-5)와 달리 이 엔드포인트에는 레이트리밋을 적용하지 않았다 — 대신 클라이언트가 300ms 디바운스로 호출 빈도를 억제한다.
- **`GlobalSearchModal`**: `Ctrl+K`/`Cmd+K` 전역 단축키로 여닫히는 검색 팝업(`EditorShell.tsx`에 한 번만 마운트해 `/editor/*` 어디서든 사용 가능). 입력값을 300ms 디바운스 후 검색 API에 물어보고, 결과를 클릭하거나 ArrowUp/Down+Enter로 선택해 해당 문서 편집 화면(`/editor/{pageId}`)으로 이동한다. 사이드바의 기존 `StatusIcon`(게시됨/초안 아이콘)을 export해 재사용, 시각적 일관성을 유지했다.
- **사이드바**: 기존 제목·태그 검색은 그대로 두고, "본문까지 찾으려면 Ctrl+K(Mac: ⌘K)" 힌트 문구만 추가해 새 기능의 존재를 알렸다.

## 파일 변경 내역
| 파일 | 변경 사항 |
|------|---------|
| `src/lib/editor/documents.ts` | `fetchDocumentEntry` 헬퍼 추출, `extractPlainText` 추가, `searchDocuments` 신규, `listDocuments`는 헬퍼 재사용으로 리팩터(동작 동일) |
| `src/lib/editor/documents.test.ts` | `searchDocuments` 테스트 5건 |
| `src/app/api/editor/documents/search/route.ts` | 신규 |
| `src/app/api/editor/documents/search/route.test.ts` | 신규 4건 |
| `src/components/editor/EditorSidebar.tsx` | `StatusIcon` export, Ctrl+K 힌트 문구 추가 |
| `src/components/editor/GlobalSearchModal.tsx` | 신규 |
| `src/components/editor/GlobalSearchModal.test.tsx` | 신규 7건 |
| `src/components/editor/EditorShell.tsx` | `<GlobalSearchModal />` 마운트 |
| `docs/product/prd.md` | P1-1a(본문 검색) 완료 표시 |
| `docs/superpowers/tasks/_pending-decisions.md` | Issue #7 행 "반영됨"으로 갱신 |

## 커밋 내역
| SHA | 메시지 |
|-----|--------|
| `e9bc0ed` | feat: 문서 본문 검색(Ctrl+K 전체 검색) 추가 (P1-1a 후속) |

## 자체 검토 (Self-Review)
### 긍정 사항
- 원래 이슈가 우려했던 "본문까지 조회하려면 N+1 비용이 배로 는다"는 전제를 그대로 받아들이지 않고 실제 코드(`listDocuments`)를 읽어, 이미 그 비용을 지불하고 있었다는 것을 발견해 새로운 비용 없이 재사용했다.
- `listDocuments`의 기존 반환값·시그니처를 전혀 바꾸지 않아 사이드바 관련 기존 테스트가 모두 그대로 통과했다(회귀 없음).
- 사이드바의 기존 `StatusIcon`(접근성까지 고려된 컴포넌트)을 재사용해 새 UI가 기존 디자인 언어와 일관되게 했다.

### 주의사항
- 검색 결과에 스니펫/하이라이트가 없다 — 제목·태그·게시 상태만 보여준다(task.md에 범위 밖으로 명시).
- 계정 폴더의 문서 수가 매우 많아지면(수백 건 이상) 검색 1회당 N+1 조회 비용이 커질 수 있다 — 원래 이슈가 "P1-1c(페이지네이션)가 자리잡은 뒤 재논의"라고 남긴 것과 같은 맥락의 잠재적 확장성 이슈로, 지금 규모(계정당 문서 수)에서는 감내 가능하다고 판단했다.

### 우려사항
- AX Auth 로그인 제약으로 실제 화면에서 Ctrl+K를 눌러보는 시각적 확인은 하지 못했다(이 프로젝트의 기존 제약과 동일) — 대신 컴포넌트 테스트(7건)로 키보드 단축키 토글, 디바운스 검색, 결과 클릭/키보드 탐색까지 실제 DOM 이벤트로 검증했다.
