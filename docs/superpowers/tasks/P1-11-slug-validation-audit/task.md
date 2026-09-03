# P1-11: 게시 설정 slug에 슬래시가 저장되던 사례 후속 확인

## 배경
- P1-10과 같은 문서(pageId `212959235`)에서 함께 발견된 사례. 게시 설정의 slug 값에 `"/root"`처럼 슬래시가 포함된 값이 실제로 저장돼 있었다 — 당시(2026-08-28) `publish.ts`의 `validateAndComposeViewers`는 빈 값만 걸러내고 형식은 검증하지 않았다.
- 이후 2026-08-31 P1-6c(slug 형식 검증)가 진행되면서, 이 P1-11 사례가 실제 필요성을 뒷받침하는 근거로 이미 인용됐다 — `docs/product/prd.md`의 P1-6c 항목과 `src/lib/editor/publish.test.ts`가 이를 확인해준다.

## 수용 기준 (Acceptance Criteria)
- [x] 현재 `publish.ts`의 `validateAndComposeViewers`가 실제로 `"/root"`류 슬래시 포함 값을 거부하는지 코드로 확인한다.
- [x] 이 사례를 재현하는 회귀 테스트가 이미 있는지 확인한다.
- [x] 코드 측면에서 이 항목이 P1-6c로 이미 완전히 해소됐음을 PRD에 명시한다.
- [x] pageId `212959235`에 실제로 `slug: "/root"` 값이 지금도 남아있는지 실제 Confluence 인스턴스 API로 직접 재확인한다. **2026-09-03**: `GET /api/v2/pages/212959235/properties`로 `publishMetadata` property를 직접 조회했다 — 여전히 `{ isPublished: true, viewers: { "tech-blog": { slug: "/root", metaDescription: "그런듯", publicSlug: "/root-51cda131-6bd4-449f-ace4-a73dc45f27ce" } } }`로 남아있다. P1-10(위치 문제)과 달리 이 문제는 실데이터에 여전히 살아있음을 확인했다 — P1-6c의 검증은 향후 신규 입력만 막을 뿐 기존에 저장된 값을 소급 수정하지 않으므로 당연한 결과다.
- [ ] pageId `212959235`에 실제로 저장된 `slug: "/root"` 값 자체를 정정(또는 게시 취소)하는 작업 — 실제 Confluence 인스턴스에 쓰기 작업이 필요해 사용자 승인 없이는 진행하지 않는다. **(사용자 확인 대기 중)**

## 결정이 필요한 사항
- [ ] pageId `212959235`의 실제 slug 값을 정정할지, 아니면 게시 자체를 취소할지 — 사용자에게 확인이 필요하다. (P1-10의 위치 문제는 이미 실데이터가 정상임을 확인해 별도 조치가 필요 없었다 — 이 항목만 남았다.)

## 범위 밖
- slug 검증 로직 자체의 개선(P1-6c)은 이미 완료된 별도 작업이라 다시 다루지 않는다.
