# P2-7: 인라인 코드 서식 추가 — 검증 기록

## 자동화 테스트
| 커맨드 | 결과 |
|---|---|
| `npx vitest run src/components/editor/RichTextEditor.test.tsx src/components/editor/SlashCommandExtension.test.ts` | 64/64 통과(신규 4건 포함 — 버튼 적용/해제, 표 셀 안 동작, 슬래시 항목 커맨드 체인) |
| `npm test` | 58개 파일, 552/552 통과 |
| `npm run lint` | 0 errors, 기존과 동일한 경고 2건(`postcss.config.js`/`tailwind.config.js`, 이번 변경과 무관) |
| `npm run build` | 성공(Turbopack 컴파일·TypeScript 검사 모두 통과) |

## 수동 검증 (필요 시)
AX Auth 로그인 제약으로 실제 브라우저 확인은 하지 못했다(기존 서식 관련 항목들과 동일한 제약). 대신 자동화 테스트로 다음을 확인했다.
- 슬래시 메뉴 "인라인 코드" 항목이 목록에 나타나고, 선택 시 `toggleCode()` 커맨드 체인이 올바른 순서로 호출된다.
- 서식 버블 메뉴의 코드 버튼을 클릭하면 선택한 텍스트에 `<code>` 마크가 적용되고, 다시 클릭하면 해제된다.
- 표 셀 안 텍스트를 선택해도 코드 버튼이 보이고 동일하게 동작한다.

## 발견된 문제와 조치
없음 — 계획대로 순조롭게 구현됐다.

## 검증 중 새로 발견한 결정 사항
없음.

## 최종 판정
- [x] 수용 기준(`task.md`)을 모두 만족함 — PRD 갱신 가능
