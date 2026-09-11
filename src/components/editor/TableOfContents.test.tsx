import { useEffect, useRef, useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider } from "@sfood/ui";
import type { JSONContent } from "@tiptap/react";
import { TableOfContents } from "./TableOfContents";
import { RichTextEditor } from "./RichTextEditor";

const EMPTY_DOC: JSONContent = { type: "doc", content: [] };

/**
 * TableOfContents는 doc(JSONContent)을 직접 파싱하지 않고, containerRef 안의 실제
 * 렌더링된 h2/h3 DOM을 훑는다(RichTextEditor.tsx가 관리하는 TipTap/ProseMirror DOM을
 * 실제 통합 상황에서 대신하는 자리) — 그래서 테스트도 TipTap 없이 순수 HTML로 그
 * "렌더링된 본문"을 흉내 낸다. `doc` prop은 재스캔 트리거로만 쓰이므로, 매번 다른
 * 참조를 주면(예: `{ ...EMPTY_DOC }`) 의도적으로 재스캔을 유발할 수 있다.
 */
function Harness({
  html,
  doc = EMPTY_DOC,
}: {
  html: string;
  doc?: JSONContent;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  return (
    <div>
      <div ref={containerRef} dangerouslySetInnerHTML={{ __html: html }} />
      <TableOfContents containerRef={containerRef} doc={doc} />
    </div>
  );
}

/** 클릭 한 번으로 목차 항목을 옮겨가며 doc 참조를 매번 바꿔, 매 렌더 재스캔을 강제한다. */
function RescanHarness({ initialHtml, nextHtml }: { initialHtml: string; nextHtml: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [html, setHtml] = useState(initialHtml);
  return (
    <div>
      <div ref={containerRef} dangerouslySetInnerHTML={{ __html: html }} />
      <button type="button" onClick={() => setHtml(nextHtml)}>
        본문 바꾸기
      </button>
      <TableOfContents containerRef={containerRef} doc={{ type: "doc", content: [{ type: "text", text: html }] }} />
    </div>
  );
}

const { observe, unobserve, disconnect } = vi.hoisted(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));
let intersectionCallback: IntersectionObserverCallback | null = null;

beforeEach(() => {
  observe.mockClear();
  unobserve.mockClear();
  disconnect.mockClear();
  intersectionCallback = null;
  vi.stubGlobal(
    "IntersectionObserver",
    vi.fn().mockImplementation(function (this: unknown, callback: IntersectionObserverCallback) {
      intersectionCallback = callback;
      return { observe, unobserve, disconnect, takeRecords: () => [] };
    })
  );
});

function fireIntersections(entries: Array<{ element: Element; isIntersecting: boolean }>) {
  intersectionCallback?.(
    entries.map((entry) => ({
      target: entry.element,
      isIntersecting: entry.isIntersecting,
    })) as IntersectionObserverEntry[],
    {} as IntersectionObserver
  );
}

describe("TableOfContents", () => {
  it("h2/h3가 하나도 없으면 아무것도 렌더링하지 않는다", () => {
    render(<Harness html="<p>본문만 있고 헤딩은 없음</p>" />);

    expect(screen.queryByRole("navigation", { name: "이 페이지" })).not.toBeInTheDocument();
  });

  it("h2/h3를 문서 순서대로 목록에 보여준다", () => {
    render(
      <Harness html="<h2>첫 번째 섹션</h2><p>본문</p><h3>하위 섹션</h3><h2>두 번째 섹션</h2>" />
    );

    const nav = screen.getByRole("navigation", { name: "이 페이지" });
    const links = within(nav).getAllByRole("link");
    expect(links.map((link) => link.textContent)).toEqual(["첫 번째 섹션", "하위 섹션", "두 번째 섹션"]);
  });

  it("h3는 h2보다 더 들여쓰기된다", () => {
    render(<Harness html="<h2>섹션</h2><h3>하위 섹션</h3>" />);

    const h2Link = screen.getByRole("link", { name: "섹션" });
    const h3Link = screen.getByRole("link", { name: "하위 섹션" });
    const h2Padding = parseInt((h2Link.closest("li") as HTMLElement).style.paddingLeft, 10);
    const h3Padding = parseInt((h3Link.closest("li") as HTMLElement).style.paddingLeft, 10);

    expect(h3Padding).toBeGreaterThan(h2Padding);
  });

  it("항목을 클릭하면 해당 헤딩으로 스크롤 이동한다", async () => {
    const user = userEvent.setup();
    render(<Harness html="<h2>목표 섹션</h2>" />);
    const scrollSpy = vi.fn();
    Element.prototype.scrollIntoView = scrollSpy;

    await user.click(screen.getByRole("link", { name: "목표 섹션" }));

    expect(scrollSpy).toHaveBeenCalledWith({ behavior: "smooth", block: "start" });
  });

  it("빈 제목 헤딩은 '(제목 없음)'으로 보여준다", () => {
    render(<Harness html="<h2></h2>" />);

    expect(screen.getByRole("link", { name: "(제목 없음)" })).toBeInTheDocument();
  });

  it("IntersectionObserver가 교차를 보고하면 그 항목에 aria-current='true'가 붙는다", async () => {
    render(<Harness html="<h2>섹션 A</h2><h2>섹션 B</h2>" />);
    const linkA = screen.getByRole("link", { name: "섹션 A" });
    const linkB = screen.getByRole("link", { name: "섹션 B" });
    const [headingA] = document.querySelectorAll("h2");

    expect(linkA).not.toHaveAttribute("aria-current");
    expect(linkB).not.toHaveAttribute("aria-current");

    fireIntersections([{ element: headingA, isIntersecting: true }]);

    await waitFor(() => expect(linkA).toHaveAttribute("aria-current", "true"));
    expect(linkB).not.toHaveAttribute("aria-current");
  });

  it("여러 헤딩이 동시에 교차하면 문서 순서상 가장 나중(아래) 것을 활성으로 본다", async () => {
    render(<Harness html="<h2>섹션 A</h2><h2>섹션 B</h2>" />);
    const linkA = screen.getByRole("link", { name: "섹션 A" });
    const linkB = screen.getByRole("link", { name: "섹션 B" });
    const [headingA, headingB] = document.querySelectorAll("h2");

    fireIntersections([
      { element: headingA, isIntersecting: true },
      { element: headingB, isIntersecting: true },
    ]);

    await waitFor(() => expect(linkB).toHaveAttribute("aria-current", "true"));
    expect(linkA).not.toHaveAttribute("aria-current");
  });

  it("헤딩 엘리먼트에 어떤 속성도 쓰지 않는다(ProseMirror가 관리하는 DOM을 건드리면 그 변화를 감지해 무한 재조정 루프를 만드는 실제 버그를 막기 위함, 2026-09-11 실사용 중 발견 — '## 중제목'을 입력하면 사이트가 멈췄다)", () => {
    render(<Harness html="<h2>섹션</h2><h3>하위 섹션</h3>" />);

    for (const heading of document.querySelectorAll("h2, h3")) {
      expect(heading.attributes.length).toBe(0);
    }
  });

  it("본문 DOM이 마운트 이후 비동기로 채워져도(TipTap의 immediatelyRender:false 타이밍 재현) 목차가 뒤늦게라도 나타난다", async () => {
    function AsyncMountHarness() {
      const containerRef = useRef<HTMLDivElement>(null);
      useEffect(() => {
        // useEditor({ immediatelyRender: false })는 첫 렌더에서는 아무 DOM도 그리지
        // 않고, 마운트 후 다음 커밋에서야 실제 ProseMirror DOM(h2/h3 포함)을 붙인다 —
        // 그 사이 doc prop은 전혀 바뀌지 않는다(사용자가 편집하지 않고 읽기만 해도
        // 목차가 보여야 하는데, doc은 onUpdate가 있어야만 바뀐다). setTimeout으로
        // "다음 커밋"을 흉내 낸다.
        const timer = setTimeout(() => {
          if (containerRef.current) {
            containerRef.current.innerHTML = "<h2>나중에 나타난 섹션</h2>";
          }
        }, 0);
        return () => clearTimeout(timer);
      }, []);
      return (
        <div>
          <div ref={containerRef} />
          <TableOfContents containerRef={containerRef} doc={EMPTY_DOC} />
        </div>
      );
    }

    render(<AsyncMountHarness />);

    expect(screen.queryByRole("navigation", { name: "이 페이지" })).not.toBeInTheDocument();

    expect(await screen.findByRole("link", { name: "나중에 나타난 섹션" })).toBeInTheDocument();
  });

  describe("실제 TipTap/ProseMirror 에디터와의 통합(2026-09-11, 실사용 중 발견한 무한 루프 재현)", () => {
    /**
     * 합성 HTML 대신 실제 RichTextEditor(TipTap)를 마운트한다 — ProseMirror 자신의
     * DOMObserver(node_modules/prosemirror-view/src/domobserver.ts)가 같은 컨테이너를
     * 동시에 감시하는 실제 조건을 재현해야, "우리 쪽이 그 DOM에 아무것도 쓰지 않는다"는
     * 게 진짜로 안전한지 확인할 수 있다.
     */
    function Integration({ content }: { content: JSONContent }) {
      const containerRef = useRef<HTMLDivElement>(null);
      return (
        <ToastProvider>
          <div ref={containerRef}>
            <RichTextEditor content={content} onChange={() => {}} />
          </div>
          <TableOfContents containerRef={containerRef} doc={content} />
        </ToastProvider>
      );
    }

    it("실제 ProseMirror DOM에 헤딩이 새로 나타나도 목차가 갱신되고, 그 헤딩에는 아무 속성도 남기지 않는다(무한 재조정 루프 방지)", async () => {
      const { container } = render(
        <Integration
          content={{
            type: "doc",
            content: [
              { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "첫 섹션" }] },
            ],
          }}
        />
      );

      // immediatelyRender:false라 마운트 후에야 실제 ProseMirror DOM이 붙는다 — 이 링크가
      // 나타나는 것 자체가 이미 "문서를 열기만 해도 목차가 안 보이던" 원래 P8-5 버그가
      // 고쳐졌다는 증거다.
      expect(await screen.findByRole("link", { name: "첫 섹션" })).toBeInTheDocument();

      const proseMirrorRoot = container.querySelector(".ProseMirror") as HTMLElement;
      const newHeading = document.createElement("h2");
      newHeading.textContent = "새로 생긴 섹션";
      proseMirrorRoot.appendChild(newHeading);

      // ProseMirror 자신의 DOMObserver도 이 삽입을 동시에 감지한다("## " 같은 마크다운
      // 단축키로 헤딩이 생길 때와 같은 조건). 우리 컴포넌트가 이 헤딩에 아무것도
      // 쓰지 않아야(예전엔 id를 썼다) ProseMirror의 재조정을 유발하지 않고, 무한 루프
      // (2026-09-11 실제 버그 — "## 중제목"을 입력하면 사이트가 멈췄다) 없이 조용히
      // 목차만 갱신된다. 이 테스트가 타임아웃 없이 끝나는 것 자체가 그 무한 루프가
      // 재발하지 않았다는 증거다.
      expect(await screen.findByRole("link", { name: "새로 생긴 섹션" })).toBeInTheDocument();
      expect(newHeading.attributes.length).toBe(0);
    });
  });

  it("doc이 바뀌면(본문 변경) 목차를 다시 훑어 새 헤딩을 반영한다", async () => {
    const user = userEvent.setup();
    render(
      <RescanHarness
        initialHtml="<h2>원래 섹션</h2>"
        nextHtml="<h2>원래 섹션</h2><h2>새로 추가된 섹션</h2>"
      />
    );

    expect(screen.getByRole("navigation", { name: "이 페이지" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "새로 추가된 섹션" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "본문 바꾸기" }));

    expect(await screen.findByRole("link", { name: "새로 추가된 섹션" })).toBeInTheDocument();
  });
});
