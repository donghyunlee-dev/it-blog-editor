# P19-3: 문서 이력(버전 50개 초과) 페이지네이션 시 404 크래시 수정

## 배경
P19-1(문서 이력 전용 페이지) 실사용 검증 중, 버전이 57개인 실제 문서에서
`/editor/history/{pageId}`가 `ConfluenceApiError: Confluence API 호출 실패: 404 Not Found`로
크래시했다(사용자가 브라우저 스크린샷으로 제보). 실제 Confluence(`sfoodxproject.atlassian.net`)
API를 직접 호출해 원인을 확인했다 — `GET /api/v2/pages/{id}/versions`의 `_links.next`는
origin 기준 절대 경로(`/wiki/api/v2/pages/{id}/versions?cursor=...`)로 오는데, 이미
`CONFLUENCE_BASE_URL`(`https://sfoodxproject.atlassian.net/wiki`)의 path(`/wiki`)를 포함하고
있다. `confluenceRequest`는 항상 `baseUrl + path`로 URL을 만들기 때문에, 이 절대 경로를 그대로
다음 요청의 `path`로 넘기면 `/wiki`가 두 번 겹쳐(`.../wiki/wiki/...`) Confluence의 웹앱
catch-all이 404 HTML을 돌려준다. 기존 유닛 테스트는 `_links.next`를 `/wiki` 접두사 없이
목(mock)해 이 버그를 잡아내지 못했다.

같은 파일의 `listFooterComments`(v2 API, 댓글 100개 초과 시 페이지네이션)도 동일한 패턴이라
같은 버그를 갖고 있어 함께 고쳤다. `listChildPages`는 v1 API(`/rest/api/content/...`)를 쓰는데,
실제 API로 직접 확인한 결과 이 엔드포인트의 `_links.next`는 `/wiki` 접두사가 없는 진짜 상대
경로라 버그가 없다(수정 대상 아님).

## 수용 기준 (Acceptance Criteria)
- [x] `listPageVersions`가 50개를 초과하는 버전을 가진 문서에서도 전체 버전을 정상적으로
      끝까지 조회한다(페이지네이션 정상 동작).
- [x] `listFooterComments`도 같은 방식으로 100개를 초과하는 댓글에서 정상 동작한다.
- [x] 실제 Confluence 인스턴스(`sfoodxproject.atlassian.net`)의 버전 57개짜리 문서로 직접
      검증해 수정 후 57개 전부 조회됨을 확인한다.
- [x] `listChildPages`(v1 API)는 이미 정상 동작하므로 변경하지 않는다.

## 결정이 필요한 사항
없음.

## 범위 밖
- Confluence 클라이언트의 다른 v2 페이지네이션 호출(현재는 `listPageVersions`/
  `listFooterComments` 2곳뿐 — grep으로 확인)을 넘어선 일반적인 URL 빌더 리팩터링.
