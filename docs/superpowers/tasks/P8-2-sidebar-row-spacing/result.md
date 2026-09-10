# P8-2: 사이드바 목록 행 간격/비율 재조정 — 결과

## 커밋
- `b35202d` feat: 사이드바 목록 행 패딩·radius를 벤치마킹 실측값에 맞춤 (P8-2)

## 변경 파일
- `src/components/editor/EditorSidebar.tsx`:
  - `renderDocumentRow`의 `<Link>`: `rounded-btn py-1.5 pr-3` → `rounded-card py-2 pr-2`. 왼쪽 패딩은 `<li>`의 `paddingLeft: 8 + depth * 14`가 depth 0에서 이미 8px라 그대로 뒀다.
  - 같은 행의 "이동" 버튼: `mt-1.5` → `mt-2`(Link의 새 상단 패딩과 정렬 맞춤).
  - "공유받은 문서" 행: `rounded-btn py-1.5 pl-2 pr-3` → `rounded-card py-2 pl-2 pr-2`.
  - `renderFolderNode`의 wrapper `<div>`: `rounded-btn` → `rounded-card`. 토글 `<button>`: `py-1.5` → `py-2`(문서 행과 같은 높이 유지).

## 자체 검토
- **긍정**: 새 디자인 토큰·새 컴포넌트 없이 기존 `rounded-card`(이미 이 코드베이스가 "12px가 필요한 곳"에 재사용하던 토큰)와 Tailwind 표준 패딩 유틸리티만으로 끝났다. 클래스 문자열 변경뿐이라 회귀 위험이 낮다 — 실제로 `EditorSidebar.test.tsx`(태그 필터·정렬·페이지네이션 포함) 67개가 수정 없이 전부 통과했다.
- **주의사항**: design.md의 "이 프로젝트 현재 값" 인용이 폴더 트리 도입 이전의 단일 문서 행 패턴(`py-1.5 pl-2 pr-3`)을 가리키고 있어, 실제로는 그 뒤 두 변형(일반 문서 행·공유 문서 행)으로 갈라진 상태였다 — 둘 다 조정 대상으로 판단한 근거를 task.md에 남겼다. 폴더 행의 세로 패딩도 함께 맞췄는데, PRD 원문은 "문서 목록 행"만 명시했지만 손대지 않으면 같은 트리 안에서 폴더 행만 높이가 달라지는 새로운 시각적 불일치가 생기기 때문에 필요한 조정이었다.
- **우려사항**: AX Auth 로그인 제약으로 이 세션에서는 실제 앱 화면으로 전/후를 캡처하지 못했다(PRD의 기존 항목들과 동일한 한계). 대신 이 프로젝트의 실제 색상·타이포·radius 토큰 값을 그대로 쓴 정적 HTML 비교를 만들어 Artifact로 공유했다 — 실제 화면과 100% 동일하다는 보장은 아니다(`test.md`에 링크).

## 산출물
- `docs/superpowers/tasks/P8-2-sidebar-row-spacing/{task,plan,result,test}.md`
- 변경 전/후 시각 비교(Artifact): https://claude.ai/code/artifact/c14c5328-8f4c-44b1-8493-394bb4ee4f32
