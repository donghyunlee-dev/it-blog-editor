# P1-1b: 문서 목록 정렬 옵션 — 검증 기록

## 자동화 테스트
| 커맨드 | 결과 |
|---|---|
| `npx vitest run src/components/editor/EditorSidebar.test.tsx`(구현 전, TDD red) | 2건 실패(의도됨), 1건은 이미 통과 |
| `npx vitest run src/components/editor/EditorSidebar.test.tsx`(구현 후) | 통과 (22/22, 신규 3건 포함) |
| `npm test`(전체) | 통과 (178/178 — 변경 전 175/175에서 3건 순증) |
| `npx tsc --noEmit` | 통과 |
| `npm run lint` | 통과 — 에러 0, 경고 2(기존 무관 경고) |
| `npm run build` | 통과 |

## 수동 검증
이 환경의 dev 서버 접속 제약(이전 작업들과 동일)으로 실제 브라우저 클릭 검증은 하지 못했다.
`userEvent.selectOptions`로 실제 드롭다운 선택을 재현하는 통합 테스트로 대체했다.

## 발견된 문제와 조치
문제는 없었다 — TDD로 먼저 실패하는 테스트를 작성하고(레드), 최소 구현으로 통과시켰다(그린).

## 검증 중 새로 발견한 결정 사항
없음.

## 최종 판정
- [x] 수용 기준(`task.md`)을 모두 만족함 — PRD 갱신 가능.
