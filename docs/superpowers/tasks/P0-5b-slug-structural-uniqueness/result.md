# P0-5b: slug 조회를 구조적으로 해결한다 — 구현 결과 보고서

## 구현 내용
`src/lib/confluence/client.ts`에서 P0-5a의 TTL 캐시 기반 slug 스캔(`findPublishedPageBySlug`/`buildSlugIndex`/`invalidateSlugIndexCache`/`__resetSlugIndexCacheForTests`)과, 이제 유일한 호출부를 잃은 `listAllSpacePages`를 통째로 제거했다.

`src/lib/editor/publish.ts`는 `assertNoSlugConflict`(Space 전체를 스캔해 충돌을 찾던 함수)를 `validateAndComposeViewers`로 대체했다 — 스캔 없이 필수값만 검증하고, `publicSlug = "${slug}-${internalKey}"`를 계산해 채운다. `internalKey`는 P0-7에서 도입한, 문서 생성 시 발급된 전역 유일 Confluence page title이다(`setPublishState`가 이미 조회해둔 `currentPage.title`을 그대로 넘긴다 — 추가 조회 없음).

타입은 클라이언트 입력(`PublishViewerInput` = `{slug, metaDescription}`)과 서버 저장/응답(`PublishViewerMetadata` = 입력 + `publicSlug`)을 분리했다 — 처음엔 하나의 타입으로 합쳤다가 `tsc`가 여러 테스트 파일에서 "publicSlug가 없다"는 오류를 내면서 잘못된 설계였음을 바로 알게 됐다(입력값에는 애초에 `publicSlug`가 있을 수 없다).

`PublishForm.tsx`는 slug 입력 아래에 서버가 계산한 실제 공개 경로(`publicSlug`)를 읽기 전용으로 안내한다 — 사용자가 입력한 값 그대로가 최종 URL이 아니라는 걸 알 수 있게 했다.

## 파일 변경 내역
| 파일 | 변경 사항 |
|------|---------|
| `src/lib/confluence/client.ts` | slug 인덱스/캐시 전체 및 `listAllSpacePages` 제거 |
| `src/lib/confluence/client.test.ts` | 제거된 함수의 테스트(`findPublishedPageBySlug` 2건, 캐시 3건) 삭제, import 정리 |
| `src/lib/editor/publish.ts` | `PublishViewerInput`/`PublishViewerMetadata` 타입 분리, `assertNoSlugConflict` → `validateAndComposeViewers`(스캔 제거, `publicSlug` 계산 추가) |
| `src/lib/editor/publish.test.ts` | slug 중복 테스트 제거, `publicSlug` 계산 검증 테스트로 교체, 나머지 테스트에서 `findPublishedPageBySlug`/`invalidateSlugIndexCache` 스텁 제거 |
| `src/app/api/editor/documents/[pageId]/publish/route.ts`, `route.test.ts` | 요청 페이로드 타입을 `PublishViewerInput`으로 변경, 응답 mock에 `publicSlug` 추가 |
| `src/components/editor/PublishForm.tsx` | `ViewerMetadata`에 읽기 전용 `publicSlug?` 추가, 안내 텍스트 표시 |
| `docs/product/data-spec.md`, `docs/product/api-spec.md` | `publicSlug` 필드 문서화, slug 유니크 제약을 "구조적으로 불가능"으로 재설명, 409(slug 중복) 케이스 제거 |

P0-7과 공유하는 파일 변경(문서 title 구조)은 [P0-7-document-title-uniqueness/result.md](../P0-7-document-title-uniqueness/result.md) 참고.

## 커밋 내역
| SHA | 메시지 |
|-----|--------|
| `d12fa92` | fix: prevent Confluence page title collisions and make slugs structurally unique |

## 자체 검토 (Self-Review)
### 긍정 사항
- Space 전체 스캔이라는 근본 문제를 "더 빠른 스캔"이 아니라 "스캔 자체를 없애는" 방식으로 풀어서, P0-5a의 TTL 캐시가 갖고 있던 정합성 위험(다른 프로세스가 TTL 안에 게시한 slug를 놓칠 수 있음)까지 함께 사라졌다.
- 이슈에서 세 번 오간 논의(CQL 실현 가능성 조사 → 계정별 인덱스 설계 제안 → 최종 방향 전환)를 모두 기록으로 남겨, 왜 이 방향으로 왔는지 나중에도 추적 가능하다.
- 타입을 잘못 설계했던 실수(입력/저장 타입 미분리)를 `tsc`가 즉시 잡아줘서 배포 전에 고쳤다.

### 주의사항
- 이 변경으로 게시된 문서의 **공개 URL 형식이 바뀐다**(`slug` → `slug-내부고유키`). 이 저장소 밖의 Tech Blog Viewer 프로젝트가 이 형식에 맞춰 URL 파싱 로직을 갖춰야 하는데, 그 프로젝트는 이번 작업 범위 밖이다 — `api-spec.md`/`data-spec.md`에 계약 변경을 문서화해뒀지만, 실제 Viewer 코드 반영 여부는 확인하지 못했다.
- 기존에 이미 게시된 문서가 있다면 `publicSlug`가 없는 상태로 남는다(재게시하기 전까지) — 실사용 게시 문서가 없다고 판단해 마이그레이션은 다루지 않았다.

### 우려사항
- 없음(Viewer 쪽 반영은 이 저장소가 통제할 수 있는 범위가 아니라 "우려"보다는 "인수인계 필요 사항"에 가깝다).
