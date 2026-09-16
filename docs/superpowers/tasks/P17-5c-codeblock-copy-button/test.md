# P17-5c: 코드 블록 복사 버튼 — 검증

## 자동화 테스트
- `npx vitest run src/components/editor/RichTextEditor.test.tsx` — 65개 전부 통과
  (새로 추가한 3개 포함: 클릭 시 클립보드 복사 + 성공 토스트, 실패 시 실패 토스트,
  코드 블록 여러 개일 때 버튼별로 자신의 코드만 복사).
- `npx eslint src/components/editor/RichTextEditor.tsx
  src/components/editor/RichTextEditor.test.tsx` — 0 errors.
- `npm run build` — Turbopack 프로덕션 빌드 성공, TypeScript 통과, 20개 라우트 정상 생성.
- 사용자 요청대로 범위를 코드 블록과 직접 연관된 파일로 좁혀 전체 `npm test`는 실행하지
  않았다(CLAUDE.md 테스트 루틴).

## 수동/시각 검증(Browser pane으로 실제 확인)
사용자의 실행 중인 dev 서버(`localhost:3000`)에 임시 디버그 페이지(검증 후 삭제,
`ToastProvider`로 감싼 `RichTextEditor` 하나, 코드 블록 1개)를 추가해 확인했다(AX Auth
로그인 제약으로 실제 `/editor/[pageId]` 화면은 열 수 없어 기존 P17-5b/P17-11과 같은
방식을 그대로 따랐다).

1. 코드 블록 툴바에 언어 선택 드롭다운과 나란히 복사 버튼이 정상 렌더링됐다(`find`로
   `aria-label="코드 복사"` 버튼 확인).
2. 버튼을 클릭했다. `get_page_text`로 확인한 결과 "코드 복사에 실패했습니다." 토스트가
   떴다.
3. `javascript_tool`로 직접 `navigator.clipboard.writeText("test")`를 호출해 원인을
   확인 — `"Failed to execute 'writeText' on 'Clipboard': Write permission denied."`
   이 세션의 Browser pane(헤드리스 Chromium)이 `clipboard-write` 권한 자체를 거부하고
   있음을 확인했다. 즉 우리 코드(`handleCopy`)는 정확히 의도한 대로 동작했다 —
   `navigator.clipboard.writeText`를 호출했고, 그 Promise가 reject되자 `catch` 블록이
   실행돼 실패 토스트를 띄웠다. 이는 코드 블록 안의 실제 텍스트("function add(a, b) {...}")
   유무와 무관하게, 이 환경의 권한 정책 때문에 항상 실패로 귀결되는 조건이다.
4. 위 실패 경로는 실제 DOM에서 끝까지 확인됐지만, 성공 경로(클립보드에 실제로 값이
   들어가고 성공 토스트가 뜨는지)는 이 환경에서 재현할 수 없었다 — 자동화 테스트에서
   `navigator.clipboard.writeText`를 resolve하도록 모킹해 성공 토스트("코드를
   클립보드에 복사했습니다.")가 뜨는지, 그리고 실제로 호출된 인자가 해당 코드 블록의
   텍스트와 일치하는지 확인했다(위 자동화 테스트 항목 참고).
5. 임시 디버그 페이지를 삭제했다.

## 문제 → 조치 → 재검증
- **문제**: 없음(구현 중 회귀 없이 한 번에 통과).
- 참고: Browser pane의 클립보드 권한 제약은 이 작업의 코드 결함이 아니라 세션 도구
  환경의 한계로 판단했다(위 3번). 실제 사용자 브라우저(Chrome/Edge 등)는 `localhost`/
  `https` 컨텍스트에서 `clipboard-write`를 프롬프트 없이 허용하는 것이 표준 동작이다.

## 새로운 결정 사항
없음.
