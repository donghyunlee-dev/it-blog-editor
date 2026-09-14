# P13-2: 사이드바 행 왼쪽 여백 + 호버 하이라이트 복구 — 검증

## 자동화 테스트
- `npx vitest run src/components/editor/EditorSidebar.test.tsx` — 68개 전부 통과. 클래스명·CSS
  변경만이라 기존 테스트(텍스트, 클릭, 검색·정렬, 폴더 트리 탐색)에 영향 없음을 확인.
- `npx eslint src/components/editor/EditorSidebar.tsx` — 0 errors. `globals.css`는 ESLint
  대상이 아니다(설정에 해당 없음, 경고만 표시되고 오류 아님).
- `npm run build` — Turbopack 프로덕션 빌드 성공, TypeScript 통과, 19개 라우트 정상 생성.

## 수동/시각 검증
AX Auth 로그인 제약으로 이 세션에서는 실제 `/editor` 화면을 열어볼 수 없다(기존 항목들과 동일한
한계). 색상 관련 변경이라 특히 시각 확인이 중요한데, 이번엔 코드 레벨에서 원인
(`--color-surface-raised` == `--color-surface`, `node_modules/@sfood/ui/tokens/semantic.css:14-15`)을
직접 확인해 문제 자체는 확실하다고 판단했다. 5%/10% 믹스 비율이 실제로 적절한 대비인지는
사용자가 전달할 캡처로 확인한다.

## 문제 → 조치 → 재검증
없음 — 클래스 교체 + CSS 규칙 추가만으로 첫 시도에 테스트·린트·빌드가 모두 통과했다.

## 새로운 결정 사항
없음 — `task.md` "결정이 필요한 사항" 참고(사용자가 명시적으로 지적한 결함이라 별도 합의
불필요).
