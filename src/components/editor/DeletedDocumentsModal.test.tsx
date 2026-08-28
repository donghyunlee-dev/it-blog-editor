import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider } from "@sfood/ui";
import { DeletedDocumentsModal } from "./DeletedDocumentsModal";

function stubFetch(handler: (url: string, init?: RequestInit) => Response | Promise<Response>) {
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => handler(url, init));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status });

function renderModal(props: React.ComponentProps<typeof DeletedDocumentsModal> = {}) {
  return render(
    <ToastProvider>
      <DeletedDocumentsModal {...props} />
    </ToastProvider>
  );
}

beforeEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("DeletedDocumentsModal", () => {
  it("불러오는 동안 로딩 상태를 보여준다", () => {
    stubFetch(() => new Promise(() => {}));

    renderModal();

    expect(screen.getByRole("status")).toHaveTextContent("불러오는 중");
  });

  it("성공하면 삭제된 문서 목록을 보여준다", async () => {
    stubFetch((url) => {
      expect(url).toBe("/api/editor/documents/deleted");
      return jsonResponse({
        documents: [
          { pageId: "doc-1", title: "삭제된 문서", deletedAt: "2026-08-27T10:00:00.000Z" },
        ],
      });
    });

    renderModal();

    expect(await screen.findByText("삭제된 문서")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "복구" })).toBeInTheDocument();
  });

  it("목록이 비어있으면 안내 문구를 보여준다", async () => {
    stubFetch(() => jsonResponse({ documents: [] }));

    renderModal();

    expect(await screen.findByText("삭제된 문서가 없습니다.")).toBeInTheDocument();
  });

  it("조회에 실패하면 오류 메시지를 보여준다", async () => {
    stubFetch(() =>
      jsonResponse({ error: { message: "일시적인 오류로 요청을 처리하지 못했습니다." } }, 502)
    );

    renderModal();

    expect(
      await screen.findByText("일시적인 오류로 요청을 처리하지 못했습니다.")
    ).toBeInTheDocument();
  });

  it("복구 버튼을 누르면 restore API를 호출하고 목록에서 제거하며 onRestored를 호출한다", async () => {
    const user = userEvent.setup();
    const onRestored = vi.fn();
    const fetchMock = stubFetch((url) => {
      if (url === "/api/editor/documents/deleted") {
        return jsonResponse({
          documents: [
            { pageId: "doc-1", title: "삭제된 문서", deletedAt: "2026-08-27T10:00:00.000Z" },
          ],
        });
      }
      if (url === "/api/editor/documents/doc-1/restore") {
        return jsonResponse(null, 204);
      }
      throw new Error(`unexpected url: ${url}`);
    });

    renderModal({ onRestored });

    await screen.findByText("삭제된 문서");
    await user.click(screen.getByRole("button", { name: "복구" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/editor/documents/doc-1/restore",
        expect.objectContaining({ method: "POST" })
      );
    });
    expect(await screen.findByText("삭제된 문서가 없습니다.")).toBeInTheDocument();
    expect(onRestored).toHaveBeenCalled();
  });

  it("복구에 실패하면 목록에 그대로 남긴다", async () => {
    const user = userEvent.setup();
    stubFetch((url) => {
      if (url === "/api/editor/documents/deleted") {
        return jsonResponse({
          documents: [
            { pageId: "doc-1", title: "삭제된 문서", deletedAt: "2026-08-27T10:00:00.000Z" },
          ],
        });
      }
      return jsonResponse({ error: { message: "복구하지 못했습니다." } }, 404);
    });

    renderModal();

    await screen.findByText("삭제된 문서");
    await user.click(screen.getByRole("button", { name: "복구" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "복구" })).toBeInTheDocument();
    });
    expect(screen.getByText("삭제된 문서")).toBeInTheDocument();
  });
});
