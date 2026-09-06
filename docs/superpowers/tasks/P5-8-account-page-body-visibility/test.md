# P5-8: 계정 페이지 본문 가시성 — 검증 기록

## 자동화 테스트
| 커맨드 | 결과 |
|---|---|
| `npx vitest run src/lib/html-escape.test.ts` | 통과 (3/3) |
| `npx vitest run src/lib/confluence/client.test.ts` | 통과 (19/19) |
| `npx vitest run src/lib/editor/account.test.ts` | 통과 (16/16) |
| `npx vitest run src/lib/editor/account-index.test.ts` | 통과 (13/13) |
| `npx vitest run`(전체 스위트) | 통과 (54 파일 / 485건) |
| `npm run lint` | 통과(기존 경고 2건만) |
| `npx tsc --noEmit` | 통과(에러 없음) |
| `npm run build` | 통과(도메인 계층 변경이라 라우트 변화 없음) |

## 실제 Confluence 인스턴스 end-to-end 검증
테스트 계정(`donghyun.lee@s-food.com`)으로 실제 도메인 함수를 호출해 확인했다(검증 후
원래 이름/팀/접속 상태로 복원).
1. 변경 전 계정 폴더 페이지 본문 — 기존 안내 문장 한 줄뿐임을 확인.
2. `saveAccountMeta`로 이름을 `<script>안드레이</script>`, 팀을 `AX&팀`으로 저장(HTML
   이스케이프 확인용 의도적 특수문자) → 본문을 다시 조회해 `&lt;script&gt;안드레이
   &lt;/script&gt;`, `AX&amp;팀`으로 안전하게 이스케이프돼 있음을 확인(원본 `<script>` 태그가
   그대로 삽입되지 않음).
3. `setAccessEnabled`로 접속을 차단 → 본문의 "접속 허용" 칸이 "차단"으로 바뀜을 확인. 다시
   허용으로 되돌림.
4. 이름·팀을 원래 값("안드레이"/"AX팀")으로 복원 → 본문도 정상 값으로 돌아옴을 확인.
5. "계정 관리" 페이지 본문도 위 변경들에 맞춰 전체 목록 표(이메일·이름·팀·접속)가 자동으로
   갱신돼 있음을 확인.

## 발견된 문제와 조치
없음.

## 검증 중 새로 발견한 결정 사항
없음 — "본문에 스냅샷을 보여준다"는 방식 자체가 사용자의 명시적 요청이었다.

## 최종 판정
- [x] 수용 기준(`task.md`)을 모두 만족함 — PRD 갱신 가능
