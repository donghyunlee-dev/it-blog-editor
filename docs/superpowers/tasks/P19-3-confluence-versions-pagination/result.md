# P19-3: 페이지네이션 404 수정 — 구현 결과

## 구현 내용
- `src/lib/confluence/client.ts`에 `stripBaseUrlPathPrefix(absolutePath)` 헬퍼 추가 —
  `CONFLUENCE_BASE_URL`의 pathname(예: `/wiki`)이 `absolutePath` 앞에 붙어 있으면 잘라내
  `confluenceRequest`가 기대하는 "baseUrl 기준 상대 경로"로 되돌린다.
- `listPageVersions`/`listFooterComments`의 커서 처리를 `page._links.next ?? null`에서
  `page._links.next ? stripBaseUrlPathPrefix(page._links.next) : null`로 교체 — 두 함수 모두
  Confluence v2 API를 쓰고 같은 페이지네이션 패턴을 공유한다.
- `listChildPages`(v1 API)는 실제 API로 직접 확인해 `_links.next`가 이미 순수 상대 경로임을
  검증하고 변경하지 않았다.

## 파일 변경 내역
| 파일 | 변경 사항 |
|------|---------|
| `src/lib/confluence/client.ts` | `stripBaseUrlPathPrefix` 추가, 두 페이지네이션 함수에 적용 |
| `src/lib/confluence/client.test.ts` | `listPageVersions` 페이지네이션 테스트를 실제 API처럼 `/wiki` 접두사 포함 mock으로 교체(회귀 재현), `listFooterComments` 페이지네이션 테스트 신규 추가 |

## 커밋 내역
| SHA | 메시지 |
|-----|--------|
| `b62f009` | fix: 버전 50개/댓글 100개 초과 시 페이지네이션이 404로 깨지는 문제 수정 (P19-3) |

## 자체 검토 (Self-Review)
### 긍정 사항
- 추측이 아니라 실제 Confluence 인스턴스(`sfoodxproject.atlassian.net`)에 직접 요청을 보내
  `_links.next`의 실제 형태를 확인하고, 수정 전/후 동작을 57개 버전짜리 실제 문서로
  검증했다(아래 `test.md`).
- 같은 파일 안에서 같은 버그 패턴을 쓰는 다른 함수(`listFooterComments`)도 찾아 함께
  고쳐, "댓글 100개 넘는 문서에서 똑같이 크래시"하는 잠재적 후속 버그를 미리 막았다.
- 기존 테스트가 왜 이 버그를 못 잡았는지(비현실적인 mock)까지 확인하고 mock 자체를
  실제 응답 형태로 고쳐, 같은 종류의 회귀가 다시 조용히 통과하지 않게 했다.

### 주의사항
- `stripBaseUrlPathPrefix`는 `CONFLUENCE_BASE_URL`의 pathname이 `_links.next`의 접두사와
  정확히 일치한다는 가정에 의존한다 — 만약 나중에 Confluence가 `_links.base`를 다른 값으로
  바꾸면(현재는 baseUrl과 동일) 재검토가 필요할 수 있다.

### 우려사항
- 없음.
