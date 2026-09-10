# P8-5: 우측 목차(TOC) 신규 구현 — 구현 계획

## Global Constraints
- 새 npm 패키지를 설치하지 않는다 — 브라우저 네이티브 `IntersectionObserver`와 `scrollIntoView`만 쓴다.
- 헤딩 목록은 TipTap JSONContent가 아니라 실제 렌더링된 DOM(`h2`/`h3`)에서 읽는다(항상 화면과 정확히 일치, `doc` prop은 재스캔 트리거로만 사용).
- 활성 표시 색상은 `.prose` 링크색이 이미 실측해 둔 라이트/다크 브랜드 톤 전환 패턴(`--color-brand-hover`/`--color-brand`)을 그대로 재사용한다.

## Files
- Create: `src/components/editor/TableOfContents.tsx`
- Create: `src/components/editor/TableOfContents.test.tsx`
- Modify: `src/components/editor/DocumentEditor.tsx` (본문 컨테이너에 ref 부여, TOC를 본문 옆에 배치)
- Modify: `src/app/globals.css` (`.toc-active-link` 라이트/다크 색상, 헤딩 `scroll-margin-top`)
- Modify: `vitest.setup.ts` (jsdom에 없는 `IntersectionObserver` 기본 스텁 추가)

## Steps
- [x] **Step 1**: `TableOfContents.tsx` — `containerRef` 안의 `h2`/`h3`를 훑어 헤딩 목록을 만들고, 각 헤딩에 안정적인 id(`toc-heading-{index}`)를 직접 부여한다. `doc` prop이 바뀔 때마다 재스캔한다.
- [x] **Step 2**: `IntersectionObserver`로 스크롤에 따른 활성 헤딩을 추적한다 — 여러 헤딩이 동시에 교차하면 문서 순서상 가장 나중(아래) 것을 활성으로 본다.
- [x] **Step 3**: 목차 항목을 `<a href="#{id}">`로 렌더링하고, 클릭 시 `preventDefault` 후 `scrollIntoView({behavior:"smooth", block:"start"})`로 이동한다. 활성 항목에는 `aria-current="true"`를 붙인다. 헤딩이 하나도 없으면 `null`을 반환한다.
- [x] **Step 4**: `globals.css`에 `.toc-active-link`(라이트: `brand-hover`, 다크: `brand`, `.prose` 링크색과 같은 패턴)와 `.prose h2, .prose h3 { scroll-margin-top: 4.5rem; }`(sticky 헤더에 가려지지 않도록)를 추가한다.
- [x] **Step 5**: `DocumentEditor.tsx` — 본문을 감싸는 `<div>`에 `richTextContainerRef`를 달고, 본문+TOC를 `<div className="flex justify-center gap-12">`로 함께 가운데 정렬한다.
- [x] **Step 6**: `vitest.setup.ts`에 `IntersectionObserver` no-op 기본 스텁을 추가한다(jsdom 미구현 — `matchMedia`/`scrollIntoView`와 같은 이유).
- [x] **Step 7**: `TableOfContents.test.tsx` — 헤딩 없음/목록 순서·들여쓰기/클릭 시 스크롤/빈 제목 처리/활성 추적(단일·동시 교차)/`doc` 변경 시 재스캔을 검증한다.
- [x] **Step 8**: `npm test`, `npm run lint`, `npm run build`로 최종 확인한다.

각 Step은 `npm test -- TableOfContents.test.tsx DocumentEditor.test.tsx`로 검증 가능한 단위로 쪼갠다.
