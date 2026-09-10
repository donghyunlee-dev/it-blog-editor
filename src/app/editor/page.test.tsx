import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import EditorHomePage from "./page";

describe("EditorHomePage(랜딩 화면)", () => {
  it("히어로 영역에 새 문서 작성 링크와 검색 버튼을 함께 보여준다(P8-4)", () => {
    render(<EditorHomePage />);

    expect(screen.getByRole("link", { name: /새 문서 작성/ })).toHaveAttribute(
      "href",
      "/editor/new"
    );
    expect(screen.getByRole("button", { name: "전체 검색 (Ctrl+K)" })).toBeInTheDocument();
    expect(screen.getByText("문서 검색...")).toBeInTheDocument();
  });
});
