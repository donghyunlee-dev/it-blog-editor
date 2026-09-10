# P8-2: 사이드바 목록 행 간격/비율 재조정 — 검증

## 자동화 테스트
- `npx vitest run src/components/editor/EditorSidebar.test.tsx` — 67개 전부 통과(태그 필터(P1-1a)·정렬(P1-1b)·페이지네이션(P1-1c) 테스트 포함, 회귀 없음). 이 파일은 클래스 문자열을 직접 검사하지 않는 이 코드베이스의 일반적인 테스트 관례를 따르므로, 패딩/radius 값 자체를 잠그는 신규 테스트는 추가하지 않았다 — 기존 동작(렌더링·필터·정렬·상호작용)이 그대로 유지되는지만 확인했다.
- `npm test` — 63개 파일, 647개 테스트 전부 통과.
- `npm run lint` — 0 errors, 2 warnings(`postcss.config.js`/`tailwind.config.js`의 기존 경고, 이 작업과 무관).
- `npm run build` — Turbopack 프로덕션 빌드 성공, TypeScript 통과, 19개 라우트 정상 생성.

## 수동/시각 검증
- **AX Auth 로그인 제약으로 이 세션에서는 실제 앱 화면을 캡처할 수 없다**(PRD의 기존 항목들과 동일한 한계).
- 수용 기준의 "변경 전/후 스크린샷 비교"를 대신해, 이 프로젝트의 실제 디자인 토큰(색상·타이포·radius 값을 `node_modules/@sfood/ui/tokens/*.css`에서 그대로 가져옴)으로 사이드바 행을 정적으로 재현한 비교 페이지를 만들어 Artifact로 공유했다: https://claude.ai/code/artifact/c14c5328-8f4c-44b1-8493-394bb4ee4f32
  - 좌: 변경 전(`rounded-btn`/`py-1.5`/`pr-3`), 우: 변경 후(`rounded-card`/`py-2`/`pr-2`)를 나란히 배치.
  - 아래 표에 속성별 변경 전/후 클래스를 명시.
  - 실제 화면과 100% 동일함을 보장하지는 않는다 — 코드 변경 내용을 시각적으로 확인할 수 있는 최선의 대체 자료다.

## 문제 → 조치 → 재검증
없음 — 기존 유틸리티 클래스 교체만으로 끝나 처음부터 순조롭게 진행됐다.

## 새로운 결정 사항
없음 — 적용 범위(문서/공유문서/폴더 행 전부)와 12px 표현 방식(`rounded-card` 재사용)은 GitHub Issue 없이 기존 코드 관례를 근거로 직접 정했다(task.md "결정이 필요한 사항" 참고).
