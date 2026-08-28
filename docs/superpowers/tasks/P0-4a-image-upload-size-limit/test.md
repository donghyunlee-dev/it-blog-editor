# P0-4a: 이미지 업로드 최대 파일 크기를 제한한다 — 검증 기록

## 자동화 테스트
| 커맨드 | 결과 |
|---|---|
| `npx vitest run src/lib/editor/images.test.ts` | 통과 (5/5, 신규 — 이 파일의 첫 테스트) |
| `npm test`(전체) | 통과 (224/224 — 변경 전 219/219에서 5건 순증, 회귀 없음) |
| `npx tsc --noEmit` | 통과 |
| `npm run lint` | 통과 — 에러 0, 경고 2(기존 무관 경고: `postcss.config.js`/`tailwind.config.js`) |
| `npm run build` | 통과 — 기존 라우트 전체 정상 등록, `/api/editor/documents/[pageId]/images` 포함 |

## 수동 검증
실제 Confluence 인스턴스 검증은 하지 않았다. 이번 변경은 `registerImage`(자체 검증 함수) 안에서
파일 크기를 비교해 상한을 넘으면 `uploadAttachment`(Confluence 첨부파일 API 호출부) 자체를
호출하지 않는 순수 로컬 로직이다 — Confluence API의 응답 형태·동작에 대해 새로 검증해야 할
가정이 없다(P1-2a/P1-2b/P1-3처럼 실제 API 응답 구조나 재시도 동작을 확인해야 하는 경우와는
다르다). 따라서 mock 기반 단위 테스트(경계값 10MB 포함 5개 케이스)로 충분하다고 판단했다.

브라우저를 통한 실제 업로드 플로우(AX Auth 로그인 필요) 확인은 이전 항목들과 마찬가지로 이
환경에서 세션을 재현할 수 없어 수행하지 못했다 — 사용자가 실제 dev 서버에서 10MB를 초과하는
이미지를 붙여넣거나 드래그앤드롭해 안내 메시지(Toast)가 뜨는지 확인해볼 수 있다.

## 발견된 문제와 조치
없음.

## 검증 중 새로 발견한 결정 사항
없음 — Issue #2는 구현 완료 코멘트와 함께 닫았고, `_pending-decisions.md`도 갱신했다.

## 최종 판정
- [x] 수용 기준(`task.md`)을 모두 만족함 — PRD 갱신 가능
