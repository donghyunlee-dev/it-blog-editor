# P0-8: 게시 여부를 폴더 이동이 아니라 property만으로 관리하도록 단순화한다 — 검증 기록

## 자동화 테스트
| 커맨드 | 결과 |
|---|---|
| `npm test`(전체) | 통과 (218/218) |
| `npx tsc --noEmit` | 통과 |
| `npm run lint` | 통과 — 에러 0, 경고 2(기존 무관 경고) |
| `npm run build` | 통과 — 기존 라우트 전체 정상 등록(`/api/editor/documents/[pageId]/publish`, `/api/editor/documents/[pageId]/restore` 포함) |

## 수동 검증
실제 Confluence 인스턴스 검증은 하지 않았다. 이번 변경이 사용하는 Confluence API 동작(페이지 제한 적용/해제, content property 읽기/쓰기, `movePage`가 계정 폴더로 페이지를 이동시키는 것)은 모두 이전 작업에서 이미 실제 인스턴스로 검증된 것들이다:

- restriction 적용/해제와 그 독립성(형제 페이지로 새지 않음)은 2026-08-21/25 스파이크에서 확인됨(`docs/superpowers/specs/2026-08-21-confluence-content-structure-design.md` "검증이 필요한 가정" 참고).
- `movePage`가 트래시된 페이지를 포함해 임의의 부모로 이동시키는 것은 P1-2b 검증에서 확인됨.
- 문서 생성 시 내부 고유키(title)와 `sourceDocument`/`publishMetadata` property 읽기/쓰기는 P0-7/P0-5b 검증에서 확인됨.

이번 작업은 이 primitive들을 **새로운 조합**(이동 없이 restriction만 토글)으로 쓸 뿐, Confluence API에 대한 새로운 가정을 추가하지 않는다고 판단해 별도 실제 인스턴스 검증은 생략했다.

## 발견된 문제와 조치
없음.

## 검증 중 새로 발견한 결정 사항
없음 — 방향은 사용자가 대화로 직접 결정했다(`task.md` 참고).

## 최종 판정
- [x] 수용 기준(`task.md`)을 모두 만족함 — PRD 갱신 가능
