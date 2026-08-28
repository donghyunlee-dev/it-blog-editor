# P0-5b: slug 조회를 구조적으로 해결한다 — 검증 기록

## 자동화 테스트
| 커맨드 | 결과 |
|---|---|
| `npx vitest run src/lib/confluence/client.test.ts src/lib/editor/documents.test.ts src/lib/editor/publish.test.ts` | 통과(47/47) |
| `npm test`(전체) | 통과(219/219 — 변경 전 224/224에서 제거된 slug 캐시 테스트 5건만큼 순감, 새 `publicSlug` 검증 테스트 등으로 상쇄) |
| `npx tsc --noEmit` | 통과(처음 시도에서 `PublishViewerMetadata`에 `publicSlug`를 필수로 넣었다가 입력 타입까지 오염시킨 오류를 잡아, `PublishViewerInput`으로 분리해 해결 — "발견된 문제와 조치" 참고) |
| `npm run lint` | 통과 — 에러 0, 경고 2(기존 무관 경고) |
| `npm run build` | 통과 |

## 수동 검증
핵심 가정(내부 고유키의 전역 유일성)에 대한 실제 인스턴스 검증은 P0-7 쪽에서 수행했다 — [P0-7-document-title-uniqueness/test.md](../P0-7-document-title-uniqueness/test.md) 참고(같은 `randomUUID()` 값을 이 항목의 `publicSlug` 계산에도 그대로 재사용하므로 별도로 다시 검증할 필요는 없다고 판단했다).

`publicSlug` 조합 로직(`${slug}-${internalKey}`) 자체는 순수 문자열 연산이라 mock 기반 단위 테스트로 충분하다 — 실제 Confluence 응답 형태에 대한 새로운 가정이 없다.

## 발견된 문제와 조치
- **원인**: `PublishViewerMetadata`에 `publicSlug: string`을 필수 필드로 추가했는데, 이 타입을 `SetPublishStateInput.viewers`(클라이언트가 보내는 입력값 — 아직 `publicSlug`가 있을 수 없음)에도 그대로 썼다. `npx tsc --noEmit`이 `publish.test.ts`(4곳)와 `publish/route.test.ts`(1곳)에서 "publicSlug가 없다" 오류를 냈다.
- **조치**: `PublishViewerInput`(`{slug, metaDescription}`)을 새로 분리하고 `PublishViewerMetadata extends PublishViewerInput`으로 바꿔, 입력 타입과 저장/응답 타입을 구분했다. `SetPublishStateInput.viewers`와 `publish/route.ts`의 요청 페이로드 타입을 `PublishViewerInput`으로 바꿨다.
- **재검증 결과**: `npx tsc --noEmit` 통과. 나머지 실패했던 테스트 픽스처(`publish.test.ts`/`route.test.ts`)에는 `publicSlug` 값을 채워 넣어 통과시켰다.

## 검증 중 새로 발견한 결정 사항
없음.

## 최종 판정
- [x] 수용 기준(`task.md`)을 모두 만족함 — PRD 갱신 가능
