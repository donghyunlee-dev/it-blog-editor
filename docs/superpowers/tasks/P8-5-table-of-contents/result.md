# P8-5: 우측 목차(TOC) 신규 구현 — 결과

## 커밋
- `d3aa97b` feat: 문서 편집 화면에 우측 목차(TOC) 신규 구현 (P8-5)

## 변경 파일
- `src/components/editor/TableOfContents.tsx`(신규) — `containerRef` 안의 `h2`/`h3` DOM을 직접 훑어 헤딩 목록을 만든다(TipTap JSONContent 파싱 대신 실제 렌더링된 DOM을 신뢰 — 항상 화면과 정확히 일치). 각 헤딩에 안정적인 id(`toc-heading-{index}`)를 직접 부여하고, `IntersectionObserver`로 스크롤에 따른 활성 헤딩을 추적한다(여러 헤딩이 동시에 교차하면 문서 순서상 가장 나중 것을 활성으로 본다). 클릭 시 `scrollIntoView({behavior:"smooth", block:"start"})`로 이동하고 활성 항목에 `aria-current="true"`를 붙인다. 헤딩이 없으면 `null`을 반환한다.
- `src/components/editor/DocumentEditor.tsx` — 본문을 감싸는 `<div>`에 `richTextContainerRef`를 달고, 본문(`max-w-[830px]`)과 `<TableOfContents>`를 `<div className="flex justify-center gap-12">`로 함께 감싸 가운데 정렬한다.
- `src/app/globals.css` — `.toc-active-link`(라이트: `--color-brand-hover`, 다크: `--color-brand` — `.prose` 링크색이 이미 실측해 둔 것과 똑같은 미디어 쿼리+`[data-theme]` 패턴을 그대로 재사용) 추가. `.prose h2, .prose h3 { scroll-margin-top: 4.5rem; }` 추가(sticky 헤더에 헤딩이 가려지지 않도록).
- `vitest.setup.ts` — jsdom에 없는 `IntersectionObserver`의 no-op 기본 스텁 추가(`matchMedia`/`scrollIntoView`와 같은 이유).
- `src/components/editor/TableOfContents.test.tsx`(신규) — 8개 테스트: 헤딩 없음(렌더링 안 함), 문서 순서 유지, h3 들여쓰기, 클릭 시 스크롤, 빈 제목 처리, 단일/동시 교차 시 활성 추적, `doc` 변경 시 재스캔.

## 자체 검토
- **긍정**: JSONContent를 파싱하지 않고 실제 렌더링된 DOM을 직접 읽는 설계 덕분에 "TOC가 실제 화면과 어긋나는" 종류의 버그가 구조적으로 생기지 않는다. 활성 표시 색상은 새로 실측하지 않고 이미 이 코드베이스가 정확히 같은 문제(같은 배경, 같은 두 브랜드 톤)를 풀어둔 `.prose` 링크색 결정을 그대로 재사용해 근거가 탄탄하다.
- **주의사항**: 레이아웃 조합에서 `flex-1`+`mx-auto` 조합이 flex의 자동 여백과 flex-grow가 같은 여유 공간을 두고 경쟁해 의도한 가운데 정렬이 깨지는 것을 발견해 `justify-center`로 [본문+TOC] 그룹 전체를 가운데 정렬하는 방식으로 바꿨다(`task.md` "결정이 필요한 사항" 3번 참고).
- **우려사항**: AX Auth 로그인 제약으로 이 세션에서는 실제 브라우저로 1440/1280/1024px 스크린샷 3종을 찍지 못했다(PRD의 기존 항목들과 동일한 한계). 대신 이 프로젝트의 실제 색상 토큰으로 두 브레이크포인트(TOC 노출/숨김)를 재현한 정적 비교를 Artifact로 공유했다 — 스크롤 활성 추적·부드러운 스크롤 이동 같은 동적 동작은 정적 페이지로 보여줄 수 없어 자동화 테스트로만 검증했다.

## 산출물
- `docs/superpowers/tasks/P8-5-table-of-contents/{task,plan,result,test}.md`
- 변경 전/후 시각 비교(Artifact): https://claude.ai/code/artifact/483531a6-a01a-49db-a263-47b31ba9f775
