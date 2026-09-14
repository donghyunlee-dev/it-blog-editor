# P8-5-toc-rail-restructure — 구현 계획

## Global Constraints
- `TableOfContents.tsx`는 여전히 ProseMirror가 관리하는 헤딩 DOM에 어떤 속성도 쓰지
  않는다(무한 재조정 루프 방지, `P8-5-toc-freeze-hotfix` 참고) — 이번 변경도 읽기 전용
  DOM 순회(`getScrollParent`, `getBoundingClientRect`)만 추가한다.
- `EditorShell`은 `/editor` 아래 모든 라우트(문서 목록 포함)의 공용 레이아웃이라, TOC를
  모르는 라우트에서는 새로 추가하는 우측 레일이 전혀 렌더링되지 않아야 한다(폭 0,
  DOM에 빈 wrapper조차 남기지 않음).

## Files
- Modify: `src/components/editor/EditorShell.tsx` — `TocRailContext` 정의, 우측 레일
  슬롯 렌더링.
- Modify: `src/components/editor/TableOfContents.tsx` — 항상 `null`을 반환하고, 실제
  UI는 `TocRailContext`로 받은 setter에 밀어 넣는다. 활성 헤딩 계산을
  `IntersectionObserver` 기반에서 스크롤 위치 기반(`computeActiveHeading`)으로 교체.
- Modify: `src/components/editor/DocumentEditor.tsx` — 본문+TOC를 묶던 `gap-12` flex
  그룹을 본문 단독 가운데 정렬로 단순화, `<TableOfContents/>` 마운트 위치 조정.
- Modify: `src/components/editor/TableOfContents.test.tsx` — `TocRailContext.Provider`
  로 감싸는 하네스로 교체, `IntersectionObserver` 모킹을 스크롤/rect 모킹으로 교체,
  활성 항목 버그 2건에 대한 회귀 테스트 추가.
- Modify: `src/components/editor/EditorShell.test.tsx` — 레일 슬롯이 채워졌을 때/비었을
  때 각각의 렌더링을 검증하는 테스트 추가.
- Modify: `docs/product/design.md` — "7. 우측 목차(TOC)" 절에 구조 변경 배경과 활성
  항목 버그 수정 내용을 기록.
- Modify: `docs/product/prd.md` — P8-5 항목에 이번 수정 이력 추가.

## Steps
- [x] **Step 1**: `EditorShell.tsx`에 `TocRailContext`(setter를 흘려보내는 Context)와
      `tocRail` state, 우측 레일 JSX(`{tocRail && <div className="hidden w-60 shrink-0 xl:block">{tocRail}</div>}`)
      추가. `npx vitest run src/components/editor/EditorShell.test.tsx`로 검증.
- [x] **Step 2**: `TableOfContents.tsx`를 항상 `null`을 반환하도록 바꾸고, 실제 `<nav>`
      JSX를 `useContext(TocRailContext)`로 받은 setter에 `useEffect`로 밀어 넣는다
      (`headings`/`activeElement` 변경 시 갱신, 언마운트 시 `null`로 정리).
- [x] **Step 3**: `computeActiveHeading` 함수 작성 — 스크롤이 바닥에 닿았으면 마지막
      헤딩, 아니면 "지금 섹션 기준선"(`scrollParent.top + 64px`)을 지난 헤딩 중 가장
      마지막(문서 순서상), 아무것도 안 지났으면 첫 헤딩을 기본값으로 반환. `scroll`/
      `resize` 이벤트로 재계산.
- [x] **Step 4**: `DocumentEditor.tsx`에서 본문+TOC를 묶던 `gap-12` 그룹을 본문 단독
      가운데 정렬(`flex justify-center`)로 단순화하고 `<TableOfContents/>`를 그 바깥으로
      뺀다(화면에는 아무것도 안 그리지만 effect는 계속 돌아야 하므로 여전히 마운트).
- [x] **Step 5**: `TableOfContents.test.tsx`를 새 구조에 맞게 재작성 —
      `TocRailContext.Provider`로 감싸는 `RailHarness` 도입, `IntersectionObserver` 모킹
      제거하고 `getBoundingClientRect`/`scrollTop`/`scrollHeight`/`clientHeight` 모킹 +
      `scroll` 이벤트 디스패치로 교체. 초기 활성/바닥 스크롤 활성 회귀 테스트 추가.
      `npx vitest run src/components/editor/TableOfContents.test.tsx`로 검증.
- [x] **Step 6**: `npx tsc --noEmit -p tsconfig.json`, `npx eslint <바뀐 파일들>`,
      `npm run build` 전체 통과 확인.
- [x] **Step 7**: 로그인 필요한 실제 화면 대신, `DocumentEditor.tsx`/`EditorShell.tsx`의
      실제 레이아웃 클래스를 그대로 복제한 정적 페이지(프로젝트 `public/`에 임시로
      올려 `next dev` 서버로 서빙, 검증 후 삭제)로 "본문을 스크롤해도 우측 레일이 전혀
      움직이지 않는다"를 재확인.
- [x] **Step 8**: `docs/product/design.md`/`docs/product/prd.md` 갱신, `result.md`/
      `test.md` 작성.
