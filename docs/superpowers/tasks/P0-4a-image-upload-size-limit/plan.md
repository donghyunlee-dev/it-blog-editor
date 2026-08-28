# P0-4a: 이미지 업로드 최대 파일 크기를 제한한다 — 구현 계획

## Global Constraints
- 기존 `ValidationError`를 그대로 재사용한다(새 에러 타입 추가하지 않음) — `toErrorResponse`가 이미 400으로 매핑하는 경로.
- 검증 순서는 "파일 누락 → MIME 타입 → 크기"로, 기존 두 검사 이후에 추가한다(기존 에러 메시지·순서에 회귀 없음).
- `uploadAttachment`(Confluence 첨부파일 API 호출)는 크기 검사를 통과한 뒤에만 호출되어야 한다.

## Files
- Modify: `src/lib/editor/images.ts`
- Create: `src/lib/editor/images.test.ts` (기존에 테스트가 없던 파일 — 이번에 처음 추가)

## Steps
- [ ] **Step 1**: `images.ts`에 `MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024` 상수와 크기 검사를 추가한다. `file.size > MAX_IMAGE_SIZE_BYTES`이면 `ValidationError("이미지 파일 크기는 10MB를 초과할 수 없습니다.")`를 던진다.
- [ ] **Step 2**: `images.test.ts`를 신규 작성한다 — `uploadAttachment`(`@/lib/confluence/client`)를 모킹해 다음을 검증한다: 파일 누락 시 `ValidationError`, 허용되지 않는 MIME 타입 시 `ValidationError`, 10MB 초과 시 `ValidationError`이고 `uploadAttachment`가 호출되지 않음, 정확히 10MB(경계값)는 정상 통과, 10MB 이하 일반 파일은 정상 통과하고 `uploadAttachment`가 호출됨.
- [ ] **Step 3**: `npm test -- images.test.ts`로 검증 후, `npm test`(전체)·`npx tsc --noEmit`·`npm run lint`·`npm run build`로 회귀를 확인한다.
- [ ] **Step 4**: [Issue #2](https://github.com/sfood-pioneer-1st/sfood-it-editor/issues/2)를 닫고, [_pending-decisions.md](../_pending-decisions.md)의 P0-4a 행 상태를 "반영됨"으로 갱신한다.

각 Step은 `npm test -- images.test.ts`로 검증 가능한 단위로 쪼갰다.
