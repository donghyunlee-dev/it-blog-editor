import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { DocumentLinkPickerModal } from "./DocumentLinkPickerModal";
import type { DocumentSearchResult } from "@/lib/editor/documents";

function stubFetch(handler: (url: string) => Response | Promise<Response>) {
  const fetchMock = vi.fn(async (url: string) => handler(url));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

const jsonResponse = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

function makeDocument(overrides: Partial<DocumentSearchResult> = {}): DocumentSearchResult {
  return {
    pageId: "doc-1",
    title: "테스트 문서",
    tags: [],
    isPublished: false,
    folderId: null,
    updatedAt: new Date().toISOString(),
    snippet: "",
    ...overrides,
  } as DocumentSearchResult;
}

describe("DocumentLinkPickerModal", () => {
  it("열리지 않았을 때는 검색 입력이 보이지 않는다", () => {
    render(<DocumentLinkPickerModal open={false} onClose={vi.fn()} onSelect={vi.fn()} />);
    expect(screen.queryByLabelText("삽입할 문서 검색")).toBeNull();
  });

  it("검색어를 입력하면 디바운스 후 검색 API를 호출하고 결과를 보여준다", async () => {
    const fetchMock = stubFetch(() => jsonResponse({ documents: [makeDocument({ title: "회의록" })] }));
    render(<DocumentLinkPickerModal open={true} onClose={vi.fn()} onSelect={vi.fn()} />);

    fireEvent.change(screen.getByLabelText("삽입할 문서 검색"), { target: { value: "회의" } });

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/editor/documents/search?q=%ED%9A%8C%EC%9D%98"));
    await screen.findByText("회의록");
  });

  it("결과가 없으면 안내 문구를 보여준다", async () => {
    stubFetch(() => jsonResponse({ documents: [] }));
    render(<DocumentLinkPickerModal open={true} onClose={vi.fn()} onSelect={vi.fn()} />);

    fireEvent.change(screen.getByLabelText("삽입할 문서 검색"), { target: { value: "없는문서" } });

    await screen.findByText("일치하는 문서가 없습니다.");
  });

  it("검색 API가 실패하면 오류 메시지를 보여준다", async () => {
    stubFetch(() => jsonResponse({ error: { message: "검색 실패" } }, 500));
    render(<DocumentLinkPickerModal open={true} onClose={vi.fn()} onSelect={vi.fn()} />);

    fireEvent.change(screen.getByLabelText("삽입할 문서 검색"), { target: { value: "아무거나" } });

    await screen.findByRole("alert");
    expect(screen.getByRole("alert")).toHaveTextContent("검색 실패");
  });

  it("결과를 클릭하면 onSelect가 pageId·title과 함께 호출된다", async () => {
    stubFetch(() => jsonResponse({ documents: [makeDocument({ pageId: "doc-42", title: "선택할 문서" })] }));
    const onSelect = vi.fn();
    render(<DocumentLinkPickerModal open={true} onClose={vi.fn()} onSelect={onSelect} />);

    fireEvent.change(screen.getByLabelText("삽입할 문서 검색"), { target: { value: "선택" } });
    fireEvent.click(await screen.findByText("선택할 문서"));

    expect(onSelect).toHaveBeenCalledWith({ pageId: "doc-42", title: "선택할 문서" });
  });

  it("excludePageId로 지정한 문서는 결과에서 제외된다(자기 자신 링크 방지)", async () => {
    stubFetch(() =>
      jsonResponse({
        documents: [makeDocument({ pageId: "self", title: "현재 문서" }), makeDocument({ pageId: "other", title: "다른 문서" })],
      })
    );
    render(<DocumentLinkPickerModal open={true} onClose={vi.fn()} onSelect={vi.fn()} excludePageId="self" />);

    fireEvent.change(screen.getByLabelText("삽입할 문서 검색"), { target: { value: "문서" } });

    await screen.findByText("다른 문서");
    expect(screen.queryByText("현재 문서")).toBeNull();
  });
});
