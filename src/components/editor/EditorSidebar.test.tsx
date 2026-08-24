import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EditorSidebar } from "./EditorSidebar";
import type { DocumentSummary } from "@/lib/editor/documents";

const DOCS: DocumentSummary[] = [
  {
    pageId: "1",
    title: "문서A",
    updatedAt: "2026-08-21T00:00:00.000Z",
    isPublished: true,
    tags: ["React"],
  },
  {
    pageId: "2",
    title: "문서B",
    updatedAt: "2026-08-21T00:00:00.000Z",
    isPublished: false,
    tags: ["Backend"],
  },
];

describe("EditorSidebar", () => {
  it("문서 목록과 상태 뱃지를 보여준다", () => {
    render(<EditorSidebar documents={DOCS} />);

    expect(screen.getByText("문서A")).toBeInTheDocument();
    expect(screen.getByText("문서B")).toBeInTheDocument();
    expect(screen.getByText("게시됨")).toBeInTheDocument();
    expect(screen.getByText("초안")).toBeInTheDocument();
  });

  it("문서에 붙은 태그를 함께 보여준다", () => {
    render(<EditorSidebar documents={DOCS} />);

    // "React"/"Backend"는 상단 태그 필터 칩(tab)에도, 문서 목록의 Tag 표시에도
    // 나오므로, 문서 목록 영역(aria-label="문서 목록")으로 좁혀서 확인한다.
    const list = screen.getByRole("navigation", { name: "문서 목록" });
    expect(within(list).getByText("React")).toBeInTheDocument();
    expect(within(list).getByText("Backend")).toBeInTheDocument();
  });

  it("태그를 클릭하면 그 태그가 붙은 문서만 보여준다", async () => {
    render(<EditorSidebar documents={DOCS} />);

    // 태그 필터 칩은 문서 목록에도 같은 텍스트("React")가 나오므로,
    // ChipGroup이 렌더링하는 role="tab" 칩으로 좁혀서 클릭한다.
    await userEvent.click(screen.getByRole("tab", { name: "React" }));

    expect(screen.getByText("문서A")).toBeInTheDocument();
    expect(screen.queryByText("문서B")).not.toBeInTheDocument();
  });

  it("같은 태그를 다시 클릭하면 필터가 해제된다", async () => {
    render(<EditorSidebar documents={DOCS} />);

    const reactTab = screen.getByRole("tab", { name: "React" });
    await userEvent.click(reactTab);
    await userEvent.click(reactTab);

    expect(screen.getByText("문서A")).toBeInTheDocument();
    expect(screen.getByText("문서B")).toBeInTheDocument();
  });

  it("문서가 없으면 빈 상태를 보여준다", () => {
    render(<EditorSidebar documents={[]} />);

    expect(screen.getByText("아직 작성한 문서가 없습니다.")).toBeInTheDocument();
  });

  it("새 문서 링크를 제공한다", () => {
    render(<EditorSidebar documents={DOCS} />);

    expect(screen.getByRole("link", { name: "새 문서" })).toHaveAttribute(
      "href",
      "/editor/new"
    );
  });
});
