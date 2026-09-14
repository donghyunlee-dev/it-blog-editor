# P12-1: 사이드바 태그 필터(ChipGroup) 제거 — 검증

## 자동화 테스트
- `npx vitest run src/components/editor/EditorSidebar.test.tsx` — 68개 전부 통과.
  - 갱신한 테스트("문서 목록 행에는 태그를 표시하지 않는다"): 문서 목록 안에는 태그 텍스트가
    없고, `role="tab"`(옛 태그 필터 칩) 자체가 더 이상 존재하지 않는지 확인.
  - 태그 필터 칩에 의존하던 테스트 3개는 기능 제거에 맞춰 삭제.
  - 검색이 제목·태그를 매칭하는 기존 테스트("검색어가 제목에는 없지만 태그에 포함되면 그 문서를
    보여준다(P1-1a)" 등)는 그대로 통과 — 검색 로직 자체는 건드리지 않았음을 확인.
- `npx eslint src/components/editor/EditorSidebar.tsx src/components/editor/EditorSidebar.test.tsx` — 0 errors.
- `npm run build` — Turbopack 프로덕션 빌드 성공, TypeScript 통과, 19개 라우트 정상 생성.

## 수동/시각 검증
AX Auth 로그인 제약으로 이 세션에서는 실제 `/editor` 화면을 열어볼 수 없다(기존 항목들과 동일한
한계). 변경은 렌더링 블록·상태·계산을 제거하는 것뿐이라 회귀 위험이 낮다고 판단해 자동화
테스트만으로 충분하다고 봤다.

## 문제 → 조치 → 재검증
없음 — 필터 블록·관련 상태 제거만으로 첫 시도에 테스트·린트·빌드가 모두 통과했다.

## 새로운 결정 사항
없음 — `task.md` "결정이 필요한 사항" 참고(사용자가 대화 중 이미 방향을 확정).
