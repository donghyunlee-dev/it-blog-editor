import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider } from "@sfood/ui";
import { DeletedDocumentsPage } from "./DeletedDocumentsPage";
import type { DeletedDocumentSummary } from "@/lib/editor/deleted-documents";

// 복구 성공 시 router.refresh()로 사이드바를 새로고침하므로(DocumentEditor.tsx의 저장/삭제
// 흐름과 같은 이유) next/navigation의 useRouter를 직접 모킹한다(AppRouterContext 없이는 던짐).
const { refresh } = vi.hoisted(() => ({ refresh: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}));

function stubFetch(handler: (url: string, init?: RequestInit) => Response | Promise<Response>) {
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => handler(url, init));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status });

function renderPage(documents: DeletedDocumentSummary[]) {
  return render(
    <ToastProvider>
      <DeletedDocumentsPage initialDocuments={documents} />
    </ToastProvider>
  );
}

const DOC: DeletedDocumentSummary = {
  pageId: "doc-1",
  title: "삭제 테스트 문서",
  deletedAt: "2026-08-27T10:00:00.000Z",
  tags: ["React"],
  isPublished: true,
  folderId: "f1",
  folderName: "업무",
};

beforeEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  refresh.mockClear();
});

describe("DeletedDocumentsPage", () => {
  it("목록이 비어있으면 안내 문구를 보여주고 검색 입력을 렌더링하지 않는다(P16-1)", () => {
    renderPage([]);

    expect(screen.getByText("삭제된 문서가 없습니다.")).toBeInTheDocument();
    expect(screen.queryByPlaceholderText("삭제된 문서 검색")).not.toBeInTheDocument();
  });

  it("문서를 제목·게시 상태·태그·원래 폴더·삭제일시와 함께 보여준다(P16-1, 상세 정보)", () => {
    renderPage([DOC]);

    expect(screen.getByText("삭제 테스트 문서")).toBeInTheDocument();
    expect(screen.getByText("React")).toBeInTheDocument();
    expect(screen.getByText(/업무/)).toBeInTheDocument();
    expect(screen.getByText(/2026\.08\.27/)).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "게시됨" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "복구" })).toBeInTheDocument();
  });

  it("folderId가 없는 문서는 '미분류'로 보여준다", () => {
    renderPage([{ ...DOC, folderId: null, folderName: null }]);

    expect(screen.getByText(/미분류/)).toBeInTheDocument();
  });

  it("검색어로 제목·태그를 필터링한다(P16-1)", async () => {
    const user = userEvent.setup();
    const other: DeletedDocumentSummary = {
      ...DOC,
      pageId: "doc-2",
      title: "다른 문서",
      tags: ["Backend"],
    };
    renderPage([DOC, other]);

    await user.type(screen.getByPlaceholderText("삭제된 문서 검색"), "backend");

    expect(screen.getByText("다른 문서")).toBeInTheDocument();
    expect(screen.queryByText("삭제 테스트 문서")).not.toBeInTheDocument();
  });

  it("검색 결과가 없으면 안내 문구를 보여준다", async () => {
    const user = userEvent.setup();
    renderPage([DOC]);

    await user.type(screen.getByPlaceholderText("삭제된 문서 검색"), "존재하지않음");

    expect(screen.getByText("조건에 맞는 문서가 없습니다.")).toBeInTheDocument();
  });

  it("복구 버튼을 누르면 restore API를 호출하고 목록에서 제거하며 사이드바를 새로고침한다(P16-1)", async () => {
    const user = userEvent.setup();
    const fetchMock = stubFetch((url) => {
      if (url === "/api/editor/documents/doc-1/restore") {
        return jsonResponse(null, 204);
      }
      throw new Error(`unexpected url: ${url}`);
    });

    renderPage([DOC]);
    await user.click(screen.getByRole("button", { name: "복구" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/editor/documents/doc-1/restore",
        expect.objectContaining({ method: "POST" })
      );
    });
    expect(screen.getByText("삭제된 문서가 없습니다.")).toBeInTheDocument();
    expect(refresh).toHaveBeenCalled();
  });

  it("복구에 실패하면 목록에 그대로 남긴다", async () => {
    const user = userEvent.setup();
    stubFetch(() => jsonResponse({ error: { message: "복구하지 못했습니다." } }, 404));

    renderPage([DOC]);
    await user.click(screen.getByRole("button", { name: "복구" }));

    expect(await screen.findByText("복구하지 못했습니다.")).toBeInTheDocument();
    expect(screen.getByText("삭제 테스트 문서")).toBeInTheDocument();
  });
});
