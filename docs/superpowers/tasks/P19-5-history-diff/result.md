# P19-5: 이력 diff — 구현 결과

## 구현 내용
- `diff`(jsdiff) 라이브러리 추가 — `diffWordsWithSpace`로 단어 단위 순수 텍스트 diff 계산.
- `src/lib/confluence/client.ts`에 `getHistoricalPageBody(pageId, version)` 추가 — v2 버전
  상세 API는 본문을 포함하지 않아(실제 API로 확인), 본문을 주는 v1 레거시 API
  (`?status=historical&version=n&expand=body.storage`)를 대신 쓴다.
- `src/lib/editor/documents.ts`:
  - `storageHtmlToPlainText`: storage HTML을 블록 요소 경계에서 줄바꿈하는 순수 텍스트로 변환.
  - `getVersionDiff(pageId, versionNumber)`: 버전 1은 `null`(이전 버전 없음), 그 외에는
    현재 버전 본문(이미 조회해 둔 `getPage` 결과 재사용)과 그 이전 버전 본문
    (`getHistoricalPageBody`)을 비교해 diff 파트 배열을 반환. 존재하지 않는 버전 번호는
    `NotFoundError`.
- 신규 API: `GET /api/editor/documents/{pageId}/versions/{version}/diff`.
- `VersionHistoryPage.tsx`를 클라이언트 컴포넌트로 전환 — 각 버전(1 제외) 행에 "변경 내용
  보기" 버튼, 펼치면 온디맨드로 diff를 조회하고 결과를 캐시(같은 버전 재조회 방지). 추가는
  강조(`bg-success/15`), 삭제는 취소선(`bg-danger/15 line-through`)으로 구분.

## 파일 변경 내역
| 파일 | 변경 사항 |
|------|---------|
| `package.json`/`package-lock.json` | `diff` 의존성 추가 |
| `src/lib/confluence/client.ts` | `getHistoricalPageBody` 추가 |
| `src/lib/editor/documents.ts` | `storageHtmlToPlainText`/`VersionDiffPart`/`getVersionDiff` 추가 |
| `src/app/api/editor/documents/[pageId]/versions/[version]/diff/route.ts` | 신규 |
| `src/components/editor/VersionHistoryPage.tsx` | 클라이언트 전환, diff 펼치기 UI |
| `src/app/editor/history/[pageId]/page.tsx` | `pageId` prop 전달 |
| `src/lib/editor/documents.test.ts`, `src/components/editor/VersionHistoryPage.test.tsx` | 신규 테스트 |

## 커밋 내역
| SHA | 메시지 |
|-----|--------|
| `56cd124` | feat: 문서 이력에서 버전 간 변경 내용(diff) 보기 (P19-5) |
| `f439a87` | test: P19-5 diff 테스트 보강, page.tsx에 pageId prop 전달, plan.md 작성 |

## 자체 검토 (Self-Review)
### 긍정 사항
- diff 계산을 실제 Confluence 인스턴스(57개 버전 실제 문서)로 두 차례 검증했다 — 내용이
  같은 인접 버전 쌍(변경 없음 확인)과 실제로 코드가 추가된 버전 쌍(추가 부분 정확히
  식별) 둘 다 확인했다.
- 문서에 버전이 많아도 목록 로드 시 과거 본문을 전부 가져오지 않고, 펼칠 때만 온디맨드로
  조회해 성능 부담을 최소화했다.

### 주의사항
- `storageHtmlToPlainText`는 정규식 기반 태그 제거라 Confluence 매크로(`<ac:image>`,
  `<ac:structured-macro>` 등)의 속성값은 통째로 사라진다 — task.md에서 "리치 텍스트 구조
  diff는 범위 밖"으로 이미 정한 부분이라 의도된 동작이다.
- diff는 매 클릭마다 서버에 두 번의 Confluence API 호출(현재/이전 버전 본문, 또는
  이전 버전만)이 필요하다 — 캐시로 같은 버전 재클릭은 막았지만, 여러 버전을 연달아 펼쳐
  보면 그만큼 API 호출이 늘어난다. 문서 하나의 이력 화면에서 통상적으로 겪을 규모는
  아니라고 판단해 별도 배치 조회는 만들지 않았다.

### 우려사항
- 없음.
