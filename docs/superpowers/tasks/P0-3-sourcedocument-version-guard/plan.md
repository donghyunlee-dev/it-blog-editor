# P0-3: 동시 편집 시 sourceDocument 버전 미검증 — 구현 계획

## Global Constraints
- `upsertPageProperty`의 버전 검사는 **opt-in**이어야 한다 — `expectedVersion`을 넘기지 않는 기존 호출부(`createDocument`, `publish.ts`)는 지금처럼 무조건 덮어쓴다.
- 저수준 계층(`confluence/client.ts`)은 도메인 에러(`ConflictError` 등, `src/lib/editor/errors.ts`)를 몰라야 한다(architecture.md의 계층 원칙: client.ts → editor/*.ts). 버전 불일치는 client.ts가 자체 에러 타입으로 던지고, `documents.ts`가 잡아서 `ConflictError`로 변환한다.
- 완전한 원자적 트랜잭션은 만들 수 없다(Confluence가 지원하지 않음) — "조용한 유실"을 "감지 가능한 오류"로 바꾸는 것이 목표다. 본문 저장은 이미 성공한 뒤 속성 저장만 거부되는 부분 성공 상태가 될 수 있다는 것을 알고 진행한다(이미 `publish.ts`가 비슷한 트레이드오프를 받아들인 전례가 있다).

## Files
- Modify: `src/lib/confluence/client.ts`
- Modify: `src/lib/confluence/client.test.ts`
- Modify: `src/lib/editor/documents.ts`
- Modify: `src/lib/editor/documents.test.ts`

## Steps
- [ ] **Step 1**: `client.test.ts`에 실패하는 테스트를 먼저 추가한다(TDD) — `upsertPageProperty(pageId, key, value, { expectedVersion })`가 (a) 현재 속성 버전과 `expectedVersion`이 일치하면 정상적으로 PUT하고, (b) 다르면 PUT을 보내지 않고 `PropertyVersionConflictError`를 던지는지, (c) `expectedVersion`을 넘기지 않으면 기존처럼 검사 없이 그대로 동작하는지.
- [ ] **Step 2**: `npx vitest run src/lib/confluence/client.test.ts`로 실패 확인.
- [ ] **Step 3**: `client.ts` 수정.
  - `export class PropertyVersionConflictError extends Error { ... }` 추가(도메인 `ConflictError`와는 별개 — 저수준 계층 전용).
  - `upsertPageProperty`에 4번째 인자 `options?: { expectedVersion?: number }` 추가. `options?.expectedVersion !== undefined`이면 `existing?.version.number ?? 0`과 비교해 다르면 `PropertyVersionConflictError`를 던지고 PUT/POST를 실행하지 않는다.
- [ ] **Step 4**: `npx vitest run src/lib/confluence/client.test.ts`로 통과 확인.
- [ ] **Step 5**: `documents.test.ts`에 실패하는 테스트를 추가한다 — "저장 시작 시점 이후 sourceDocument 속성이 다른 요청에 의해 먼저 바뀌면(속성 버전 드리프트), 본문은 이미 저장됐어도 ConflictError를 던진다"는 시나리오. 기존 "버전이 일치하면 doc을 갱신한다" 테스트도 `client.getPageProperty` 모킹과 `upsertSpy`의 4번째 인자(`{ expectedVersion }`) 기대값을 추가해 갱신한다.
- [ ] **Step 6**: `documents.ts`의 `updateDocument` 수정.
  - `getPageOrThrow(input.pageId)`와 `getPageProperty(input.pageId, SOURCE_DOCUMENT_PROPERTY_KEY)`를 `Promise.all`로 함께 먼저 가져온다.
  - 기존 페이지 버전 검사는 그대로 유지.
  - `updatePage` 호출은 그대로 유지.
  - `upsertPageProperty` 호출에 `{ expectedVersion: sourceProperty?.version.number ?? 0 }`을 넘긴다. `PropertyVersionConflictError`를 잡아 `ConflictError`(사용자에게 "문서 본문은 저장됐지만 편집 원본이 동시에 변경돼 반영하지 못했다"는 취지의 메시지)로 바꿔 던진다.
- [ ] **Step 7**: `npx vitest run src/lib/editor/documents.test.ts`로 통과 확인.
- [ ] **Step 8**: `npm test`(전체) + `npm run lint` + `npx tsc --noEmit` + `npm run build`로 회귀 없는지 확인.
