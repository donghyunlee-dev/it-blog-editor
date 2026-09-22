"use client";

import { useContext, useEffect, useRef, useState, type RefObject } from "react";
import { Drawer } from "@sfood/ui";
import type { JSONContent } from "@tiptap/react";
import { TocRailContext } from "./EditorShell";

interface HeadingItem {
  key: string;
  level: 2 | 3;
  text: string;
  element: HTMLHeadingElement;
}

export interface TableOfContentsProps {
  /** 본문(RichTextEditor)을 감싸는 컨테이너 — 이 안의 h2/h3 DOM을 직접 훑는다. */
  containerRef: RefObject<HTMLElement | null>;
  /**
   * TipTap 문서(JSONContent) 자체는 읽지 않는다 — 이 prop은 "본문이 바뀔 때마다
   * 목차를 다시 훑어라"는 신호로만 쓰인다. ProseMirror는 `EditorContent`가 React
   * 렌더 트리 밖에서 직접 관리하는 DOM이라, 헤딩 제목·순서는 JSON을 파싱하는 대신
   * 실제 렌더링된 DOM(`h2`/`h3`)에서 그대로 읽는 것이 항상 화면과 정확히 일치한다.
   */
  doc: JSONContent;
}

/** containerRef를 감싸는 가장 가까운 스크롤 조상을 찾는다(읽기 전용 DOM 순회). */
function getScrollParent(el: HTMLElement): HTMLElement {
  let node: HTMLElement | null = el.parentElement;
  while (node) {
    const overflowY = getComputedStyle(node).overflowY;
    if (overflowY === "auto" || overflowY === "scroll") {
      return node;
    }
    node = node.parentElement;
  }
  return (document.scrollingElement as HTMLElement | null) ?? document.documentElement;
}

// globals.css의 `.prose h2, .prose h3 { scroll-margin-top: 4.5rem }`(72px)과 맞춘 값 —
// 스크롤로 헤딩을 "지나왔는지" 판정하는 일반적인 기준선이다(클릭 직후는 아래
// `pinnedByClick`가 이 기준선 자체를 우회하므로 이 값과의 정확한 일치 여부에 기대지
// 않는다, 2026-09-14 후속 참고).
const ACTIVATION_OFFSET = 72;
const BOTTOM_EPSILON = 2; // 스크롤이 바닥에 닿았는지 판정할 때 허용하는 서브픽셀 오차

