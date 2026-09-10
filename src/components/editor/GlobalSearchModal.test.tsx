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

/** N일 전(자정 기준)의 ISO 문자열 — 그룹핑(오늘/어제/최근 7일/이전) 테스트용. */
function daysAgoIso(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(12, 0, 0, 0);
  return date.toISOString();
}

function makeDoc(overrides: Partial<Parameters<typeof jsonResponse>[0]> & Record<string, unknown> = {}) {
  return {
    pageId: "doc-1",
    title: "React 19 정리",
    updatedAt: daysAgoIso(0),
    isPublished: false,
    tags: [] as string[],
    snippet: "",
    ...overrides,
  };
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

  it("Ctrl+K를 누르면 열리고, 다시 누르거나 Escape를 누르면 닫힌다", () => {
    render(<GlobalSearchModal />);

    openWithCtrlK();
    expect(screen.getByLabelText("문서 전체 검색")).toBeInTheDocument();

    openWithCtrlK();
    expect(screen.queryByLabelText("문서 전체 검색")).not.toBeInTheDocument();

    openWithCtrlK();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByLabelText("문서 전체 검색")).not.toBeInTheDocument();
  });

  it("openSignal이 undefined에서 숫자로 바뀌면 모달이 열린다(P8-1, 헤더 검색 트리거 버튼)", () => {
    const { rerender } = render(<GlobalSearchModal openSignal={undefined} />);
    expect(screen.queryByLabelText("문서 전체 검색")).not.toBeInTheDocument();

    rerender(<GlobalSearchModal openSignal={1} />);
    expect(screen.getByLabelText("문서 전체 검색")).toBeInTheDocument();
  });

  it("openSignal이 없으면(undefined) 마운트 시 자동으로 열리지 않는다", () => {
    render(<GlobalSearchModal openSignal={undefined} />);
    expect(screen.queryByLabelText("문서 전체 검색")).not.toBeInTheDocument();
  });

  it("검색어를 입력하면 결과를 목록에 보여주고, 첫 번째 결과가 자동으로 미리보기에 나타난다", async () => {
    const fetchMock = stubFetch((url) => {
      expect(url).toBe("/api/editor/documents/search?q=react");
      return jsonResponse({
        documents: [makeDoc({ tags: ["Frontend"], snippet: "React 19의 새 기능 정리" })],
      });
    });
    const user = userEvent.setup();

    render(<GlobalSearchModal />);
    openWithCtrlK();
    await user.type(screen.getByLabelText("문서 전체 검색"), "react");

    await waitFor(() => expect(fetchMock).toHaveBeenCalled(), { timeout: 2000 });
    expect(await screen.findByRole("heading", { name: "React 19 정리" })).toBeInTheDocument();
    expect(screen.getByText("React 19의 새 기능 정리")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /React 19 정리/ })).toBeInTheDocument();
  });

  it("문서가 폴더에 속해 있고 folders가 주어지면 결과 목록·미리보기에 폴더 경로를 함께 보여준다(P7-9)", async () => {
    const FOLDERS = [
      { id: "f1", name: "업무", parentId: null, order: 0 },
      { id: "f2", name: "하위", parentId: "f1", order: 0 },
    ];
    stubFetch(() =>
      jsonResponse({
        documents: [makeDoc({ folderId: "f2" })],
      })
    );
    const user = userEvent.setup();

    render(<GlobalSearchModal folders={FOLDERS} />);
    openWithCtrlK();
    await user.type(screen.getByLabelText("문서 전체 검색"), "react");

    // 목록 행과 미리보기 패널 양쪽에 "업무/하위"가 보여야 한다.
    expect(await screen.findAllByText("업무/하위")).toHaveLength(2);
  });

  it("문서에 folderId가 없으면(대부분) 폴더 경로를 보여주지 않는다", async () => {
    stubFetch(() => jsonResponse({ documents: [makeDoc()] }));
    const user = userEvent.setup();

    render(<GlobalSearchModal folders={[{ id: "f1", name: "업무", parentId: null, order: 0 }]} />);
    openWithCtrlK();
    await user.type(screen.getByLabelText("문서 전체 검색"), "react");

    expect(await screen.findByRole("heading", { name: "React 19 정리" })).toBeInTheDocument();
    expect(screen.queryByText("업무")).not.toBeInTheDocument();
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
    stubFetch(() => jsonResponse({ documents: [makeDoc()] }));
    const user = userEvent.setup();

    render(<GlobalSearchModal />);
    openWithCtrlK();
    await user.type(screen.getByLabelText("문서 전체 검색"), "react");

    const row = await screen.findByRole("button", { name: /React 19 정리/ }, { timeout: 2000 });
    await user.click(row);

    expect(push).toHaveBeenCalledWith("/editor/doc-1");
    expect(screen.queryByLabelText("문서 전체 검색")).not.toBeInTheDocument();
  });

  it("ArrowDown/Enter로 강조된 결과를 열 수 있다", async () => {
    stubFetch(() =>
      jsonResponse({
        documents: [
          makeDoc({ pageId: "doc-1", title: "문서A" }),
          makeDoc({ pageId: "doc-2", title: "문서B" }),
        ],
      })
    );
    const user = userEvent.setup();

    render(<GlobalSearchModal />);
    openWithCtrlK();
    const input = screen.getByLabelText("문서 전체 검색");
    await user.type(input, "문서");
    await screen.findByRole("button", { name: /문서A/ }, { timeout: 2000 });

    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(push).toHaveBeenCalledWith("/editor/doc-2");
  });

  it("날짜별로 결과를 오늘/어제/최근 7일/이전으로 묶어서 보여준다", async () => {
    stubFetch(() =>
      jsonResponse({
        documents: [
          makeDoc({ pageId: "doc-today", title: "오늘 문서", updatedAt: daysAgoIso(0) }),
          makeDoc({ pageId: "doc-yesterday", title: "어제 문서", updatedAt: daysAgoIso(1) }),
          makeDoc({ pageId: "doc-week", title: "주중 문서", updatedAt: daysAgoIso(3) }),
          makeDoc({ pageId: "doc-old", title: "옛날 문서", updatedAt: daysAgoIso(30) }),
        ],
      })
    );
    const user = userEvent.setup();

    render(<GlobalSearchModal />);
    openWithCtrlK();
    await user.type(screen.getByLabelText("문서 전체 검색"), "문서");

    await screen.findByText("오늘", {}, { timeout: 2000 });
    expect(screen.getByText("어제")).toBeInTheDocument();
    expect(screen.getByText("최근 7일")).toBeInTheDocument();
    expect(screen.getByText("이전")).toBeInTheDocument();
  });

  it("'제목만' 토글을 켜면 본문·태그로만 일치했던 문서는 목록에서 사라진다", async () => {
    stubFetch(() =>
      jsonResponse({
        documents: [
          makeDoc({ pageId: "doc-title", title: "kubernetes 가이드" }),
          makeDoc({ pageId: "doc-body-only", title: "무관한 제목", snippet: "kubernetes 배포 방법" }),
        ],
      })
    );
    const user = userEvent.setup();

    render(<GlobalSearchModal />);
    openWithCtrlK();
    await user.type(screen.getByLabelText("문서 전체 검색"), "kubernetes");
    await screen.findByRole("button", { name: /kubernetes 가이드/ }, { timeout: 2000 });
    expect(screen.getByRole("button", { name: /무관한 제목/ })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Aa 제목만" }));

    expect(screen.getByRole("button", { name: /kubernetes 가이드/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /무관한 제목/ })).not.toBeInTheDocument();
  });

  it("결과가 없을 때는 안내 문구를, 결과가 있을 때는 선택된 문서의 미리보기를 오른쪽에 보여준다", async () => {
    render(<GlobalSearchModal />);
    openWithCtrlK();

    expect(screen.getByText("검색어를 입력해 문서를 찾아보세요.")).toBeInTheDocument();

    stubFetch(() => jsonResponse({ documents: [makeDoc({ snippet: "본문 미리보기 내용" })] }));
    const user = userEvent.setup();
    await user.type(screen.getByLabelText("문서 전체 검색"), "react");

    expect(await screen.findByText("본문 미리보기 내용", {}, { timeout: 2000 })).toBeInTheDocument();
  });
});
