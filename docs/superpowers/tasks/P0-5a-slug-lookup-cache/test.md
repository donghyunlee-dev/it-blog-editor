# P0-5a: slug 중복 검사 반복 비용을 캐시로 완화 — 검증 기록

## 자동화 테스트
| 커맨드 | 결과 |
|---|---|
| `npx vitest run src/lib/confluence/client.test.ts`(구현 전, TDD red) | 16건 전체 실패(모듈 import 자체가 깨짐 — 의도됨) |
| `npx vitest run src/lib/confluence/client.test.ts`(구현 후) | 통과 (16/16, 신규 3건 포함) |
| `npx vitest run src/lib/editor/publish.test.ts`(구현 전, TDD red) | 1건 실패(의도됨), 9건 통과 |
| `npx vitest run src/lib/editor/publish.test.ts`(구현 후) | 통과 (10/10) |
| `npm test`(전체) | 통과 (152/152 — 변경 전 148/148에서 4건 순증) |
| `npx tsc --noEmit` | 통과 |
| `npm run lint` | 통과 — 에러 0, 경고 2(기존 무관 경고) |
| `npm run build` | 통과 |

## 수동 검증
순수 서버 로직(캐시)이라 브라우저로 확인할 UI가 없다. 캐시 히트/무효화/TTL 만료 세
시나리오 모두 자동화 테스트(`client.test.ts`의 "findPublishedPageBySlug 캐시(P0-5a)"
describe 블록)로 fetch 호출 횟수를 직접 세어 검증했다 — 이것이 이 작업의 검증 기준
그 자체다.

## 발견된 문제와 조치
- **원인**: 모듈 레벨 캐시를 도입하면서, 기존 `findPublishedPageBySlug` 테스트 2개(둘 다
  spaceId="1", 서로 다른 fetch 대역을 기대)가 같은 프로세스 안에서 연달아 실행되면 두
  번째 테스트가 첫 번째 테스트의 캐시를 그대로 재사용해 잘못된 결과를 낼 수 있는 상태가
  됐다.
- **조치**: 테스트 전용 `__resetSlugIndexCacheForTests()`를 export하고 파일 최상단
  `beforeEach`에서 호출하도록 추가했다.
- **재검증 결과**: 기존 2개 테스트를 포함해 파일 전체(16개) 통과.

## 검증 중 새로 발견한 결정 사항
없음.

## 최종 판정
- [x] 수용 기준(`task.md`)을 모두 만족함 — PRD 갱신 가능. "알려진 한계"(다른
  프로세스의 TTL 내 게시를 못 볼 수 있음)는 의도적으로 받아들인 트레이드오프로
  `task.md`/`result.md`에 명시했다.
