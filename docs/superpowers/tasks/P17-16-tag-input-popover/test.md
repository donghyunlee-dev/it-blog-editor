# P17-16: 태그 UI를 칩+팝오버 방식으로 전환 — 검증 기록

## 자동화 테스트
| 커맨드 | 결과 |
|---|---|
| `npx vitest run src/components/editor/TagInput.test.tsx src/components/editor/DocumentEditor.test.tsx` | 통과 (52/52 — TagInput 9개, DocumentEditor 43개) |
| `npx eslint src/components/editor/TagInput.tsx src/components/editor/TagInput.test.tsx src/components/editor/DocumentEditor.test.tsx` | 통과 (경고/에러 없음) |
| `npm run build` | 통과 (컴파일·타입체크·정적 페이지 생성 모두 성공, 디버그 라우트 없음 확인) |

## 수동 검증
- `TagInput`은 독립 컴포넌트라 auth 게이트와 무관하게 임시 라우트
  (`/dev-preview-tag-popover`, 검증 후 즉시 삭제)에서 직접 마운트해 Browser pane
  (Chromium)으로 확인했다.
- 실측 흐름:
  1. 초기 상태(`get_page_text`): "태그 / ai × / 업무 × / 활용 × / 태그 추가" —
     상시 입력 박스 없이 칩 + 트리거만 보임.
  2. "태그 추가" 클릭 → 팝오버가 열리며 이미 선택된("업무") 것을 제외한 나머지
     추천 태그 전체("AI", "Backend", "개인", "설정")가 입력 없이도 곧바로 나타남.
  3. 입력창에 "back" 입력 → 목록이 "Backend" 하나로 좁혀짐.
  4. "Backend" 옵션 클릭 → 칩 목록에 "Backend ×"가 추가되고, 팝오버는 닫히지 않고
     남은 추천("AI", "개인", "설정")을 계속 보여줌(연속 추가 가능 확인).

## 발견된 문제와 조치
없음.

## 검증 중 새로 발견한 결정 사항
없음.

## 최종 판정
- [x] 수용 기준(`task.md`)을 모두 만족함 — PRD 갱신 가능. 팝오버가 그냥 닫힐 때
      입력 중이던 텍스트가 초기화되지 않는 사소한 트레이드오프는 result.md의
      "주의사항"에 기록했다.
