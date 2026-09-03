# P1-10: 삭제된 문서 복구 시 Space 최상위로 이동하던 사례 후속 조치 — 검증 기록

## 자동화 테스트
| 커맨드 | 결과 |
|---|---|
| `npx vitest run "src/lib/editor/deleted-documents.test.ts"` | 통과 (8/8, 기존 테스트 그대로 — 주석만 추가) |
| `npm test` (전체) | 통과 (328/328) |
| `npm run lint` | 통과 (기존 무관 경고 2건만 남음) |
| `npm run build` | 통과 |

## 수동 검증 (필요 시)
- `git show 469c3bb^1:src/lib/editor/deleted-documents.ts`, `git show 469c3bb^1:src/lib/editor/folder.ts`로 P0-8 이전 구현을 직접 읽어 확인했다(결과는 `result.md` 참고).
- pageId `212959235` 자체를 실제 Confluence 인스턴스에서 조회·이동하는 검증은 하지 않았다 — 사용자 승인 대기 중.

## 발견된 문제와 조치
없음 — 코드 버그가 아니라 문서화·감사 작업이었다.

## 검증 중 새로 발견한 결정 사항
- pageId `212959235`를 실제로 계정 폴더로 옮길지 여부를 사용자에게 확인해야 한다(`task.md` "결정이 필요한 사항" 참고, GitHub Issue는 등록하지 않음 — 코드 변경이 필요한 결정이 아니라 이 세션이 사용자의 실제 Confluence 인스턴스에 쓰기 작업을 해도 되는지 묻는 1회성 승인 사항이라 이슈 트래커보다 대화로 확인하는 것이 적절하다고 판단).

## 최종 판정
- [x] 수용 기준(`task.md`)을 모두 만족함(단, pageId `212959235` 실제 정리는 사용자 승인 후 별도 진행) — PRD 갱신 가능
