# P8-5: 문서 보기/편집 화면 우측 목차(TOC) 신규 구현

## 배경
- `docs/product/prd.md` Phase 8 체크리스트 항목. `docs/product/design.md` "7. 우측 목차(TOC) — 이 프로젝트에 없는 신규 기능" 절이 support.claude.com/ko 실측값을 스펙으로 남겨뒀다.
- 레퍼런스: `nav aria-label="이 페이지"`, 폭 240px, 뷰포트에 맞춘 동적 `max-height`(스크롤 가능), 레이블 13px/600, 목차 항목 15px→실제 렌더 12px/400, 활성 항목은 **굵기 차이 없이** 좌측 2px 바 + 텍스트가 진해짐, 앵커 클릭으로 스크롤 이동 + `aria-current="true"`, `≥1280px`에서만 노출.

## 수용 기준 (Acceptance Criteria)
- [x] 본문 H2/H3를 스캔해 목차 리스트를 만든다.
- [x] 스크롤 위치에 따라 현재 헤딩을 하이라이트(active)한다.
- [x] 클릭 시 해당 헤딩으로 스크롤 이동한다.
- [x] 폭 240px, `≥1280px`에서만 노출(그 미만은 숨김).
- [x] 활성 표시는 레퍼런스의 무채색 대신 `--color-brand`/`--color-brand-hover` 중 대비 기준(WCAG AA)을 만족하는 값을 실측 검증해 사용한다.
- [x] 키보드로 목차 항목 포커스·Enter로 이동 가능(접근성) — 실제 `<a href>` 앵커라 브라우저 기본 동작으로 충족된다.
- [x] 자동화 테스트로 회귀를 고정한다(스크린샷 3종은 AX Auth 제약으로 대체 — 아래 "결정이 필요한 사항"·`test.md` 참고).

## 결정이 필요한 사항
없음 — 다음 세 가지는 GitHub Issue 없이 기존 코드/실측 근거로 직접 정했다:
1. **헤딩 추출 방식**: TipTap JSONContent를 파싱하는 대신, `RichTextEditor.tsx`가 실제로 렌더링한 DOM(`h2`/`h3`)을 직접 훑는다. `EditorContent`는 React 렌더 트리 밖에서 ProseMirror가 직접 관리하는 DOM이라, JSON을 다시 파싱해 "몇 번째 헤딩인지"를 추정하는 것보다 실제 DOM을 그대로 읽는 쪽이 항상 화면과 정확히 일치하고 더 단순하다. `doc`(JSONContent) prop은 "본문이 바뀌었으니 다시 훑어라"는 재스캔 신호로만 쓴다.
2. **활성 표시 색상**: 레퍼런스는 좌측 바 색(#151514, 거의 검정)을 쓰지만, 이 프로젝트는 이미 브랜드색으로 활성 상태를 표시하는 관례(`.sidebar-row-active`)가 있어 design.md가 지시한 대로 `--color-brand`/`--color-brand-hover` 중 대비가 나오는 쪽을 쓴다. **이미 이 코드베이스에 똑같은 문제(같은 배경, 같은 두 브랜드 톤 중 선택)를 실측까지 마친 선례가 있다** — `.prose`의 링크색(`globals.css` "P1-7?" 근처 주석)이 정확히 이 계산을 이미 해뒀다: 라이트 배경(`--color-background` ≈ #f8fafc)에서 `--color-brand`는 대비 약 4.10:1로 WCAG AA(4.5:1) 텍스트 기준에 근소하게 못 미치고, `--color-brand-hover`는 약 6.5:1 이상으로 여유 있게 통과한다. 반대로 다크 배경(`--color-background` ≈ #030712)에서는 `--color-brand-hover`가 약 3.06:1로 나빠지고 `--color-brand`가 약 4.91:1로 통과한다. 그래서 TOC의 활성 표시도 `.prose` 링크색과 똑같은 패턴(라이트: `brand-hover`, 다크: `brand`, 미디어 쿼리+`[data-theme]` 조합)을 그대로 재사용한다(`globals.css`의 `.toc-active-link`).
3. **레이아웃 조합 방식**: 본문(`max-w-[830px]`)과 TOC(240px 고정)를 `<div className="flex justify-center gap-12">`로 감싸 "그룹으로 가운데 정렬"한다. 본문에 `flex-1`+`mx-auto`를 함께 주는 방식은 시도했으나, flex 아이템의 자동 여백(`mx-auto`)과 `flex-grow`가 같은 여유 공간을 두고 경쟁해 TOC가 있을 때 본문이 가운데에서 살짝 밀리는 문제가 있어 채택하지 않았다.

## 범위 밖
- 레퍼런스의 "LLM용 복사" 버튼 등 TOC와 무관한 콘텐츠 기능(애초에 범위 밖으로 명시됨).
- 헤딩 레벨 4 이상은 다루지 않는다(design.md·TipTap 설정 모두 H1~H3만 다룬다 — H1은 문서 제목과 위계가 겹쳐 TOC 대상에서 원래도 제외).
- H2/H3 없이 만들어진 기존 문서는 TOC 없이 기존과 동일하게 보인다(헤딩이 하나도 없으면 컴포넌트 자체를 렌더링하지 않는다).
