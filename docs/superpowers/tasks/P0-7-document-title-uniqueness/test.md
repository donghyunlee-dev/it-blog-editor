# P0-7: Confluence 페이지 title 충돌로 인한 문서 생성 실패를 막는다 — 검증 기록

## 자동화 테스트
| 커맨드 | 결과 |
|---|---|
| `npx vitest run src/lib/editor/documents.test.ts` | 통과 |
| `npm test`(전체) | 통과(P0-5b와 함께 검증 — [P0-5b-slug-structural-uniqueness/test.md](../P0-5b-slug-structural-uniqueness/test.md)의 최종 카운트 참고) |
| `npx tsc --noEmit` | 통과 |
| `npm run lint` | 통과 — 에러 0, 경고 2(기존 무관 경고) |
| `npm run build` | 통과 |

## 수동 검증

### 실제 Confluence 인스턴스 검증 (2026-08-28, 사용자 승인)
사용자에게 "임시 페이지를 만들어 검증해도 되는지" 명시적으로 확인받은 뒤 진행했다. 절차(스크립트: `p0-7-title-collision-spike.mjs`, 세션 스크래치패드에 임시 작성 후 실행 — 리포지토리에는 커밋하지 않음):

1. 임시 부모 페이지 2개(서로 다른 "계정 폴더" 역할)를 Space 홈페이지 하위에 생성.
2. 부모 1 밑에 제목 `"회의록-스파이크-테스트"`로 문서 생성 → **200 성공**.
3. 부모 2 밑에 **같은 제목**으로 문서 생성 시도 → **400 실패**, 응답: `"A page with this title already exists: A page already exists with the same TITLE in this space"`.
4. 부모 1, 부모 2 밑에 각각 `randomUUID()` 제목으로 문서 생성 → **둘 다 200 성공**.
5. 생성된 페이지 5개 모두 즉시 trash + purge(영구 삭제)로 정리.

결과: 이 프로젝트가 고치려는 버그(서로 다른 계정 폴더 밑에서도 같은 제목이면 Confluence가 거부함)가 실제 인스턴스에서 정확히 재현됐고, 고안한 해법(제목을 `randomUUID()`로 대체)이 실제로 충돌을 없앤다는 것도 같은 인스턴스로 확인했다.

### 부수 발견 (범위 밖, PRD에 별도 기록)
같은 인스턴스를 조사하던 중 `donghyun.lee@s-food.com` 계정 폴더 밖(Space 홈페이지 바로 아래)에 이 앱이 만든 것이 분명한 문서(pageId `212959235`, `authorMeta`/`sourceDocument`/`publishMetadata` 모두 존재)가 있는 것을 발견했다. 사용자가 "삭제 후 복원했는데 계정 안이 아니라 최상위로 갔다"고 원인을 추정했고, 이번 작업과는 무관한 별개의 복원(P1-2b) 버그로 판단해 PRD의 P1-10/P1-11로 분리 기록했다(이번 커밋에서는 건드리지 않음).

## 발견된 문제와 조치
없음.

## 검증 중 새로 발견한 결정 사항
없음 — 이 항목 자체의 구현 방향은 사용자가 대화 중 직접 결정했다(`task.md` 참고).

## 최종 판정
- [x] 수용 기준(`task.md`)을 모두 만족함 — PRD 갱신 가능
