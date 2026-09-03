import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GlobalSearchModal } from "./GlobalSearchModal";

const { push } = vi.hoisted(() => ({ push: vi.fn() }));

// next/navigation의 useRouter는 AppRouterContext 없이 호출하면 던지므로 직접 모킹한다
// (PublishForm.test.tsx와 동일한 패턴).
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

function stubFetch(handler: (url: string) => Response | Promise<Response>) {
  const fetchMock = vi.fn(async (url: string) => handler(url));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status });

function openWithCtrlK() {
  fireEvent.keyDown(document, { key: "k", ctrlKey: true });
}

beforeEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("GlobalSearchModal", () => {
  it("기본적으로 닫혀 있어 검색 입력이 보이지 않는다", () => {
    render(<GlobalSearchModal />);

    expect(screen.queryByLabelText("문서 전체 검색")).not.toBeInTheDocument();
  });

  it("Ctrl+K를 누르면 열리고, 다시 누르면 닫힌다", () => {
    render(<GlobalSearchModal />);

    openWithCtrlK();
    expect(screen.getByLabelText("문서 전체 검색")).toBeInTheDocument();

    openWithCtrlK();
    expect(screen.queryByLabelText("문서 전체 검색")).not.toBeInTheDocument();
  });

  it("검색어를 입력하면(디바운스 후) 서버에 물어보고 결과를 보여준다", async () => {
    const fetchMock = stubFetch((url) => {
      expect(url).toBe("/api/editor/documents/search?q=react");
      return jsonResponse({
        documents: [
          { pageId: "doc-1", title: "React 19 정리", updatedAt: "2026-09-01T00:00:00.000Z", isPublished: true, tags: ["Frontend"] },
        ],
      });
    });
    const user = userEvent.setup();

    render(<GlobalSearchModal />);
    openWithCtrlK();
    await user.type(screen.getByLabelText("문서 전체 검색"), "react");

    await waitFor(() => expect(fetchMock).toHaveBeenCalled(), { timeout: 2000 });
    expect(await screen.findByText("React 19 정리")).toBeInTheDocument();
    expect(screen.getByText("Frontend")).toBeInTheDocument();
  });

  it("일치하는 문서가 없으면 안내 문구를 보여준다", async () => {
    stubFetch(() => jsonResponse({ documents: [] }));
    const user = userEvent.setup();

    render(<GlobalSearchModal />);
    openWithCtrlK();
    await user.type(screen.getByLabelText("문서 전체 검색"), "존재하지않음");

    expect(await screen.findByText("일치하는 문서가 없습니다.", {}, { timeout: 2000 })).toBeInTheDocument();
  });

  it("검색에 실패하면 오류 메시지를 보여준다", async () => {
    stubFetch(() => jsonResponse({ error: { message: "검색에 실패했습니다." } }, 502));
    const user = userEvent.setup();

    render(<GlobalSearchModal />);
    openWithCtrlK();
    await user.type(screen.getByLabelText("문서 전체 검색"), "react");

    expect(await screen.findByText("검색에 실패했습니다.", {}, { timeout: 2000 })).toBeInTheDocument();
  });

  it("결과를 클릭하면 모달이 닫히고 해당 문서로 이동한다", async () => {
    stubFetch(() =>
      jsonResponse({
        documents: [
          { pageId: "doc-1", title: "React 19 정리", updatedAt: "2026-09-01T00:00:00.000Z", isPublished: false, tags: [] },
        ],
      })
    );
    const user = userEvent.setup();

    render(<GlobalSearchModal />);
    openWithCtrlK();
    await user.type(screen.getByLabelText("문서 전체 검색"), "react");

    await user.click(await screen.findByText("React 19 정리", {}, { timeout: 2000 }));

    expect(push).toHaveBeenCalledWith("/editor/doc-1");
    expect(screen.queryByLabelText("문서 전체 검색")).not.toBeInTheDocument();
  });

  it("ArrowDown/Enter로 강조된 결과를 열 수 있다", async () => {
    stubFetch(() =>
      jsonResponse({
        documents: [
          { pageId: "doc-1", title: "문서A", updatedAt: "2026-09-01T00:00:00.000Z", isPublished: false, tags: [] },
          { pageId: "doc-2", title: "문서B", updatedAt: "2026-09-01T00:00:00.000Z", isPublished: false, tags: [] },
        ],
      })
    );
    const user = userEvent.setup();

    render(<GlobalSearchModal />);
    openWithCtrlK();
    const input = screen.getByLabelText("문서 전체 검색");
    await user.type(input, "문서");
    await screen.findByText("문서A", {}, { timeout: 2000 });

    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(push).toHaveBeenCalledWith("/editor/doc-2");
  });
});
