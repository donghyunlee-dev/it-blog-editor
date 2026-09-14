# P13-2: 사이드바 행 왼쪽 여백 + 호버 하이라이트 복구 — 결과

## 커밋
- (커밋 후 기록 예정)

## 변경 파일
- `src/app/globals.css` — `.sidebar-row-active` 바로 아래에 `.sidebar-row-hover:hover`를
  추가했다(`color-mix(in srgb, var(--color-brand) 5%, var(--color-surface))`). 활성 행의
  10% 믹스보다 옅은 5%를 썼다.
- `src/components/editor/EditorSidebar.tsx`
  - 문서 행 `Link`: `pl-2` 추가(`pr-2`와 대칭), 비활성 분기의 `hover:bg-surface-raised`를
    `sidebar-row-hover`로 교체.
  - 폴더 행 wrapper `<div>`: `pl-1` 추가(`pr-1`과 대칭), `hover:bg-surface-raised`를
    `sidebar-row-hover`로 교체.
  - 공유받은 문서 행 `Link`: 비활성 분기의 `hover:bg-surface-raised`를 `sidebar-row-hover`로
    교체(이미 `pl-2 pr-2`가 있어 패딩은 변경 없음).
- `docs/product/design.md` — "브랜드색을 배경에 옅게 섞을 때" 절에 `.sidebar-row-hover` 추가,
  "사이드바" 절에 이번 발견(라이트 모드 `surface-raised`/`surface` 동일 값 문제)과 조치를
  기록했다.
- `docs/product/prd.md` — Phase 13 계획에 이번 후속 지적 내용을 추가하고, 체크리스트에 P13-2를
  완료 항목으로 추가했다.

## 자체 검토
- **긍정**: 왼쪽 여백 추가는 오른쪽 padding과 대칭을 맞추는 간단한 수정이라 리스크가 낮다.
  호버 무효 문제는 코드 확인만으로 정확한 원인(`@sfood/ui` 토큰 정의)을 특정했고, 이미 같은
  프로젝트에 확립된 해법(`.sidebar-row-active`의 `color-mix()` 패턴)을 그대로 재사용해 새로운
  방식을 발명하지 않았다.
- **주의사항**: 사이드바에는 `hover:bg-surface-raised`를 쓰는 다른 곳(정렬/새 폴더/이름변경/
  삭제 아이콘 버튼, 계정 정보·로그아웃 버튼 등)이 더 있고 같은 라이트 모드 문제가 있을
  가능성이 높다 — 이번엔 사용자가 지적한 "폴더, 파일의 선택 영역"에만 한정했다. 필요하면
  별도 작업으로 전체를 스캔해 정리하는 게 좋겠다(스코프 확장 필요 여부는 사용자 확인 후 결정).
- **우려사항**: 5%라는 비율이 실제 화면에서 "선택보다 확실히 옅지만 알아볼 수 있는" 정도인지는
  이 세션에서 직접 확인하지 못했다(AX Auth 제약) — 사용자 캡처로 확인이 필요하다.

## 산출물
- `docs/superpowers/tasks/P13-2-sidebar-row-inset-hover/{task,plan,result,test}.md`
- `src/components/editor/EditorSidebar.tsx`
- `src/app/globals.css`
- `docs/product/design.md`
- `docs/product/prd.md`
