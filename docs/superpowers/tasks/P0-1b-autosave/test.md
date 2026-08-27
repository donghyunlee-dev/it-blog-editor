# P0-1b: 자동 저장 도입 — 검증 기록

## 자동화 테스트
| 커맨드 | 결과 |
|---|---|
| `npx vitest run src/lib/editor/autosave-storage.test.tsx`(구현 전, TDD red) | 전체 실패(모듈 없음 — 의도됨) |
| `npx vitest run src/lib/editor/autosave-storage.test.tsx`(구현 후) | 통과 (6/6) |
| `npx vitest run src/components/editor/DocumentEditor.test.tsx`(구현 전, TDD red) | 신규 6건 중 4건 실패(의도됨) |
| `npx vitest run src/components/editor/DocumentEditor.test.tsx`(구현 후, 1차) | 3건 타임아웃(가짜 타이머 설정 문제 — 아래 "발견된 문제" 참고) |
| `npx vitest run src/components/editor/DocumentEditor.test.tsx`(구현 후, 최종) | 통과 (26/26) |
| `npm test`(전체) | 통과 (172/172 — 변경 전 160/160에서 12건 순증) |
| `npx tsc --noEmit` | 통과 |
| `npm run lint`(1차) | `react-hooks/set-state-in-effect` 에러 1건 |
| `npm run lint`(최종) | 통과 — 에러 0, 경고 2(기존 무관 경고) |
| `npm run build` | 통과 |

## 수동 검증
이 환경의 Browser 프리뷰가 로컬 dev 서버 접속을 거부해(이전 작업들과 동일한 제약) 실제
1분을 기다려 자동 저장이 동작하는 모습을 눈으로 확인하지는 못했다. 대신 `vi.useFakeTimers()`
로 60초 경과를 시뮬레이션하는 통합 테스트 6개로 다음을 확인했다:
- 변경사항이 있으면 60초 뒤 PUT이 나가고, 태그 요청은 나가지 않는다.
- 변경사항이 없으면 60초가 지나도 아무 요청도 나가지 않는다.
- 자동 저장 성공 시 localStorage 임시본이 지워진다.
- 자동 저장 실패 시 임시본이 남고 경고 토스트가 뜬다.
- 서버 최종 수정 시각보다 최신인 임시본이 있으면 복구 모달이 뜨고, 복구 시 값이 반영된다.
- 오래된 임시본은 조용히 지워지고 모달이 뜨지 않는다.

## 발견된 문제와 조치
1. **원인**: `vi.useFakeTimers()`를 컴포넌트 마운트(그리고 `setInterval` 등록) **이후에**
   호출해, 이미 실제 타이머로 등록된 자동 저장 인터벌이 가짜 시계의 통제를 받지 못했다
   — `vi.advanceTimersByTimeAsync(60_000)`를 해도 아무 일도 일어나지 않았다(관련 테스트
   3개가 `expect(...).toBeDefined()`류 단언에서 실패).
   **조치**: `vi.useFakeTimers()`를 `render()` **이전**으로 옮기고, `userEvent.setup({ delay:
   null })`로 내부 지연 없이 타이핑하도록 바꿨다.
2. **원인**: 위 조치 직후에는 반대로 테스트 3개가 5초 타임아웃으로 실패했다 —
   `vi.useFakeTimers()`를 인자 없이 켜면 `setTimeout` 등 React 19 스케줄러가 내부적으로
   쓰는 타이머까지 가짜가 되어 렌더링 자체가 멈췄다.
   **조치**: `vi.useFakeTimers({ toFake: ["setInterval", "clearInterval"] })`로 정확히
   필요한 두 API만 가짜로 바꿨다.
3. **원인**: `useEffect` 안에서 `setRecoverableSnapshot`을 호출하는 부분이
   `react-hooks/set-state-in-effect` lint 에러를 냈다(ThemeToggle.tsx/EditorShell.tsx와
   동일한 종류 — localStorage는 마운트 후에만 읽을 수 있어 의도된 2-pass 렌더링).
   **조치**: 같은 근거를 담은 주석과 함께 `eslint-disable-next-line`으로 억제했다.

## 검증 중 새로 발견한 결정 사항
없음 — Issue #1의 확정 조건을 그대로 구현했다.

## 후속 조치 — 실사용 가시성 확인(2026-08-27)
| 커맨드 | 결과 |
|---|---|
| `npx vitest run src/components/editor/DocumentEditor.test.tsx`(진단 로그+성공 토스트 추가 후) | 통과 (26/26) |
| `npx vitest run src/components/editor/DocumentEditor.test.tsx`(진단 로그 제거, 토스트 유지 후) | 통과 (26/26) |
| `npm test`(전체) | 통과 (172/172, 변동 없음) |
| `npx tsc --noEmit` | 통과 |
| `npm run lint` | 통과 |
| `npm run build` | 통과 |

사용자가 실제 dev 서버에서 재확인해 "이제 보인다"고 확인했다 — 토스트 추가가 문제를
해결했다(`result.md`의 "후속 조치" 참고). 진단용 로그는 요청대로 제거했다.

## 최종 판정
- [x] 수용 기준(`task.md`)을 모두 만족함 — PRD 갱신 가능. Issue #1을 닫는다.
- [x] 실사용 가시성 문제(자동 저장 성공 토스트 부재)를 사용자 확인으로 해결함.
