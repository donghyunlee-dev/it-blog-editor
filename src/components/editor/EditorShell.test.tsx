import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EditorShell } from "./EditorShell";
import type { DocumentSummary } from "@/lib/editor/documents";

const DOCS: DocumentSummary[] = [
  {
    pageId: "1",
    title: "문서A",
    updatedAt: "2026-08-21T00:00:00.000Z",
    isPublished: true,
    tags: [],
  },
];

function mockMatchMedia(matches: boolean) {
  vi.spyOn(window, "matchMedia").mockReturnValue({
    matches,
    media: "",
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  } as unknown as MediaQueryList);
}

describe("EditorShell", () => {
  it("사이드바와 children을 함께 렌더링한다", () => {
    mockMatchMedia(false);

    render(
      <EditorShell documents={DOCS}>
        <p>본문 영역</p>
      </EditorShell>
    );

    expect(screen.getByText("문서A")).toBeInTheDocument();
    expect(screen.getByText("본문 영역")).toBeInTheDocument();
  });

  it("모바일 뷰포트에서는 토글 버튼을 눌러야 배경 오버레이가 열린다", async () => {
    mockMatchMedia(true);

    render(
      <EditorShell documents={DOCS}>
        <p>본문 영역</p>
      </EditorShell>
    );

    expect(
      document.querySelector('[aria-hidden="true"].fixed.inset-0')
    ).not.toBeInTheDocument();

    await userEvent.click(
      screen.getByRole("button", { name: "문서 목록 열기" })
    );

    expect(
      document.querySelector('[aria-hidden="true"].fixed.inset-0')
    ).toBeInTheDocument();
  });

  it("데스크톱 뷰포트에서는 토글 버튼 없이도 사이드바가 화면 밖으로 밀리지 않는다", () => {
    mockMatchMedia(false);

    render(
      <EditorShell documents={DOCS}>
        <p>본문 영역</p>
      </EditorShell>
    );

    const sidebarWrapper = screen.getByText("문서A").closest("aside")
      ?.parentElement as HTMLElement;
    expect(sidebarWrapper.style.transform).toBe("");
  });
});
