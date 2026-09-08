# P1-12: 이미지 다운로드 URL 인증 문제 수정 — 검증 기록

## 자동화 테스트
| 커맨드 | 결과 |
|---|---|
| `npx vitest run src/lib/confluence/client.test.ts` | 통과 (23/23, 신규 `downloadAttachment` 테스트 4건 포함) |
| `npx vitest run "src/app/api/editor/documents/[pageId]/images/[filename]/route.test.ts"` | 통과 (2/2, 신규) |
| `npx vitest run "src/app/api/editor/documents/[pageId]/images/route.test.ts"` | 통과 (6/6) |
| `npx vitest run src/lib/editor/images.test.ts` | 통과 (5/5) |
| `npx vitest run`(전체 스위트) | 통과 (55 파일 / 504건) |
| `npm run lint` | 통과(기존 무관 경고 2건만) |
| `npx tsc --noEmit` | 통과(에러 없음) |
| `npm run build` | 통과(`GET .../images/[filename]` 새 라우트가 목록에 나타남) |

## 수동 검증 (필요 시)
- AX Auth 로그인 제약으로 이 세션에서 실제 브라우저로 "이미지를 붙여넣었을 때 정말
  보이는지"까지는 직접 확인하지 못했다 — 사용자가 실제 Edge 브라우저로 재확인해야 한다.
- 코드 추적으로는 원인(브라우저가 Confluence 인증 없이 원본 다운로드 URL을 직접 요청)과
  수정(서버가 인증을 대신 거쳐 프록시)이 정확히 대응됨을 확인했다.

## 발견된 문제와 조치
없음 — 이 항목 자체가 이전 버그의 원인 조사·수정이다.

## 검증 중 새로 발견한 결정 사항
없음.

## 최종 판정
- [ ] 수용 기준(`task.md`)을 모두 만족함 — 사용자의 실제 브라우저 재확인 이후 PRD 완료 표시
