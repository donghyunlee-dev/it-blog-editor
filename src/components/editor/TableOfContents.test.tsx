import { useRef, useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { JSONContent } from "@tiptap/react";
import { TableOfContents } from "./TableOfContents";

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

function fireIntersections(entries: Array<{ id: string; isIntersecting: boolean }>) {
  intersectionCallback?.(
    entries.map((entry) => ({
      target: document.getElementById(entry.id) as Element,
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
    const idA = linkA.getAttribute("href")?.slice(1) ?? "";

    expect(linkA).not.toHaveAttribute("aria-current");
    expect(linkB).not.toHaveAttribute("aria-current");

    fireIntersections([{ id: idA, isIntersecting: true }]);

    await waitFor(() => expect(linkA).toHaveAttribute("aria-current", "true"));
    expect(linkB).not.toHaveAttribute("aria-current");
  });

  it("여러 헤딩이 동시에 교차하면 문서 순서상 가장 나중(아래) 것을 활성으로 본다", async () => {
    render(<Harness html="<h2>섹션 A</h2><h2>섹션 B</h2>" />);
    const linkA = screen.getByRole("link", { name: "섹션 A" });
    const linkB = screen.getByRole("link", { name: "섹션 B" });
    const idA = linkA.getAttribute("href")?.slice(1) ?? "";
    const idB = linkB.getAttribute("href")?.slice(1) ?? "";

    fireIntersections([
      { id: idA, isIntersecting: true },
      { id: idB, isIntersecting: true },
    ]);

    await waitFor(() => expect(linkB).toHaveAttribute("aria-current", "true"));
    expect(linkA).not.toHaveAttribute("aria-current");
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
