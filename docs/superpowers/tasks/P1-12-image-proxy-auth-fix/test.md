# P1-12: 이미지 다운로드 URL 인증 문제 수정 — 검증 기록

## 자동화 테스트
| 커맨드 | 결과 |
|---|---|
| `npx vitest run src/lib/confluence/client.test.ts` | 통과 (26/26, 신규 `downloadAttachment` 4건 + `uploadAttachment` 3건 포함) |
| `npx vitest run "src/app/api/editor/documents/[pageId]/images/[filename]/route.test.ts"` | 통과 (2/2, 신규) |
| `npx vitest run "src/app/api/editor/documents/[pageId]/images/route.test.ts"` | 통과 (6/6) |
| `npx vitest run src/lib/editor/images.test.ts` | 통과 (5/5) |
| `npx vitest run`(전체 스위트) | 통과 (55 파일 / 507건) |
| `npm run lint` | 통과(기존 무관 경고 2건만) |
| `npx tsc --noEmit` | 통과(에러 없음) |
| `npm run build` | 통과(`GET .../images/[filename]` 새 라우트가 목록에 나타남) |

## 수동 검증 (필요 시)
- AX Auth 로그인 제약으로 이 세션에서 실제 브라우저로 "이미지를 붙여넣었을 때 정말
  보이는지"까지는 직접 확인하지 못했다 — 사용자가 실제 Edge 브라우저로 재확인해야 한다.
- 코드 추적으로는 원인(브라우저가 Confluence 인증 없이 원본 다운로드 URL을 직접 요청)과
  수정(서버가 인증을 대신 거쳐 프록시)이 정확히 대응됨을 확인했다.

## 발견된 문제와 조치
- **원인(2026-09-09, 1차 수정 머지 후 사용자의 실제 Edge 재확인 중 발견)**: 캡쳐한
  스크린샷을 붙여넣으면 업로드 자체가 `400 Bad Request`로 실패했다 — `"Cannot add a new
  attachment with same file name as an existing attachment: image.png"`. 클립보드가 붙이는
  특징 없는 파일명(`image.png`)이 같은 문서 안에서 겹친 것이 원인.
- **조치**: `uploadAttachment`가 Confluence에 보내는 파일명에 매번 고유 접미사를 붙이도록
  고쳤다(`withUniqueFilenameSuffix`, `src/lib/confluence/client.ts`).
- **재검증 결과**: `npx vitest run src/lib/confluence/client.test.ts` 26/26 통과(신규
  `uploadAttachment` 테스트 3건 포함), 전체 스위트 55 파일/507건 통과, lint·tsc·build 모두
  통과. 실제 재확인은 사용자가 Edge에서 다시 진행한다.

## 검증 중 새로 발견한 결정 사항
없음.

## 최종 판정
- [ ] 수용 기준(`task.md`)을 모두 만족함 — 사용자의 실제 브라우저 재확인 이후 PRD 완료 표시
