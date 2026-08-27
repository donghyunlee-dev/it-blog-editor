# P0-2: 게시취소 확인 모달 — 검증 기록

## 자동화 테스트
| 커맨드 | 결과 |
|---|---|
| `npx vitest run src/components/editor/PublishForm.test.tsx`(구현 전, TDD red) | 3건 실패(의도됨) |
| `npx vitest run src/components/editor/PublishForm.test.tsx`(구현 후) | 통과 (9/9, 신규 3건 포함) |
| `npm test`(전체) | 통과 (141/141 — 변경 전 138/138에서 3건 순증) |
| `npx tsc --noEmit` | 통과 |
| `npm run lint` | 통과 — 에러 0, 경고 2(기존 무관 경고) |
| `npm run build` | 통과 |

## 수동 검증
P0-1a와 같은 이유(이 환경의 Browser 프리뷰가 로컬 dev 서버 `navigate`를 거부함)로 실제
브라우저 클릭 검증은 하지 못했다. 대신 `userEvent`로 실제 클릭 시퀀스를 재현하는 통합
테스트로 대체했다:
- 이미 게시된 문서 → 게시함 스위치 클릭 → 확인 Modal 노출, PATCH 미호출, 스위치는 여전히
  `aria-checked="true"`
- 확인 Modal에서 "게시 취소" 클릭 → PATCH 호출(`isPublished: false`)
- 확인 Modal에서 "취소" 클릭 → Modal 닫힘, PATCH 미호출, 스위치 여전히 켜짐
- 아직 게시되지 않은 문서 → 게시함 스위치 클릭 → 확인 Modal 없이 즉시 PATCH 호출

## 발견된 문제와 조치
- **원인**: 기존 "저장에 실패하면..." 테스트가 `initial.isPublished: true` 상태에서 게시함
  스위치를 눌러 즉시 PATCH를 기대했는데, 이 작업으로 그 클릭이 이제 확인 Modal만 열고
  PATCH를 보내지 않아 테스트가 깨졌다.
- **조치**: 그 테스트에 "게시 취소" 버튼 클릭 단계를 추가해 확인 절차를 통과하도록 갱신했다.
- **재검증 결과**: 전체 통과(위 표 참고). 의도된 회귀 방지 효과였다 — 이 테스트가 정확히
  "이미 게시된 문서를 끄는" 시나리오였기 때문에, 변경 없이 두면 실제로는 확인 없이
  즉시 게시취소되는 옛 동작을 계속 검증하는 셈이 되어 이번 작업의 목적과 모순됐을 것이다.

## 검증 중 새로 발견한 결정 사항
없음.

## 최종 판정
- [x] 수용 기준(`task.md`)을 모두 만족함 — PRD 갱신 가능.
