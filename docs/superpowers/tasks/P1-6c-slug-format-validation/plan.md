# P1-6c: slug 형식 검증 — 구현 계획

## Global Constraints
- 기존 빈 값 검증("뷰어(${viewerId})의 slug와 metaDescription은 필수입니다.")을 형식 검증보다 먼저 수행한다 — 순서를 바꾸면 빈 문자열이 형식 위반 메시지로 잘못 보고된다.
- 새 에러 타입을 만들지 않는다 — 기존과 동일하게 `ValidationError`(400).
- `tags.ts`의 P1-6b 검증(`assertValidTags`, 상수를 파일 상단에 주석과 함께 선언하는 스타일)과 동일한 패턴을 따른다.

## Task: `publish.ts`에 slug 형식 검증 추가
### Files
- `src/lib/editor/publish.ts` (수정)
- `src/lib/editor/publish.test.ts` (테스트 추가)

### Steps
- [ ] `publish.ts` 상단에 `SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/` 상수와 채택 근거 주석을 추가한다.
- [ ] `validateAndComposeViewers` 안, 빈 값 검사 다음에 `SLUG_PATTERN.test(meta.slug)`가 거짓이면 `ValidationError(`뷰어(${viewerId})의 slug 형식이 올바르지 않습니다. 소문자 영숫자와 하이픈(-)만 사용할 수 있습니다.`)`를 던진다.
- [ ] 테스트: `/root`(슬래시), 대문자 포함, 언더스코어 포함, 공백 포함, 하이픈으로 시작/끝, 하이픈 연속 — 각각 거부되는지 확인한다.
- [ ] 테스트: `my-first-post`, `a`, `react-19-review`(숫자 포함) 등 정상 케이스가 통과하는지 확인한다.
- [ ] 전체 테스트·`tsc`·`lint`·`build` 재확인.
