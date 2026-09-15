# P17-5a: 코드 블록 Tab 들여쓰기 — 검증

## 자동화 테스트
- `npx vitest run src/components/editor/RichTextEditor.test.tsx` — 57개 전부 통과(새로
  추가한 2개 포함: 코드 블록 안 Tab 들여쓰기 / 코드 블록 밖 회귀 없음).
- `npx eslint src/components/editor/RichTextEditor.tsx
  src/components/editor/RichTextEditor.test.tsx` — 0 errors.
- `npm run build` — Turbopack 프로덕션 빌드 성공, TypeScript 통과, 20개 라우트 정상 생성.
- 사용자 요청대로 범위를 코드 블록과 직접 연관된 파일로 좁혀 전체 `npm test`는
  실행하지 않았다(CLAUDE.md 테스트 루틴).

## 수동/시각 검증
AX Auth 로그인 제약으로 이 세션에서는 실제 브라우저로 확인할 수 없다. 실사용 확인이
필요한 시나리오: 코드 블록 안에서 Tab을 눌러 들여쓰기가 삽입되고 포커스가 에디터
밖으로 빠지지 않는지, Shift-Tab으로 내어쓰기가 되는지, 여러 줄을 선택한 채 Tab/
Shift-Tab을 눌렀을 때도 각 줄 앞에 들여쓰기가 적용/해제되는지(라이브러리 기본 구현,
자동화 테스트는 collapsed selection 경로만 다룸).

## 문제 → 조치 → 재검증
- **문제**: 코드 블록 테스트에서 "const x = 1;" 전체 텍스트로 커서 위치를 찾으려
  했으나 텍스트 노드를 찾지 못해 실패.
- **원인**: 문법 강조(lowlight)가 코드 내용을 `hljs-*` 클래스별 `<span>`으로 토큰마다
  쪼개 렌더링해, 전체 문자열을 담은 단일 텍스트 노드가 없었다.
- **조치**: 마지막 글자(";")만으로 찾아 코드 끝에 커서를 두도록 헬퍼 호출을 바꿨다.
- **재검증**: 수정 후 57개 전부 통과.

## 새로운 결정 사항
없음.
