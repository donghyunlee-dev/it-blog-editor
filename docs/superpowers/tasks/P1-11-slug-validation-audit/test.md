# P1-11: 게시 설정 slug에 슬래시가 저장되던 사례 후속 확인 — 검증 기록

## 자동화 테스트
| 커맨드 | 결과 |
|---|---|
| `npx vitest run "src/lib/editor/publish.test.ts"` | 통과 (18/18 — 기존 테스트, 변경 없음) |

전체 테스트/lint/build는 이번 작업이 코드 변경을 전혀 포함하지 않아(문서만 수정) 별도로 재실행하지 않았다 — 위 `publish.test.ts` 실행으로 이 항목이 의존하는 회귀 테스트가 여전히 통과함을 확인한 것으로 충분하다고 판단했다.

## 수동 검증 (필요 시)
- `src/lib/editor/publish.ts`의 `SLUG_PATTERN`/`validateAndComposeViewers`를 직접 읽어 `"/root"`가 정규식에 매치되지 않아 거부됨을 확인했다.
- **2026-09-03**: 실제 Confluence 인스턴스 API(`GET /api/v2/pages/212959235/properties`)로 `publishMetadata` property를 직접 조회했다. 결과: `{ isPublished: true, publishedAt: "2026-08-28T08:31:56.357Z", viewers: { "tech-blog": { slug: "/root", metaDescription: "그런듯", publicSlug: "/root-51cda131-6bd4-449f-ace4-a73dc45f27ce" } } }` — 지금도 이 잘못된 slug 값으로 게시 중임을 직접 확인했다. 페이지 실제 URL: `https://sfoodxproject.atlassian.net/wiki/spaces/ITTECHBLOG/pages/212959235/51cda131-6bd4-449f-ace4-a73dc45f27ce`.

## 발견된 문제와 조치
없음 — 이번 작업 자체는 코드 버그가 아니라 감사였다. 다만 실데이터 확인 결과, "코드는 이미 고쳤으니 이 항목은 끝났다"고 성급히 결론 내리지 않고 실제 저장된 값까지 직접 재조회한 것이 이 작업의 핵심이었다(같은 문서의 P1-10은 재조회 결과 이미 정상이었던 반면, 이 slug 값은 여전히 비정상임을 실제로 구분해 확인했다).

## 검증 중 새로 발견한 결정 사항
- pageId `212959235`의 실제 `slug` 값을 정정할지, 게시를 취소할지 사용자에게 확인이 필요하다(`task.md` "결정이 필요한 사항" 참고). GitHub Issue는 등록하지 않았다 — 코드 변경이 필요한 결정이 아니라 사용자의 실제 Confluence 인스턴스에 쓰기 작업을 해도 되는지 묻는 1회성 승인 사항이라 대화로 확인하는 것이 적절하다고 판단했다.

## 후속 확인(2026-09-04)
사용자가 문제의 문서를 실제로 다시 게시해 slug를 정정했다("P1-11 이건 이제 의미 없어. 다
수정한 내용이야"). 성급히 그 말만 믿고 완료 처리하지 않고, 같은 방식(`GET /api/v2/pages/
212959235/properties`로 `publishMetadata` 직접 조회)으로 재확인했다. 결과:
`{ isPublished: true, publishedAt: "2026-09-03T05:01:42.265Z", viewers: { "tech-blog":
{ slug: "tech-news", metaDescription: "그런듯", publicSlug: "tech-news-51cda131-6bd4-449f-
ace4-a73dc45f27ce" } } }` — 슬래시가 없는 정상 slug로 바뀌어 있음을 확인했다.

## 최종 판정
- [x] 수용 기준(`task.md`)을 모두 만족함. pageId `212959235`의 실제 slug 정정도 사용자가
      완료했고 재조회로 확인했다 — PRD 갱신 가능
