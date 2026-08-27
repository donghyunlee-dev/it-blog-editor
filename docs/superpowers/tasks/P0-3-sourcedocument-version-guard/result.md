# P0-3: 동시 편집 시 sourceDocument 버전 미검증 — 구현 결과 보고서

## 구현 내용

### 1. `confluence/client.ts` — `upsertPageProperty`에 opt-in 버전 검사 추가
- `PropertyVersionConflictError`(신규, 저수준 계층 전용 에러) 추가 — 도메인 `ConflictError`와 분리해 계층 원칙(client.ts → editor/*.ts)을 지킨다.
- `upsertPageProperty(pageId, key, value, options?: { expectedVersion?: number })` — `expectedVersion`을 넘기면, 쓰기 직전에 다시 읽은 속성의 실제 버전(`existing?.version.number ?? 0`)과 비교해 다르면 PUT/POST를 보내지 않고 `PropertyVersionConflictError`를 던진다. `expectedVersion`을 넘기지 않으면(기존 모든 호출부) 예전과 완전히 동일하게 동작한다.

### 2. `documents.ts` — `updateDocument`가 저장 시작 시점의 속성 버전을 캡처해 전달
- `getPageOrThrow`(페이지 버전)와 `getPageProperty`(sourceDocument 속성 버전)를 `Promise.all`로 저장 시작 시점에 함께 읽는다.
- 페이지 버전 검사는 기존 그대로.
- `upsertPageProperty` 호출에 `{ expectedVersion: sourceProperty?.version.number ?? 0 }`을 넘긴다.
- `PropertyVersionConflictError`를 잡아 사용자에게 "문서 본문은 저장됐지만, 편집 원본이 동시에 다른 곳에서 변경되어 반영하지 못했다"는 `ConflictError`로 변환한다 — 기존 버전 충돌(409)과 동일한 클라이언트 처리 경로(토스트)를 그대로 탄다.

## 파일 변경 내역
| 파일 | 변경 사항 |
|------|---------|
| `src/lib/confluence/client.ts` | `PropertyVersionConflictError` 추가, `upsertPageProperty`에 `expectedVersion` 옵션 추가 |
| `src/lib/confluence/client.test.ts` | 신규 테스트 3개 |
| `src/lib/editor/documents.ts` | `updateDocument`가 속성 버전을 캡처해 전달, 충돌 시 `ConflictError`로 변환 |
| `src/lib/editor/documents.test.ts` | 기존 테스트 갱신(4번째 인자 검증), 신규 충돌 테스트 1개 |

## 자체 검토 (Self-Review)

### 긍정 사항
- TDD로 진행했다 — `client.test.ts`/`documents.test.ts` 모두 먼저 실패를 확인한 뒤 구현했다.
- `expectedVersion`을 opt-in으로 설계해 `createDocument`(authorMeta/sourceDocument 최초 생성)와 `publish.ts`(publishMetadata)의 기존 호출부는 시그니처만 그대로 컴파일되고 동작은 전혀 바뀌지 않는다 — `npm run build`의 라우트 목록과 전체 테스트(145/145)로 회귀 없음을 확인했다.
- 저수준(`client.ts`)과 도메인(`documents.ts`) 계층 경계를 지켰다 — `PropertyVersionConflictError`(HTTP 개념 없음) vs `ConflictError`(도메인 개념, 409 매핑)를 분리했다.

### 주의사항
- 이 수정은 **부분 성공을 완전히 없애지 않는다** — `updatePage`(본문)는 이미 성공한 뒤 `upsertPageProperty`(속성)만 거부되는 상태가 여전히 가능하다. Confluence Cloud REST API가 여러 리소스에 걸친 트랜잭션을 지원하지 않아 이 계층에서 더 근본적인 해결은 불가능하다(`task.md` "범위 밖" 참고). 이번 수정의 효과는 "조용한 원고 유실"을 "사용자가 알아차리고 다시 시도할 수 있는 오류"로 바꾼 것이다 — `publish.ts`가 이미 비슷한 트레이드오프(부분 성공은 감수하되 실패 시 상태를 안전한 쪽으로 편향)를 받아들인 전례와 같은 결의 판단이다.
- 사용자가 이 충돌 오류를 받은 뒤 아무 조치 없이 즉시 재시도하면, 클라이언트의 `version` state가 이미 새 페이지 버전으로 갱신되지 않았을 수 있어(저장이 예외로 끝나 `setVersion`이 호출되지 않음) 다음 저장 시도가 이번엔 **페이지 버전** 충돌(기존 P0 이전부터 있던 처리)로 다시 걸릴 수 있다 — 두 경우 모두 "최신 내용을 다시 불러온 뒤 저장하라"는 동일한 안내로 귀결되므로 추가 처리가 필요하지 않다고 판단했다.

### 우려사항
- 없음.
