# P1-6b: 태그 형식·길이·개수 상한을 서버에서 검증한다 — 구현 계획

## Global Constraints
- 기존 `ValidationError`를 재사용한다.
- `setTags`의 기존 동작(대소문자 무시 비교, 추가/삭제 계산)은 그대로 두고 검증만 앞에 추가한다.

## Files
- Modify: `src/lib/editor/tags.ts`
- Modify: `src/lib/editor/tags.test.ts`(있으면 확인 후 추가, 없으면 신규)

## Steps
- [ ] **Step 1**: `tags.ts`에 `MAX_TAG_COUNT = 20`, `MAX_TAG_LENGTH = 50`, `FORBIDDEN_TAG_CHARS = /[:?@]/` 상수를 추가하고, `setTags` 시작 부분에 개수/길이/빈 문자열/금지 문자 검사를 추가한다.
- [ ] **Step 2**: `addLabels` 호출을 try/catch로 감싸 `ConfluenceApiError`(400)를 `ValidationError`로 변환한다.
- [ ] **Step 3**: 테스트 추가 — 21개 태그(개수 초과), 51자 태그(길이 초과, 경계값 50자는 통과), 빈 문자열/공백만 있는 태그, 금지 문자 포함 태그, Confluence가 400을 반환하는 경우 ValidationError로 변환되는지.
- [ ] **Step 4**: `npm test -- tags.test.ts`로 검증 후 `npm test`(전체)·`npx tsc --noEmit`·`npm run lint`·`npm run build`로 회귀를 확인한다.

각 Step은 `npm test -- tags.test.ts`로 검증 가능한 단위로 쪼갰다.