/**
 * "지금 읽고 있는 섹션"을 스크롤 위치로 직접 계산한다(P8-8, 2026-09-14 — 아래 두 버그
 * 때문에 IntersectionObserver의 "화면 상단 30% 띠에 걸쳐 있는지"만으로는 부족했다).
 *
 * 1) 문서를 막 열었을 때: 첫 헤딩이 아직 그 띠 안에 들어오지 않은 위치라면(본문 상단에
 *    제목·태그 등 여백이 있는 문서는 흔하다) 아무 헤딩도 활성 표시되지 않았다.
 * 2) 문서 끝까지 스크롤했을 때: 마지막 헤딩 뒤에 남은 여백이 뷰포트 높이보다 짧으면
 *    스크롤이 최대치에 막혀 마지막 헤딩이 그 띠 안으로 절대 들어올 수 없다(스크롤이
 *    더 안 되니까) — 마지막 항목을 클릭해 scrollIntoView해도 도착점이 그 띠 밖이라
 *    똑같이 활성 표시가 안 바뀌었다.
 *
 * 그래서 "화면에 걸쳐있는지"가 아니라 스크롤이 실제로 어디까지 왔는지를 직접 읽는다 —
 * 아직 첫 헤딩도 지나지 않았으면 첫 헤딩을 기본값으로, 스크롤이 바닥에 닿았으면(더
 * 내려갈 데가 없으면) 위치 계산과 무관하게 무조건 마지막 헤딩을 활성으로 본다.
 *
 * `pinnedByClick`(2026-09-14 후속, 두 차례 수정): 방금 클릭해 이동 중인 헤딩이 있으면
 * — 바닥 판정 여부와 무관하게 — 항상 그 헤딩을 최우선으로 돌려준다.
 *
 * 1차 시도는 "바닥 판정일 때만" 클릭을 우선시켰다(헤딩 2개 이상이 화면에 한 번에
 * 들어올 만큼 문서/마지막 구간이 짧으면 바닥 판정이 거의 항상 참이 되고, 그 상태에서
 * 마지막이 아닌 항목을 클릭하면 smooth 스크롤이 안착하는 동안의 매 scroll 이벤트가
 * "바닥이니까 마지막 헤딩"으로 클릭 선택을 계속 덮어쓰는 문제 때문이었다). 그런데
 * "바닥이 아닐 때"도 같은 증상이 실제 브라우저에서 재현됐다 — `ACTIVATION_OFFSET`을
 * `scroll-margin-top`과 똑같이 맞춰뒀더니(72px) 클릭 직후 도착 지점이 그 경계값과
 * 거의 정확히 같아져서(실측 71.96~72.78px 사이로 흔들림 — 폰트 로딩으로 인한 미세한
 * 리플로우, 서브픽셀 반올림 등), 아주 조금만 기준선을 넘어도 방금 도착한 헤딩이
 * "지나온 헤딩"으로 안 잡히고 바로 위 헤딩이 계속 활성으로 남았다(실제 React 컴포넌트를
 * 진짜 브라우저에 올려 여러 헤딩을 연속 클릭해보며 재현 — happy-dom 기반 자동화
 * 테스트는 실제 레이아웃을 계산하지 않아 이 종류의 버그를 애초에 잡을 수 없었다).
 *
 * 결국 "스크롤 위치와 기준선의 정확한 일치"에 기대는 방식 자체가 클릭 시나리오에는
 * 맞지 않는다 — 클릭은 이미 "어디로 갈지"가 명확한 사용자 의도이므로, 도착 위치를
 * 굳이 다시 계산해 확인하지 않고 그 의도를 그대로 신뢰한다. 위치 기반 계산(아래)은
 * 사용자가 직접 스크롤하며 "지금 읽고 있는 곳"을 추적할 때만 쓴다 — 사용자가 실제로
 * 휠/터치로 스크롤하면(TableOfContents 컴포넌트의 wheel/touchmove 리스너) 이 고정이
 * 풀린다.
 */
function computeActiveHeading(
  headings: HeadingItem[],
  scrollParent: HTMLElement,
  pinnedByClick: HTMLHeadingElement | null
): HTMLHeadingElement | null {
  if (headings.length === 0) {
    return null;
  }

  if (pinnedByClick && headings.some((heading) => heading.element === pinnedByClick)) {
    return pinnedByClick;
  }

  const atBottom =
    scrollParent.scrollHeight - scrollParent.scrollTop - scrollParent.clientHeight <= BOTTOM_EPSILON;
  if (atBottom) {
    return headings[headings.length - 1].element;
  }

  const line = scrollParent.getBoundingClientRect().top + ACTIVATION_OFFSET;
  let candidate = headings[0].element;
  for (const heading of headings) {
    if (heading.element.getBoundingClientRect().top <= line) {
      candidate = heading.element;
    } else {
      break;
    }
  }
  return candidate;
}

/** P17-17: 좁은 화면에서 목차를 여는 드로어 트리거의 "☰" 아이콘. */
function TocToggleIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

