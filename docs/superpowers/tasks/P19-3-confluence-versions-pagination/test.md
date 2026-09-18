# P19-3: 페이지네이션 404 수정 — 검증 기록

## 자동화 테스트
| 커맨드 | 결과 |
|---|---|
| `npx vitest run src/lib/confluence/client.test.ts` | 통과 (29 tests) |
| `npx eslint src/lib/confluence/client.ts src/lib/confluence/client.test.ts` | 통과(경고/오류 없음) |
| `npm run build` | 통과 |

## 수동 검증
실제 Confluence 인스턴스(`sfoodxproject.atlassian.net`, `.env`의 `CONFLUENCE_BASE_URL`)에
직접 요청을 보내 원인과 수정을 모두 실제 데이터로 확인했다.

1. **원인 확인**: `pageId=233439235`(버전 57개)로 `GET /api/v2/pages/{id}/versions?limit=50`을
   직접 호출 — `_links.next`가 `/wiki/api/v2/pages/233439235/versions?limit=50&cursor=...`로
   왔다(`_links.base`도 이미 `/wiki`를 포함한 `https://sfoodxproject.atlassian.net/wiki`).
   기존 코드는 이 값을 그대로 `baseUrl + next`로 이어붙여
   `https://sfoodxproject.atlassian.net/wiki/wiki/api/v2/...`가 되고, 이는 Confluence
   웹앱의 catch-all 404 페이지로 떨어져 사용자가 본 것과 동일한
   `ConfluenceApiError: Confluence API 호출 실패: 404 Not Found - <!DOCTYPE html>...` 오류를
   재현했다.
2. **v1 API(`listChildPages`)는 버그 없음 확인**: 계정 폴더(`223445038`)에
   `GET /rest/api/content/{id}/child/page?limit=2`(강제로 작은 limit)를 호출 —
   `_links.next`가 `/rest/api/content/223445038/child/page?next=true&...`로, `/wiki` 접두사가
   없는 순수 상대 경로임을 확인했다. 수정 대상에서 제외한 근거.
3. **수정 후 재검증**: 수정된 `listPageVersions("233439235")`를 실제 API로 직접 실행 —
   `total versions: 57`(수정 전이라면 두 번째 페이지에서 404로 예외가 났을 것)로, 커서를
   따라 전체 버전을 끝까지 정상적으로 모두 가져왔다.

## 발견된 문제와 조치
- **원인**: `listPageVersions`/`listFooterComments`가 Confluence v2 API의 `_links.next`(이미
  `CONFLUENCE_BASE_URL`의 path를 포함한 절대 경로)를 `confluenceRequest`에 그대로 넘겨
  `baseUrl + next`로 `/wiki`가 두 번 겹치는 URL을 만들었다.
- **조치**: `stripBaseUrlPathPrefix` 헬퍼로 `baseUrl`의 pathname 접두사를 제거한 뒤 넘기도록
  수정. 두 함수 모두 적용.
- **재검증 결과**: 실제 API로 57개 버전 문서를 끝까지 조회 성공(위 3번), 유닛 테스트 29개
  통과, 빌드 통과.

## 검증 중 새로 발견한 결정 사항
없음.

## 최종 판정
- [x] 수용 기준(`task.md`)을 모두 만족함 — PRD 갱신 가능
