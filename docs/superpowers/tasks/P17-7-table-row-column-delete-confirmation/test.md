# P17-7: 표 행/열 삭제 확인 절차 일관성 — 검증

## 자동화 테스트
- 코드 변경이 없어 새 테스트는 추가하지 않았다. 대신 이번 재검토 결론(행/열 삭제
  즉시 실행 유지, 표 전체 삭제만 Modal 확인)을 이미 검증하고 있는 기존 테스트를
  확인했다:
  - `RichTextEditor.test.tsx` › "RichTextEditor 표 행/열 컨트롤(P1-7a)" ›
    "행 삭제를 클릭하면 표의 행이 하나 줄어든다" — Modal 없이 클릭 즉시 행이
    삭제됨을 검증.
  - `RichTextEditor.test.tsx` › "RichTextEditor 표 삭제(P2-4)" ›
    "표 삭제 버튼을 클릭해도 바로 삭제되지 않고 확인 Modal이 뜬다" 외 3개 —
    표 전체 삭제만 확인 Modal을 거침을 검증.
- `npx vitest run src/components/editor/RichTextEditor.test.tsx` — 65개 전부 통과
  (회귀 없음 확인 — 애초에 코드가 바뀌지 않았다).
- 코드 변경이 없어 `npx eslint`/`npm run build`는 이번 작업 범위에서 실행하지
  않았다(CLAUDE.md: "코드 변경(문서 전용이 아닌 경우)이 있으면" 빌드를 돌린다 —
  이번 건 문서 전용).

## 수동 검증
해당 없음 — 코드 변경이 없어 Browser pane 시각 검증 대상도 없다.

## 문제 → 조치 → 재검증
- **문제**: 없음.

## 새로운 결정 사항
- "행/열 삭제도 Modal 확인을 거칠지"를 사용자에게 직접 확인했다(AskUserQuestion,
  GitHub Issue 대신 실시간 세션에서 즉시 결정) — 결론: 즉시 실행 유지. task.md/
  result.md 참고.
