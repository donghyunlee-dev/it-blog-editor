# P13-1: 사이드바 문서함 행 밀도·들여쓰기 조정 — 결과

## 커밋
- `c949f0a` fix: 사이드바 문서함 행 밀도·들여쓰기 조정 (P13-1)

## 변경 파일
- `src/components/editor/EditorSidebar.tsx`
  - 파일 상단에 `INDENT_BASE_PX`(8), `INDENT_STEP_PX`(20, 기존 14에서 확대) 상수를 추가하고,
    들여쓰기 inline style 4곳(문서 행 2곳, 폴더 행 1곳, 빈 폴더 안내 1곳)을 모두 이 상수
    조합으로 교체했다.
  - 문서 행(`renderDocumentRow`의 `Link`), 폴더 행(`renderFolderNode`의 토글 버튼), 공유받은
    문서 행의 상하 padding을 `py-2`(8px)에서 `py-1.5`(6px)로 되돌렸다("이동" 버튼의 `mt-2`도
    `mt-1.5`로 함께 조정). 관련 P8-2 주석을 이번 변경 배경으로 갱신했다.
  - 검색 입력 wrapper·새 문서 버튼 wrapper·`<nav>`의 `p-3`을 `p-2.5`로, "폴더" 라벨 행의
    `mb-2`와 폴더 트리 `<ul>`의 `mb-2`를 `mb-1.5`로 줄였다.
- `docs/product/design.md` — "사이드바" 절의 문서 목록 행 패딩 서술과 "4. 좌측 사이드바"
  벤치마킹 표의 "목록 항목 패딩" 행을 실제 값(둘 다 P8-2 이후 갱신되지 않아 낡아 있었다)에
  맞춰 갱신했다.
- `docs/product/prd.md` — Phase 13(신규) 계획·체크리스트 추가. 겸사겸사 Phase 12 체크리스트의
  P12-1 항목이 "진행 중"으로 남아 있던 걸(PR #122가 이미 병합됨) 완료로 바로잡았다.

## 자체 검토
- **긍정**: 행의 클릭/포커스/접근성 속성은 전혀 건드리지 않고 수치(padding, 들여쓰기)만
  바꿔 회귀 위험이 낮다. 들여쓰기 공식을 상수 2개로 뽑아, 값을 한 곳만 바꾸면 4곳 모두에
  일관되게 적용되도록 해 향후 재조정도 쉬워졌다. 이 작업 도중 PRD의 Phase 12 체크리스트가
  실제 병합 상태와 어긋나 있던 것도 함께 바로잡았다.
- **주의사항**: 폴더 하위 목록에 세로 가이드라인을 추가하는 안은 시각적 미세조정이 필요해
  이번 범위에서 제외했다(task.md "범위 밖" 참고) — 사용자가 이번 변경을 확인한 뒤 필요성을
  다시 판단하기로 했다.
- **우려사항**: `py-1.5`·`p-2.5`·들여쓰기 20px이 실제 화면에서 "적당한 밀도"로 보일지는 이
  세션에서 직접 확인하지 못했다(AX Auth 로그인 제약) — 사용자가 전달할 캡처로 확인이 필요하다.

## 산출물
- `docs/superpowers/tasks/P13-1-sidebar-row-density/{task,plan,result,test}.md`
- `src/components/editor/EditorSidebar.tsx`
- `docs/product/design.md`
- `docs/product/prd.md`
