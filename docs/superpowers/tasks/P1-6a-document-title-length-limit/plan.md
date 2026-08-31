# P1-6a: 문서 제목 길이 상한을 서버에서 검증한다 — 구현 계획

## Global Constraints
- 기존 `ValidationError`를 재사용한다(새 에러 타입 추가하지 않음).
- 검증 순서는 기존 "제목/본문 누락" 검사 바로 다음에 추가한다.

## Files
- Modify: `src/lib/editor/documents.ts`
- Modify: `src/lib/editor/documents.test.ts`

## Steps
- [ ] **Step 1**: `documents.ts`에 `MAX_TITLE_LENGTH = 200` 상수와 길이 검사를 `createDocument`/`updateDocument` 양쪽에 추가한다.
- [ ] **Step 2**: `documents.test.ts`에 테스트 추가 — 201자 제목이면 `ValidationError`, 정확히 200자(경계값)는 정상 통과(두 함수 모두).
- [ ] **Step 3**: `npm test -- documents.test.ts`로 검증 후 `npm test`(전체)·`npx tsc --noEmit`·`npm run lint`·`npm run build`로 회귀를 확인한다.

각 Step은 `npm test -- documents.test.ts`로 검증 가능한 단위로 쪼갰다.