/**
 * 문서 보기/편집 화면 우측 목차(P8-5, design.md "7. 우측 목차(TOC)" 절이 스펙).
 * 본문 H2/H3를 스캔해 목록을 만들고, 스크롤 위치에 따라 현재 섹션을 강조하며,
 * 클릭하면(또는 키보드로 포커스한 뒤 Enter를 누르면) 그 헤딩으로 스크롤 이동한다.
 * 헤딩이 하나도 없는 문서에서는 렌더링 자체를 하지 않는다(EditorSidebar.tsx의
 * "공유받은 문서" 영역이 비어 있을 때 렌더링을 생략하는 것과 같은 원칙).
 *
 * **`xl`(1280px) 이상에서는 자기 자리에 아무것도 그리지 않고 실제 목차 UI를
 * `EditorShell`의 우측 레일 슬롯(`TocRailContext`)으로 밀어 넣는다**(P8-8,
 * 2026-09-14 구조 변경). 예전엔 이 목차가 본문과 같은 `flex` 그룹의 한 아이템이라
 * `sticky`로 스크롤에 붙어있는 것처럼 흉내 내야 했는데, 그 flex 그룹의 `align-items`
 * 기본값(stretch)이 이 nav를 본문과 같은 높이(문서 전체 길이)로 늘려버려 `sticky`가
 * 계산상 아무 효과를 못 내는 문제가 반복됐다("스크롤하면 목차가 안 보인다"). 사용자가
 * 벤치마킹한 참고 사이트처럼, 왼쪽 사이드바와 동급으로 스크롤 영역 **밖**에 있는
 * 독립된 형제 컬럼으로 만들면 이 문제 자체가 구조적으로 생기지 않는다(`sticky` 계산이
 * 아예 필요 없다 — `EditorShell.tsx`의 `TocRailContext` 주석 참고).
 *
 * P17-17(외부 UI 개선 제안 검토 후 채택): `xl` 레일은 `md`(768px) 미만에서는 항상
 * 숨겨져 있었고(`EditorShell.tsx`의 `hidden w-60 shrink-0 xl:block`), `md`~`xl`
 * 사이(노트북처럼 뷰포트가 애매하게 좁은 구간)에서는 목차 자체에 접근할 방법이
 * 아예 없었다 — "TOC 공간에 비해 내용이 적으니 그 구간은 접힌 토글 버튼 하나로
 * 충분하다"는 외부 리뷰를 검토해 채택했다. 이 컴포넌트가 직접(레일과 별개로)
 * `md:flex xl:hidden`(→ `md`~`xl` 구간에서만 보임) 위치 고정 토글 버튼과, 그 버튼을
 * 누르면 열리는 `@sfood/ui`의 `Drawer`(우측에서 슬라이드, Escape·바깥 클릭으로 닫힘 —
 * 새 드로어 로직을 직접 구현하지 않는다)를 렌더링한다. 목록 자체(`renderHeadingList`)는
 * 레일과 드로어가 완전히 같은 마크업을 공유한다 — 표시 위치만 다르다.
 *
 * **이 컴포넌트는 ProseMirror가 관리하는 DOM(containerRef 안의 h2/h3)에 절대
 * 쓰기(mutate)를 하지 않는다** — 예전 구현은 헤딩마다 `element.id`를 직접 붙였는데,
 * ProseMirror의 `DOMObserver`는 자신이 그리지 않은 속성 변화를 "예상 밖 변경"으로
 * 보고 그 노드를 다시 그린다(`node_modules/prosemirror-view/src/domobserver.ts`의
 * `registerMutation`, `attributes` 타입 처리 확인). 그 다시 그림(redraw)은 childList
 * 변화라 우리 쪽 `MutationObserver`가 또 감지해 다시 id를 쓰고, ProseMirror가 또
 * 다시 그리고… 하는 무한 루프가 되어 실제로 탭이 멈췄다(2026-09-11, 실사용 중 발견).
 * 그래서 헤딩을 id가 아니라 **엘리먼트 참조 자체**로 추적한다 — 읽기만 하고 아무것도
 * 쓰지 않으므로 ProseMirror의 재조정을 절대 유발하지 않는다.
 */
