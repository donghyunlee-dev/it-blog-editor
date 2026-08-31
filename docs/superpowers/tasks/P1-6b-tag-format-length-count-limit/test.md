# P1-6b: 태그 형식·길이·개수 상한을 서버에서 검증한다 — 검증 기록

## 자동화 테스트
| 커맨드 | 결과 |
|---|---|
| `npx vitest run src/lib/editor/tags.test.ts` | 통과 (14/14, 신규 8건) |
| `npx vitest run src/components/editor/TagInput.test.tsx` | 통과 (7/7, placeholder 문자열 갱신) |
| `npm test`(전체) | 통과 (244/244 — `DocumentEditor.test.tsx`의 placeholder 셀렉터 2건도 함께 갱신해 회귀 없음) |
| `npx tsc --noEmit` | 통과 |
| `npm run lint` | 통과 — 에러 0, 경고 2(기존 무관 경고) |
| `npm run build` | 통과 |

## 수동 검증
서버 검증 로직(개수/길이/빈 값/금지 문자/Confluence 400 변환)은 mock 기반 단위 테스트로 충분히 검증했다 — Confluence의 실제 라벨 형식 거부 응답을 안전하게 재현할 방법이 없어, 금지 문자 목록은 실측 대신 [공식 문서](https://support.atlassian.com/confluence-cloud/docs/use-labels-to-organize-your-content/)를 근거로 삼았다.

TagInput의 시각적 변경(테두리·배경·placeholder)은 AX Auth 로그인이 필요해 이 세션의 브라우저 도구로 직접 확인하지 못했다(기존 작업들과 동일한 제약). 컴포넌트 테스트로 동작(태그 추가/삭제/추천)에 회귀가 없음은 확인했다 — 실제 화면에서의 디자인 확인은 사용자에게 요청한다.

## 발견된 문제와 조치
- **원인**: TagInput의 placeholder 문자열을 "태그 입력"에서 "예: React, Backend"로 바꾸면서, 같은 문자열을 셀렉터로 쓰던 `TagInput.test.tsx`(6곳)와 `DocumentEditor.test.tsx`(2곳)가 요소를 찾지 못해 실패했다.
- **조치**: 두 테스트 파일의 `getByPlaceholderText("태그 입력")`을 새 placeholder 문자열로 일괄 교체했다.
- **재검증 결과**: `npm test`(전체) 244/244 통과.

## 검증 중 새로 발견한 결정 사항
없음.

## 최종 판정
- [x] 수용 기준(`task.md`)을 모두 만족함 — PRD 갱신 가능
