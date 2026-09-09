# P7-3: 문서-폴더 배정 API — 구현 결과 보고서

## 구현 내용
- `src/lib/editor/documents.ts`에 `FOLDER_PROPERTY_KEY = "folderId"`를 추가하고,
  `DocumentSummary`에 `folderId: string | null`을 필수 필드로 추가했다(`fetchDocumentEntry`가
  이 property를 함께 읽어 채운다 — property가 없으면 `null`, 즉 "미분류").
- `CreateDocumentInput.folderId?`(선택)를 추가했다. `createDocument`는 `folders.ts`의
  `listFolders`로 지정된 폴더가 실제로 존재하는지 검증(`validateFolderId`)한 뒤, 값이
  있을 때만 property를 쓴다(값이 없으면 아예 쓰지 않음 — 아래 null 처리와 별개로 생성
  시점에는 애초에 문제가 없다).
- 새 함수 `setDocumentFolder(pageId, accountFolderId, folderId)` — 기존 문서를 다른
  폴더로 옮긴다. `reassignDocumentsFolder(accountFolderId, fromFolderId, toFolderId)` —
  계정의 모든 문서 중 `fromFolderId`에 속한 것을 전부 `toFolderId`로 재배정한다(폴더
  삭제 시 문서 승격용).
- `folders.ts`의 `deleteFolder` 반환 타입을 `Promise<void>` → `Promise<FolderNode>`로
  바꿔, 삭제된 노드(특히 `parentId`)를 호출부에 돌려준다.
- 새 라우트 `PUT /api/editor/documents/{pageId}/folder` — 소유자만 가능
  (`requireDocumentOwner`, 공유 대상은 불가 — P6-6과 같은 판단).
- `POST /api/editor/documents`가 선택적 `folderId`를 받아 `createDocument`로 그대로
  전달하도록 확장.
- `DELETE /api/editor/folders/{folderId}`가 `deleteFolder`의 반환값(`parentId`)으로
  `reassignDocumentsFolder`를 이어 호출하도록 확장 — P7-2에서 미뤄둔 "폴더 삭제 시 문서도
  상위로 승격" 정책을 완성했다(`folders.ts`는 여전히 문서를 몰라야 하므로 오케스트레이션은
  라우트 계층에서 조립).
- `docs/product/data-spec.md`(Document 테이블에 `folderId` property 행 추가),
  `docs/product/api-spec.md`(새 라우트 문서화, `POST /documents`·`GET /documents`·
  `GET /documents/shared` 응답/요청 형식 갱신) 갱신.

## 실사용 중 발견하고 고친 버그: Confluence property API의 `value: null` 거부
실제 Confluence 인스턴스로 end-to-end 검증하던 중(단위 테스트는 `client.upsertPageProperty`를
모킹하므로 이 문제를 잡아내지 못했다), `setDocumentFolder(pageId, accountFolderId, null)`
("미분류로 되돌리기")를 호출하자 다음 오류로 실패했다:

```
ConfluenceApiError: Confluence API 호출 실패: 400 Bad Request -
{"errors":[{"status":400,"code":"INVALID_REQUEST_BODY","title":"value: must not be null","detail":null}]}
```

Confluence Cloud의 content property API(`POST/PUT /api/v2/pages/{id}/properties`)는 property의
`value`로 순수 JSON `null`을 보내는 요청 자체를 거부한다. `setDocumentFolder`와
`reassignDocumentsFolder`는 둘 다 "미분류"를 표현하려고 `upsertPageProperty(pageId, "folderId",
null)`을 호출하고 있었으므로, 문서를 미분류로 되돌리는 모든 경로(수동 이동, 최상위 폴더
삭제로 인한 승격)가 실제 환경에서는 항상 실패하는 상태였다.