export function TableOfContents({ containerRef, doc }: TableOfContentsProps) {
  const setTocRail = useContext(TocRailContext);
  const [headings, setHeadings] = useState<HeadingItem[]>([]);
  const [activeElement, setActiveElement] = useState<HTMLHeadingElement | null>(null);
  // P17-17: md~xl 구간 드로어의 열림 상태 — xl 레일(TocRailContext)과는 완전히 별개다.
  const [drawerOpen, setDrawerOpen] = useState(false);
  // 방금 목차를 클릭해 이동 중인 헤딩(computeActiveHeading의 pinnedByClick 주석 참고).
  // ref로 두는 이유: 이 값 자체가 화면에 그려지는 상태가 아니라(activeElement가 그
  // 역할이다) "다음 scroll 이벤트가 바닥 판정을 클릭보다 우선할지" 판단하는 내부
  // 신호일 뿐이라, 바뀔 때마다 리렌더를 일으킬 필요가 없다.
  const pinnedByClickRef = useRef<HTMLHeadingElement | null>(null);

  // 본문이 바뀔 때마다 실제 렌더링된 h2/h3를 다시 훑는다.
  //
  // doc prop 변경만으로는 부족하다 — RichTextEditor.tsx는 `useEditor({ immediatelyRender:
  // false })`(SSR/hydration 안전을 위한 TipTap 권장 설정)를 쓰는데, 이 옵션은 첫 렌더에서
  // 아무 DOM도 그리지 않고 마운트 후 다음 커밋에서야 실제 ProseMirror DOM을 붙인다. 문서를
  // 열기만 하고 아무것도 편집하지 않으면 onUpdate(=doc prop 변경)가 한 번도 안 불려서,
  // doc에만 의존하는 effect는 그 "뒤늦게 나타나는" 헤딩을 영영 못 찾는다(실사용 중 발견 —
  // 방금 만든 문서가 아니라 이미 저장된 문서를 열어서 읽기만 하면 목차가 안 보였다).
  // MutationObserver로 컨테이너 자체의 DOM 변화를 직접 감시해, 편집 여부와 무관하게 실제
  // 헤딩이 나타나거나 바뀔 때마다 다시 훑는다 — 위 클래스 주석대로 이 스캔은 읽기 전용이라
  // ProseMirror의 재조정을 유발하지 않는다.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      setHeadings([]);
      return;
    }

    function scan() {
      const elements = Array.from(container!.querySelectorAll<HTMLHeadingElement>("h2, h3"));
      setHeadings(
        elements.map((element, index) => ({
          key: `toc-heading-${index}`,
          level: element.tagName === "H2" ? 2 : 3,
          text: element.textContent?.trim() || "(제목 없음)",
          element,
        }))
      );
    }

    scan();
    const observer = new MutationObserver(scan);
    observer.observe(container, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
    // containerRef는 안정된 ref 객체라 의존성에 넣을 필요가 없다 — doc이 바뀔 때마다
    // observer를 새로 붙이는 것 자체는 불필요하지만(observer가 이미 모든 DOM 변화를
    // 감시한다), 재구독 비용이 낮고 이전 동작(doc 변경 시 즉시 재훑기)과의 호환을 위해
    // 그대로 의존성에 둔다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc]);

  // 스크롤 위치에 따라 "지금 읽고 있는 섹션"을 다시 계산한다. computeActiveHeading의
  // 주석에 그 이유를 적었다 — 초기 진입/바닥 스크롤 두 경우를 IntersectionObserver의
  // "화면 상단 띠"만으로는 못 잡아서, 직접 scroll/resize를 구독해 계산한다.
  useEffect(() => {
    if (headings.length === 0) {
      // headings(외부 시스템 — 본문 DOM 스캔 결과)가 바뀔 때만 반응하는 동기화라
      // EditorSidebar.tsx의 focusFolderId 처리와 같은 이유로 이 규칙의 일반 사례
      // (effect 안에서의 무조건적 setState)에 해당하지 않는다.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setActiveElement(null);
      return;
    }
    const container = containerRef.current;
    if (!container) {
      return;
    }
    const scrollParent = getScrollParent(container);

    function update() {
      setActiveElement(computeActiveHeading(headings, scrollParent, pinnedByClickRef.current));
    }

    // 실제로 사용자가 손으로 스크롤했다는 신호(휠·트랙패드·터치)가 오면, 클릭으로 고정해
    // 둔 헤딩을 놓아준다 — 그래야 진짜로 바닥까지 스크롤했을 때는 원래 의도(마지막 헤딩
    // 활성화)대로 동작한다. `scrollIntoView`가 만드는 프로그램적 스크롤은 이 이벤트들을
    // 발생시키지 않으므로, 클릭 직후 그 스크롤이 안착하는 동안에는 계속 고정된 채 남는다.
    function releasePin() {
      pinnedByClickRef.current = null;
    }

    update();
    scrollParent.addEventListener("scroll", update, { passive: true });
    scrollParent.addEventListener("wheel", releasePin, { passive: true });
    scrollParent.addEventListener("touchmove", releasePin, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      scrollParent.removeEventListener("scroll", update);
      scrollParent.removeEventListener("wheel", releasePin);
      scrollParent.removeEventListener("touchmove", releasePin);
      window.removeEventListener("resize", update);
    };
    // containerRef는 안정된 ref 객체라 의존성에 넣을 필요가 없다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [headings]);

  // 레일(xl 이상)과 드로어(md~xl, 아래 return)가 완전히 같은 목록을 그린다 — 표시
  // 위치와 감싸는 틀(레일은 헤더 높이 맞춤 spacer + 자체 여백, 드로어는 `Drawer`의
  // `title`/패딩)만 다르다.
  function renderHeadingList() {
    return (
      <ul className="flex flex-col gap-1.5">
        {headings.map((heading) => {
          const isActive = heading.element === activeElement;
          return (
            <li key={heading.key} style={{ paddingLeft: heading.level === 3 ? 22 : 10 }}>
              {/*
                href="#"만 두고 실제 이동은 onClick에서 엘리먼트 참조로 직접
                scrollIntoView한다 — 예전처럼 href="#id"로 진짜 앵커 이동을
                겸하려면 헤딩에 id를 붙여야 하는데, 그건 ProseMirror가 관리하는
                DOM에 쓰기를 하는 것이라 위 클래스 주석의 무한 루프를 다시 만든다.
              */}
              <a
                href="#"
                aria-current={isActive ? "true" : undefined}
                onClick={(event) => {
                  event.preventDefault();
                  // 이 클릭으로 이동 중인 헤딩을 "고정"해 둔다 — computeActiveHeading의
                  // pinnedByClick 주석 참고. 문서(또는 마지막 구간)가 짧아 화면에 헤딩이
                  // 2개 이상 한 번에 보일 정도면 "바닥" 판정이 거의 항상 참이 되는데,
                  // 이 고정이 없으면 smooth 스크롤이 안착하는 동안의 매 scroll 이벤트가
                  // 그때마다 "바닥이니까 마지막 헤딩"으로 되돌려서 클릭이 사실상
                  // 무효화됐다(2026-09-14 실사용 중 발견). 사용자가 실제로 휠/터치로
                  // 스크롤하면(releasePin) 이 고정을 풀어 원래 동작으로 돌아간다.
                  pinnedByClickRef.current = heading.element;
                  heading.element.scrollIntoView({ behavior: "smooth", block: "start" });
                  // 클릭한 항목을 즉시 활성으로 본다(낙관적 갱신) — 그러지 않으면
                  // smooth 스크롤이 안착하기 전까지 화면에는 예전 활성 항목이 그대로
                  // 남아 있어, 클릭이 반영되기까지 잠깐 아무 반응이 없는 것처럼 보인다.
                  setActiveElement(heading.element);
                  // P17-17: 드로어에서 항목을 클릭하면 그 목적(목차로 이동)을 이미
                  // 이뤘으므로 드로어를 닫는다. xl 레일에서는 이 setter가 아무 효과가
                  // 없다(드로어 자체가 md~xl 구간에서만 렌더링되어 열려 있을 수 없다).
                  setDrawerOpen(false);
                }}
                className={
                  "block truncate border-l-2 py-0.5 pl-2 text-xs transition-colors duration-default " +
                  (isActive ? "toc-active-link" : "border-transparent text-muted hover:text-foreground")
                }
              >
                {heading.text}
              </a>
            </li>
          );
        })}
      </ul>
    );
  }

  // EditorShell의 우측 레일 슬롯으로 실제 UI를 밀어 넣는다(위 클래스 주석 참고).
  //
  // P17-26: 예전엔 headings가 비면 슬롯 자체를 비웠다(null) — 그러면 EditorShell의
  // `{tocRail && ...}` 조건 때문에 레일 컬럼(w-60)이 통째로 사라져, 본문을 감싼
  // `flex-1` 영역의 실제 가용 폭이 바뀐다. 문서를 열 때 본문 DOM이 마운트 다음 커밋에야
  // 붙는 타이밍(위 클래스 주석의 `immediatelyRender: false` 설명 참고)과 겹치면, 처음엔
  // 헤딩이 0개로 스캔돼 레일 없이 그려졌다가 헤딩이 뒤늦게 발견되며 레일이 튀어나오는
  // 순간 본문 폭이 좁아져 좌우로 밀리는 것처럼 보였다(2026-09-22, 사용자 지적 — "toc가
  // 있을 때와 없을 때, 컨텐츠 사이즈가 맞춰지는 과정에서 좌우로 흔들린다").
  //
  // 이제는 헤딩이 있든 없든 바깥 spacer(`<div className="h-14 ...">`)는 항상 레일에
  // 밀어 넣어 컬럼 자체(가로 폭)는 마운트 시점부터 고정해 두고, 실제 목차
  // 콘텐츠(`<nav aria-label="이 페이지">`)만 헤딩이 있을 때 그 안에 조건부로 넣는다 —
  // 그래야 헤딩 스캔 결과가 언제 바뀌든 폭은 그대로고 안쪽 내용만 나타나거나
  // 사라진다. 헤딩이 하나도 없는 문서에서 "이 페이지" 목차 랜드마크 자체가 없어야
  // 한다는 접근성 계약(TableOfContents.test.tsx)은 그대로 유지된다 — 바깥 spacer는
  // `nav`가 아닌 평범한 `div`라 보조기기에 노출되지 않는다.
  //
  // Provider 밖(예: 테스트에서 Context 없이 단독 렌더)에서는 setTocRail이 null이라
  // 아무것도 하지 않는다.
  useEffect(() => {
    if (!setTocRail) {
      return;
    }

    setTocRail(
      <div className="flex h-full flex-col">
        {/*
          문서 헤더(DocumentEditor.tsx의 `<header className="h-14 ...">`)는 본문 스크롤
          영역 안에만 있고, 이 레일은 그 밖의 독립된 컬럼이라 자동으로 헤더 밑에서
          시작하지 않는다 — 같은 이유로 왼쪽 사이드바(EditorSidebar.tsx)도 자기만의
          h-14 자리표시 행을 맨 위에 둬서 헤더와 높이를 맞춘다(그 파일의 "두 헤더 모두
          못을 박아" 주석 참고). 이 spacer가 없으면 TOC가 화면 맨 위(헤더보다 위)에서
          시작해 헤더를 무시하고 튀어나온 것처럼 보인다(2026-09-14 실사용 중 발견).
        */}
        <div className="h-14 shrink-0 border-b border-border" aria-hidden="true" />
        {headings.length > 0 && (
          // 좌우 여백(pl-12) 없이 레일 전체 폭으로 그린다 — 본문↔TOC 거터(design.md
          // "본문↔TOC 거터 48px")는 아래 콘텐츠 쪽에만 pl-12로 준다. 위 spacer에까지
          // pl-12를 주면 border-b가 48px만큼 안쪽에서 시작해, 본문 헤더의 border-b와
          // 만나지 못하고 끊어져 보인다(2026-09-14 실사용 중 발견 — "헤더 라인 연결이
          // 안 되어 있어서 분리되어 보인다").
          <nav aria-label="이 페이지" className="flex-1 overflow-y-auto pt-10 pr-2 pl-12">
            <p className="mb-3 text-xs font-semibold text-foreground">이 페이지</p>
            {renderHeadingList()}
          </nav>
        )}
      </div>
    );
    return () => setTocRail(null);
    // renderHeadingList는 매 렌더마다 새로 만들어지는 클로저지만, 그 안에서 읽는
    // 값(headings/activeElement)과 호출하는 setter(setActiveElement/setDrawerOpen)는
    // 이미 안정적이거나 이미 deps에 있다 — 함수 자체를 deps에 추가하면 사실상 매
    // 렌더마다 이 effect가 다시 실행되어, headings/activeElement가 그대로인데도
    // setTocRail을 불필요하게 다시 호출하게 된다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [headings, activeElement, setTocRail]);

  if (headings.length === 0) {
    return null;
  }

  return (
    <>
      {/* P17-17: md(768px)~xl(1280px) 구간 전용 — 그 아래(모바일)는 계속 숨기고,
          xl 이상은 위 레일이 이미 항상 보이므로 이 버튼은 필요 없다. */}
      <button
        type="button"
        onClick={() => setDrawerOpen(true)}
        className="fixed right-4 top-3 z-30 hidden items-center gap-1.5 rounded-btn border border-border bg-surface px-3 py-1.5 text-xs font-medium text-foreground shadow-md transition-colors duration-default hover:bg-surface-raised md:flex xl:hidden"
      >
        <TocToggleIcon />
        이 페이지
      </button>
      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} side="right" title="이 페이지">
        {renderHeadingList()}
      </Drawer>
    </>
  );
}
