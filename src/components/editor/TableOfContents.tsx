"use client";

import { useContext, useEffect, useState, type RefObject } from "react";
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

const ACTIVATION_OFFSET = 64; // 문서 헤더(h-14=56px) 아래로 살짝 여유를 둔 "지금 섹션" 기준선
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
 */
function computeActiveHeading(
  headings: HeadingItem[],
  scrollParent: HTMLElement
): HTMLHeadingElement | null {
  if (headings.length === 0) {
    return null;
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

/**
 * 문서 보기/편집 화면 우측 목차(P8-5, design.md "7. 우측 목차(TOC)" 절이 스펙).
 * 본문 H2/H3를 스캔해 목록을 만들고, 스크롤 위치에 따라 현재 섹션을 강조하며,
 * 클릭하면(또는 키보드로 포커스한 뒤 Enter를 누르면) 그 헤딩으로 스크롤 이동한다.
 * 헤딩이 하나도 없는 문서에서는 렌더링 자체를 하지 않는다(EditorSidebar.tsx의
 * "공유받은 문서" 영역이 비어 있을 때 렌더링을 생략하는 것과 같은 원칙).
 *
 * **이 컴포넌트는 자기 자리에는 아무것도 그리지 않고 항상 `null`을 반환한다**(P8-8,
 * 2026-09-14 구조 변경). 실제 목차 UI는 `EditorShell`의 우측 레일 슬롯(`TocRailContext`)
 * 으로 밀어 넣는다 — 예전엔 이 목차가 본문과 같은 `flex` 그룹의 한 아이템이라
 * `sticky`로 스크롤에 붙어있는 것처럼 흉내 내야 했는데, 그 flex 그룹의 `align-items`
 * 기본값(stretch)이 이 nav를 본문과 같은 높이(문서 전체 길이)로 늘려버려 `sticky`가
 * 계산상 아무 효과를 못 내는 문제가 반복됐다("스크롤하면 목차가 안 보인다"). 사용자가
 * 벤치마킹한 참고 사이트처럼, 왼쪽 사이드바와 동급으로 스크롤 영역 **밖**에 있는
 * 독립된 형제 컬럼으로 만들면 이 문제 자체가 구조적으로 생기지 않는다(`sticky` 계산이
 * 아예 필요 없다 — `EditorShell.tsx`의 `TocRailContext` 주석 참고).
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
      setActiveElement(computeActiveHeading(headings, scrollParent));
    }

    update();
    scrollParent.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      scrollParent.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
    // containerRef는 안정된 ref 객체라 의존성에 넣을 필요가 없다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [headings]);

  // EditorShell의 우측 레일 슬롯으로 실제 UI를 밀어 넣는다(위 클래스 주석 참고) —
  // headings가 비면 슬롯을 비워(null) 레일 자체가 사라지게 한다(EditorShell.tsx의
  // `{tocRail && ...}` 조건). Provider 밖(예: 테스트에서 Context 없이 단독 렌더)에서는
  // setTocRail이 null이라 아무것도 하지 않는다.
  useEffect(() => {
    if (!setTocRail) {
      return;
    }
    if (headings.length === 0) {
      setTocRail(null);
      return;
    }

    setTocRail(
      <nav aria-label="이 페이지" className="flex h-full flex-col pt-10 pl-12">
        <div className="flex-1 overflow-y-auto pr-2">
          <p className="mb-3 text-xs font-semibold text-foreground">이 페이지</p>
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
                      heading.element.scrollIntoView({ behavior: "smooth", block: "start" });
                      // 클릭한 항목을 즉시 활성으로 본다(낙관적 갱신) — 그러지 않으면
                      // 스크롤이 바닥 근처에 있는 동안, "바닥에 닿았으면 마지막 헤딩을
                      // 무조건 활성으로 본다"는 아래 computeActiveHeading의 바닥-고정
                      // 규칙이 클릭 직후의 다음 scroll 이벤트에서 이 선택을 곧바로
                      // 덮어써버려, 마지막 항목보다 위에 있는 항목은 클릭해도 활성
                      // 표시가 안 바뀌는 것처럼 보였다(2026-09-14 실사용 중 발견). smooth
                      // 스크롤이 끝나 실제 위치가 안정되면 이후 scroll 이벤트가 이 값을
                      // 다시 계산해 확정한다 — 그 사이 잠깐 보여주는 낙관적 표시일 뿐이다.
                      setActiveElement(heading.element);
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
        </div>
      </nav>
    );
    return () => setTocRail(null);
  }, [headings, activeElement, setTocRail]);

  return null;
}
