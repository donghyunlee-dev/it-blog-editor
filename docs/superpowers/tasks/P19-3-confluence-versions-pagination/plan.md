# P19-3: 페이지네이션 404 수정 — 구현 계획

## Global Constraints
- `confluenceRequest`의 기존 계약("path는 baseUrl 기준 상대 경로")을 다른 모든 호출부에서
  깨지 않는다 — `listPageVersions`/`listFooterComments` 내부에서만 커서를 정규화한다.
- v1 API(`listChildPages`)는 이미 정상 동작하므로 건드리지 않는다.

## Files
- Modify: `src/lib/confluence/client.ts` — `stripBaseUrlPathPrefix` 헬퍼 추가,
  `listPageVersions`/`listFooterComments`의 커서 처리에 적용.
- Modify: `src/lib/confluence/client.test.ts` — 두 함수의 페이지네이션 테스트에서 `_links.next`
  목을 실제 Confluence처럼 `/wiki` 접두사를 포함한 절대 경로로 바꾸고(회귀 재현),
  `listFooterComments` 테스트를 새로 추가한다.

## Steps
- [x] **Step 1**: `stripBaseUrlPathPrefix(absolutePath)` 헬퍼 작성 — `new URL(baseUrl).pathname`을
      구해 `absolutePath`가 그 접두사로 시작하면 잘라낸다.
- [x] **Step 2**: `listPageVersions`/`listFooterComments`의 `cursor = page._links.next ?? null`을
      `cursor = page._links.next ? stripBaseUrlPathPrefix(page._links.next) : null`로 교체.
- [x] **Step 3**: 기존 `listPageVersions` 페이지네이션 테스트의 mock을 `/wiki` 접두사 포함
      형태로 갱신(회귀 재현), `listFooterComments` 페이지네이션 테스트 신규 추가.
      `npx vitest run src/lib/confluence/client.test.ts`.
- [x] **Step 4**: 실제 Confluence 인스턴스로 57개 버전 문서를 직접 조회해 수정 전/후 동작
      비교(스크립트, `test.md` 참고).
- [x] **Step 5**: `npx eslint`, `npm run build`.