**조치**: `src/lib/confluence/client.ts`에 `deletePageProperty(pageId, key)`를 새로
추가했다 — property가 있으면 그 id로 `DELETE /api/v2/pages/{id}/properties/{propertyId}`를
보내고, 원래 없으면 아무 요청도 보내지 않는(멱등) 함수다. "값을 `null`로 덮어쓰기"가 아니라
"property 자체를 지우기"로 "미분류"를 표현하도록 바꿨다 — 이 프로젝트의 다른 property들
(`sharedDocumentRefs` 등)도 이미 "property가 없으면 기본값"이라는 동일한 규약을 쓰고 있어
일관된 방식이다. `setDocumentFolder`/`reassignDocumentsFolder` 둘 다 `folderId`(또는
`toFolderId`)가 `null`이면 `deletePageProperty`를, 아니면 기존대로 `upsertPageProperty`를
호출하도록 분기했다.

## 파일 변경 내역
| 파일 | 변경 사항 |
|------|---------|
| `src/lib/confluence/client.ts`, `.test.ts` | `deletePageProperty` 신규 추가(위 버그 수정) |
| `src/lib/editor/documents.ts`, `.test.ts` | `folderId` property, `setDocumentFolder`, `reassignDocumentsFolder`, null 처리 분기 |
| `src/lib/editor/folders.ts`, `.test.ts` | `deleteFolder` 반환 타입을 `Promise<FolderNode>`로 변경 |
| `src/app/api/editor/documents/route.ts`, `.test.ts` | POST가 `folderId` 전달 |
| `src/app/api/editor/documents/[pageId]/folder/route.ts`, `.test.ts` | 신규(PUT) |
| `src/app/api/editor/folders/[folderId]/route.ts`, `.test.ts` | DELETE가 `reassignDocumentsFolder` 오케스트레이션 |
| `src/app/api/editor/documents/search/route.test.ts`, `shared/route.test.ts`, `src/components/editor/EditorShell.test.tsx`, `EditorSidebar.test.tsx`, `src/lib/editor/tag-suggestions.test.ts` | `DocumentSummary` fixture에 `folderId: null` 반영(타입 변경으로 인한 후속 수정) |
| `docs/product/data-spec.md`, `docs/product/api-spec.md` | `folderId` property·새 라우트·응답 형식 문서화 |
| `docs/superpowers/tasks/P7-3-document-folder-assignment/{task,plan,result,test}.md` | 신규 |
| `docs/product/prd.md` | P7-3 완료 표시 |

## 커밋 내역
| SHA | 메시지 |
|-----|--------|
| (PR에서 확인) | feat: 문서-폴더 배정 API 추가, Confluence property null 값 거부 대응 (P7-3) |

## 자체 검토 (Self-Review)
### 긍정 사항
- 이 세션의 관례대로 실제 Confluence 인스턴스로 end-to-end 검증했고, 그 덕분에 단위
  테스트(모킹)로는 절대 잡을 수 없었던 실제 API 제약(`value: null` 거부)을 릴리스 전에
  발견해 고쳤다.
- `folders.ts`가 `documents.ts`를 몰라야 한다는 순환 참조 방지 원칙을 이번에도
  유지했다 — `deleteFolder`는 삭제된 노드만 반환하고, 문서 재배정 오케스트레이션은
  API 라우트 계층에서 두 도메인 함수를 순서대로 호출해 조립했다.
- `deletePageProperty`를 멱등하게 만들어(property가 원래 없으면 조용히 no-op)
  `setDocumentFolder(pageId, ..., null)`을 이미 미분류인 문서에 반복 호출해도 안전하다.

### 주의사항
- `deletePageProperty`가 추가한 것은 "property 삭제" 하나뿐이다 — Confluence property
  API가 `value: null`을 거부하는 제약은 `folderId` 외의 다른 nullable property를 나중에
  추가할 때도 똑같이 적용된다는 점을 기억해야 한다(`docs/product/data-spec.md`의
  `folderId` 행에 이 제약을 명시해뒀다).
- `reassignDocumentsFolder`는 계정의 모든 자식 페이지마다 `getPageProperty`를 한 번씩
  호출한다(N+1) — 이 프로젝트의 기존 관례(태그 조회 등)와 같은 수준이라 이번 범위에서는
  최적화하지 않았다. 계정당 문서 수가 지금처럼 개인 단위로 작은 동안은 문제가 되지
  않는다.

### 우려사항
- 없음.
