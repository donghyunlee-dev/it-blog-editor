# P7-3: 문서-폴더 배정 API — 검증 기록

## 자동화 테스트
| 커맨드 | 결과 |
|---|---|
| `npx vitest run src/lib/confluence/client.test.ts src/lib/editor/documents.test.ts` | 통과 (78/78, 신규: `deletePageProperty` 2건, `setDocumentFolder`/`reassignDocumentsFolder` null 처리 갱신 2건) |
| `npx vitest run`(전체 스위트) | 통과 (59 파일 / 562건) |
| `npm run lint` | 통과(내 코드 기준 무관 경고 2건만 — `postcss.config.js`/`tailwind.config.js`의 기존 `import/no-anonymous-default-export`) |
| `npx tsc --noEmit` | 통과(에러 없음) |
| `npm run build` | 통과(`/api/editor/documents/[pageId]/folder` 라우트가 목록에 나타남) |

## 실제 Confluence 인스턴스 end-to-end 검증

### 1차 시도 — 버그 발견
실제 계정(`donghyun.lee@s-food.com`)으로 폴더 생성 → `folderId` 지정 문서 생성 → 목록에서
`folderId` 반영 확인 → 존재하지 않는 폴더로 생성 시도(정상 거부) 까지는 성공했으나,
"미분류로 이동"(`setDocumentFolder(pageId, accountFolderId, null)`) 단계에서 다음 오류로
중단됨:
```
ConfluenceApiError: Confluence API 호출 실패: 400 Bad Request -
{"errors":[{"status":400,"code":"INVALID_REQUEST_BODY","title":"value: must not be null","detail":null}]}
```
**원인**: Confluence content property API가 `value: null`을 거부한다(단위 테스트는
`client.upsertPageProperty`를 모킹하므로 이 제약을 검증하지 않아 못 잡았다).
**조치**: `deletePageProperty`(속성 자체를 DELETE)를 새로 만들어, `folderId`를 `null`로
되돌릴 때 `upsertPageProperty(..., null)` 대신 이 함수를 쓰도록 `setDocumentFolder`·
`reassignDocumentsFolder`를 수정(상세는 `result.md` 참고).

이 시도는 스크립트가 오류로 중단돼 정리 단계에 도달하지 못했고, 실제 계정에 폴더
"P7-3 검증용"과 문서 "P7-3 검증 문서"(`folderId`가 그 폴더로 남은 채)가 남았다. 수정
완료 후 별도 정리 스크립트로 삭제해 검증 전 상태(문서 0개 + 원래 있던 문서 1개, 폴더 0개)로
복구했다(2026-09-09).

### 2차 시도 — 수정 후 재검증(전체 통과)
정리 후 `folderIndex`가 비어 있음을 다시 확인한 뒤 처음부터 끝까지 재실행:
1. 최상위 폴더 생성 → 성공.
2. 그 폴더를 지정해 문서 생성 → 목록 조회 시 `folderId`가 정확히 반영됨을 확인.
3. 존재하지 않는 `folderId`로 문서 생성 시도 → `ValidationError`("폴더를 찾을 수
   없습니다.")로 정상 거부.
4. `setDocumentFolder(..., null)`로 미분류 이동 → **성공**(수정 확인) — 목록 조회 시
   `folderId: null`.
5. 다시 원래 폴더로 이동 → 성공, `folderId`가 되돌아옴.
6. 폴더 삭제 → `deleteFolder`가 반환한 `parentId`(=`null`, 최상위 폴더라서)로
   `reassignDocumentsFolder` 호출 → **성공**(수정이 이 경로에도 적용됨을 확인) — 문서가
   `folderId: null`로 승격됨.
7. 문서 삭제, 남은 폴더 전부 삭제 → 목록이 정확히 빈 배열로 원상 복구됨을 확인.

## 발견된 문제와 조치
- 위 "1차 시도" 참고 — Confluence property API의 `value: null` 거부. `deletePageProperty`
  추가로 조치, 2차 시도에서 재검증 완료.

## 검증 중 새로 발견한 결정 사항
없음 — `deletePageProperty`로 "미분류"를 표현하는 방식은 이 프로젝트의 기존 규약
("property 없음 = 기본값")을 그대로 따르는 구현 디테일이라 GitHub Issue 없이 직접
정했다.

## 최종 판정
- [x] 수용 기준(`task.md`)을 모두 만족함 — PRD 갱신 가능
