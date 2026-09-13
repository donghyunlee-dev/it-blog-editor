"use client";

import { useEffect, useState, type RefObject } from "react";
import type { JSONContent } from "@tiptap/react";

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

/**
 * 문서 보기/편집 화면 우측 목차(P8-5, design.md "7. 우측 목차(TOC)" 절이 스펙).
 * 본문 H2/H3를 스캔해 목록을 만들고, 스크롤 위치에 따라 현재 섹션을 강조하며,
 * 클릭하면(또는 키보드로 포커스한 뒤 Enter를 누르면) 그 헤딩으로 스크롤 이동한다.
 * 헤딩이 하나도 없는 문서에서는 렌더링 자체를 하지 않는다(EditorSidebar.tsx의
 * "공유받은 문서" 영역이 비어 있을 때 렌더링을 생략하는 것과 같은 원칙).
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

  // 스크롤 위치에 따라 "지금 읽고 있는 섹션"을 강조한다. 여러 헤딩이 동시에 뷰포트에
  // 들어와도(짧은 섹션이 이어질 때 흔함) 문서 순서상 가장 아래(나중) 것을 활성으로
  // 본다 — 스크롤이 내려가며 한 헤딩을 지나칠 때 다음 섹션으로 자연스럽게 넘어가는
  // 흔한 패턴이다. rootMargin 상단(-64px)은 sticky 헤더(56px)를 감안한 여유,
  // 하단(-70%)은 화면 위쪽 30% 구간에 걸린 헤딩만 "지금 섹션"으로 잡기 위함이다.
  useEffect(() => {
    if (headings.length === 0) {
      // headings(외부 시스템 — 본문 DOM 스캔 결과)가 바뀔 때만 반응하는 동기화라
      // EditorSidebar.tsx의 focusFolderId 처리와 같은 이유로 이 규칙의 일반 사례
      // (effect 안에서의 무조건적 setState)에 해당하지 않는다.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setActiveElement(null);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting).map((entry) => entry.target);
        if (visible.length > 0) {
          setActiveElement(visible[visible.length - 1] as HTMLHeadingElement);
        }
      },
      { rootMargin: "-64px 0px -70% 0px", threshold: 0 }
    );
    for (const heading of headings) {
      observer.observe(heading.element);
    }
    return () => observer.disconnect();
  }, [headings]);

  if (headings.length === 0) {
    return null;
  }

  return (
    // ≥1280px(Tailwind 기본 xl 브레이크포인트)에서만 노출 — design.md "2. 반응형
    // 붕괴 지점" 실측(레퍼런스가 1024~1280px 사이에서 TOC를 숨김)을 그대로 따른다.
    // sticky top-14(56px)로 본문 헤더 밑에 붙고, 뷰포트보다 목차가 길면 자기 영역
    // 안에서만 스크롤된다(본문 스크롤과 분리).
    //
    // self-start는 장식이 아니라 sticky가 실제로 동작하기 위한 필수 조건이다 — 이
    // nav는 DocumentEditor.tsx의 `flex justify-center gap-12` 행의 아이템인데,
    // align-items 기본값(stretch)을 그대로 두면 이 nav가 옆 본문 칼럼과 같은 높이
    // (문서 전체 길이, 종종 수천 px)로 강제로 늘어난다. 그 늘어난 상태에서는
    // sticky가 계산상 아무 효과를 못 내(스크롤해도 top-14에 붙지 않고 본문과 같이
    // 흘러가 버림 — 실사용 중 발견: "스크롤하면 목차가 안 보인다") self-start로
    // nav 자신의 콘텐츠 높이만큼만 박스를 갖게 해야 sticky가 실제로 붙는다.
    <nav
      aria-label="이 페이지"
      className="sticky top-14 hidden w-60 shrink-0 self-start pt-10 xl:block"
    >
      <div className="max-h-[calc(100vh-3.5rem)] overflow-y-auto pr-2">
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
}
