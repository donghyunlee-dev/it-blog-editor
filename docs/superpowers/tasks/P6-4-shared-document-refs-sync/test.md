# P6-4: 공유받은 문서 인덱스 기록 — 검증 기록

## 자동화 테스트
| 커맨드 | 결과 |
|---|---|
| `npx vitest run src/lib/editor/sharing.test.ts` | 통과 (12/12) |
| `npx vitest run`(전체 스위트) | 통과 (49 파일 / 438건) |
| `npm run lint` | 통과(기존 경고 2건만) |
| `npx tsc --noEmit` | 통과(에러 없음) |
| `npm run build` | 통과(도메인 모듈만 변경이라 라우트 변화 없음) |

## 실제 Confluence 인스턴스 end-to-end 검증
소유자 계정(기존 테스트 계정 `donghyun.lee@s-food.com`)과 임시 "수신자" 계정 폴더
(`p6-4-verify-recipient@s-food.com`, 검증 전용으로 새로 만듦)를 준비하고, 소유자 폴더 하위에
임시 문서를 만들어 실제 도메인 함수를 순서대로 호출했다(검증 후 문서·수신자 폴더 모두 정리).
1. `shareDocument(pageId, {수신자 이메일, 수신자 계정 폴더 ID}, {소유자, 제목})` 호출 —
   문서의 `sharingMeta.sharedWith`에 수신자 이메일이 추가되고, 수신자 계정 폴더의
   `sharedDocumentRefs`에 `{pageId, ownerEmail, documentTitle, sharedAt}` 항목이 정확히
   기록됨을 확인.
2. 같은 대상으로 다시 `shareDocument` 호출(제목을 바꿔서) — 이미 공유된 상태라 idempotent로
   아무것도 갱신되지 않고 `sharedDocumentRefs`가 그대로임을 확인(기대한 동작 — 위 "주의사항"
   참고).
3. `unshareDocument` 호출 — 문서의 `sharedWith`가 빈 배열로, 수신자의 `sharedDocumentRefs`도
   빈 배열로 각각 반영됨을 확인.

## 발견된 문제와 조치
- **원인**: `sharing.test.ts`의 "기존 lastEditedBy는 보존한다" 테스트가 `getPageProperty`를
  pageId/key 구분 없는 블랭킷 mock으로 설정해뒀는데, `shareDocument`가 이제 `getSharedDocumentRefs`
  도 함께 호출하면서 같은 mock 값(`sharingMeta` 모양의 객체)을 배열 대신 받아
  `refs.filter is not a function` 오류가 났다.
- **조치**: 이 테스트를 pageId+key별로 다른 값을 돌려주는 `stubProperties` 헬퍼(이 파일에
  새로 추가, `documents.test.ts`의 기존 관례와 동일한 패턴)로 바꿔, `sharingMeta`만 값을
  주고 `sharedDocumentRefs`는 명시적으로 빈 값(→ `[]`)이 되게 했다.
- **재검증 결과**: `npx vitest run src/lib/editor/sharing.test.ts` 재실행 시 12건 모두 통과.

## 검증 중 새로 발견한 결정 사항
없음.

## 최종 판정
- [x] 수용 기준(`task.md`)을 모두 만족함 — PRD 갱신 가능
