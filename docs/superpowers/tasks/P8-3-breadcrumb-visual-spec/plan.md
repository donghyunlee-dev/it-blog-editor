# P8-3: 브레드크럼 시각 스펙 정의 — 구현 계획

## Global Constraints
- P7-7의 브레드크럼 동작(폴더 없는 문서는 렌더링 안 됨, 클릭 시 `/editor?folder={id}`
  이동, 소유자 폴더 트리 기준)은 하나도 바꾸지 않는다 — 순수 스타일 보정이다.
- design.md "2. 사이즈" 표(임의 텍스트 크기 도입 금지)와 CLAUDE.md 하드코딩 금지 규칙이
  이 벤치마크 실측값보다 우선한다(task.md "결정이 필요한 사항" 참고) — 적용 가능한 값만
  반영한다.

## Files
- Modify: `src/components/editor/DocumentEditor.tsx` — 브레드크럼 `nav`와 각 폴더 `span`의
  `gap-1`(4px) → `gap-2`(8px)로 변경 + 주석으로 판단 근거 기록.
- Modify: `src/components/editor/DocumentEditor.test.tsx` — 새 간격 클래스 확인 테스트 추가.
- Modify: `docs/product/prd.md` — P8-3 체크리스트 완료 표시.
- Create: `docs/superpowers/tasks/P8-3-breadcrumb-visual-spec/{task,plan,result,test}.md`.

## Steps
- [x] **Step 1**: design.md의 4가지 실측값(폰트/색/gap/margin-bottom) 각각을 이 프로젝트의
  기존 규칙(design.md "2. 사이즈", CLAUDE.md 토큰 우선 원칙, `h-14` 고정 헤더 결정)과
  대조해 적용 가능 여부를 판단한다 → `task.md`에 근거 기록.
- [x] **Step 2**: 적용 가능한 값(gap:8px)만 `DocumentEditor.tsx`에 반영한다.
- [x] **Step 3**: `DocumentEditor.test.tsx`에 새 간격 검증 테스트를 추가한다.
  `npx vitest run DocumentEditor.test.tsx`로 기존 P7-7 테스트(4개) 회귀 없음 + 신규 1개
  통과 확인.
- [x] **Step 4**: `npx tsc --noEmit`, 변경 파일 대상 `npx eslint` 확인.
- [x] **Step 5**: `npm test`/`npm run build` 전체 실행, PRD P8-3 완료 표시, `result.md`/
  `test.md` 작성.
