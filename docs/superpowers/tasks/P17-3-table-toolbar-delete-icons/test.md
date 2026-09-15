# P17-3: 표 툴바 삭제 아이콘 구분 — 검증

## 자동화 테스트
- `npx vitest run src/components/editor/RichTextEditor.test.tsx` — 54개 전부 통과(새로
  추가한 1개 포함: 행/열/표 삭제 버튼의 아이콘 마크업이 서로 다름을 확인).
- `npx eslint src/components/editor/RichTextEditor.tsx
  src/components/editor/RichTextEditor.test.tsx` — 0 errors.
- `npm run build` — Turbopack 프로덕션 빌드 성공, TypeScript 통과, 20개 라우트 정상 생성.
- 사용자 요청대로 범위를 표 툴바와 직접 연관된 파일로 좁혀 전체 `npm test`/
  `npm run lint`는 실행하지 않았다(CLAUDE.md 테스트 루틴).

## 수동/시각 검증
AX Auth(사내 SSO) 로그인 제약으로 이 세션에서는 실제 브라우저로 확인할 수 없다. 실사용
확인이 필요한 시나리오: 표 안에 커서를 두고 뜨는 툴바에서 "행 삭제"(가로 띠+X)·
"열 삭제"(세로 띠+X)·"표 삭제"(범용 휴지통)가 한눈에 서로 다른 모양으로 구분되는지.

## 문제 → 조치 → 재검증
없음 — 원인(세 버튼이 같은 아이콘 재사용) 진단부터 구현까지 한 번에 반영됐고,
테스트/lint/빌드 모두 첫 시도에 통과했다.

## 새로운 결정 사항
없음.
