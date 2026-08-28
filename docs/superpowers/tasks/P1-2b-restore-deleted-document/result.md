# P1-2b: 삭제된 문서 복구 — 구현 결과 보고서

## 구현 내용
- `documents.ts`의 `deleteDocument`가 삭제 직전에 `authorMeta`로 작성자를 찾아, 그 계정 폴더(`accountFolderId`)의 `deletedDocuments` content property에 `{pageId, title, deletedAt}`를 append한다. 이 기록이 실패해도(예: Confluence 일시 오류) 삭제 자체는 그대로 진행한다(`console.error`로만 남김) — 복구 기능이 못 쓰이게 될 뿐 삭제라는 원래 요청이 실패해서는 안 된다고 판단했다.
- `deleted-documents.ts`(신규) — `listDeletedDocuments(email)`(레지스트리를 삭제순 내림차순으로 반환), `restoreDocument(email, pageId)`(레지스트리 소속 여부로만 소유권을 판단하고, `movePage`로 "초안" 폴더에 되돌린 뒤 `hidePageFromOthers`로 제한을 다시 걸고 레지스트리에서 제거).
- `GET /api/editor/documents/deleted`, `POST /api/editor/documents/{pageId}/restore` 라우트 추가 — 둘 다 세션 이메일 기준으로만 동작하고, 다른 라우트들의 `requireDocumentOwner`(트래시된 페이지의 `authorMeta` 재조회)를 쓰지 않는다(`task.md` "수용 기준" 참고).
- `DeletedDocumentsModal.tsx`(신규) — 마운트 시 목록을 fetch해 로딩/오류/빈 목록/목록 네 상태를 보여주고, 각 항목에 "복구" 버튼을 둔다. 복구 성공/실패를 `Toast`로 안내한다.
- `EditorSidebar.tsx`에 "삭제된 문서" 진입점을 추가하고, 클릭하면 위 Modal이 뜬다. 복구 성공 시 `router.refresh()`로 문서 목록(서버 컴포넌트 props)을 다시 조회한다.
  - 2026-08-28 갱신(사용자 피드백): 처음엔 헤더에 휴지통 아이콘 버튼으로 뒀는데, "이 버튼은 삭제가 아니라 복구 동작인데 휴지통 아이콘은 오해를 준다"는 지적으로 되돌리기(circular arrow) 아이콘으로 바꿨다. 위치도 헤더에서 문서 목록(`<nav>`)과 계정/로그아웃 영역 사이의 별도 영역으로 옮겼다 — "페이지 관련된 기능이 있으면 별도의 영역을 분리하는 게 좋겠다"는 요청에 따라, 지금은 이 기능 하나뿐이지만 앞으로 같은 종류(문서 자체를 다루는, 개별 문서 열기가 아닌) 기능이 늘어나면 이 영역에 계속 추가하도록 의도했다.

## 파일 변경 내역
| 파일 | 변경 사항 |
|------|---------|
| `src/lib/editor/documents.ts` | `DELETED_DOCUMENTS_PROPERTY_KEY`, `DeletedDocumentEntry`, `deleteDocument`에 레지스트리 기록 추가 |
| `src/lib/editor/documents.test.ts` | 신규 테스트 3개(`deleteDocument`) |
| `src/lib/editor/deleted-documents.ts` | 신규 |
| `src/lib/editor/deleted-documents.test.ts` | 신규 |
| `src/app/api/editor/documents/deleted/route.ts` | 신규 |
| `src/app/api/editor/documents/deleted/route.test.ts` | 신규 |
| `src/app/api/editor/documents/[pageId]/restore/route.ts` | 신규 |
| `src/app/api/editor/documents/[pageId]/restore/route.test.ts` | 신규 |
| `src/components/editor/DeletedDocumentsModal.tsx` | 신규 |
| `src/components/editor/DeletedDocumentsModal.test.tsx` | 신규 |
| `src/components/editor/EditorSidebar.tsx` | "삭제된 문서" 헤더 버튼 + Modal 추가 |
| `src/components/editor/EditorSidebar.test.tsx` | 신규 테스트 1개, `useRouter` 대역에 `refresh` 추가 |

## 자체 검토 (Self-Review)

### 긍정 사항
- Confluence 휴지통을 직접 질의(예: `status=trashed` 필터·정렬)하는, 이 환경에서 검증 못한 넓은 API 표면적을 피하고, "우리가 직접 기록해둔 상태만 신뢰"하는 이 프로젝트의 기존 패턴(P0-5a 슬러그 인덱스)을 그대로 재사용했다 — 검증이 필요한 부분을 "트래시된 페이지 하나에 `getPage`/`movePage`가 동작하는가"로 최대한 좁혔다.
- 소유권 판단을 레지스트리 소속 여부로만 하도록 명시적으로 설계해, 트래시된 페이지의 `authorMeta` 재조회 가능 여부라는 또 다른 미검증 가정에 의존하지 않는다.
- 레지스트리 기록 실패가 삭제 자체를 막지 않도록(fail-open) 만들어, 이 신규 기능의 결함이 기존 핵심 기능(삭제)의 회귀로 이어지지 않는다.
- Confluence가 실제로 영구 삭제(purge)한 뒤 복구를 시도하는 경우(404)까지 다루고, 그 경우 레지스트리의 죽은 항목을 정리한다.

### 주의사항
- 복구된 문서는 삭제 당시 게시 상태였더라도 항상 "초안"으로 돌아온다(설계 결정, `task.md` "결정이 필요한 사항" 참고) — 트래시 상태에서 `publishMetadata`를 신뢰성 있게 재조회할 수 있는지도 미검증이라, 더 안전한 기본값(비공개)을 택했다.

### 실제 Confluence 인스턴스 검증 (2026-08-28 갱신)
사용자 승인(아무도 쓰지 않는 사내 Confluence 스페이스라 확인)으로 실제 인스턴스에 임시 페이지를 만들어 트래시→복구 흐름 전체를 직접 검증했다(`test.md`의 "수동 검증" 참고). 애초에 이 PR을 올린 이유였던 가정("`getPage`/`movePage`가 트래시된 페이지에도 동작하는가")이 실제로 확인됐다:
- `DELETE /api/v2/pages/{id}` → 트래시 이동 성공. 이때 `parentId`가 `null`로 바뀐다 — 트래시된 페이지의 원래 위치를 API로 복원할 수 없다는, 이 작업이 애초에 자체 레지스트리 방식을 택한 이유였던 가정이 그대로 맞았다.
- `GET /api/v2/pages/{id}?body-format=storage` → 트래시 상태에서도 정상 응답(본문 포함, `status: "trashed"`).
- `PUT /api/v2/pages/{id}`(`status: "current"` + `parentId` 포함, `movePage`와 동일한 요청 형태) → 트래시된 페이지가 지정한 부모로 정상 복구됨(재조회로 확인).
- (부수 발견) `DELETE`가 한 번 500(Internal Server Error)을 반환한 적이 있다 — 재시도했더니 성공했다. 일시적 오류로 보이며, 이미 백로그에 있는 P1-4/P1-3(재시도·백오프) 항목의 필요성을 뒷받침하는 사례로 남긴다.

이제 이 PR을 막던 핵심 불확실성이 해소됐다.
