import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider } from "@sfood/ui";
import { MoveDocumentModal } from "./MoveDocumentModal";
import type { DocumentSummary } from "@/lib/editor/documents";

function stubFetch(handler: (url: string, init?: RequestInit) => Response | Promise<Response>) {
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => handler(url, init));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status });

const DOC_UNCLASSIFIED: DocumentSummary = {
  pageId: "1",
  title: "문서A",
  updatedAt: "2026-08-21T00:00:00.000Z",
  isPublished: true,
  tags: [],
  folderId: null,
};

const DOC_IN_FOLDER: DocumentSummary = {
  pageId: "2",
  title: "문서B",
  updatedAt: "2026-08-21T00:00:00.000Z",
  isPublished: false,
  tags: [],
  folderId: "f1",
};

const FOLDER_OPTIONS = [
  { id: "f1", label: "업무" },
  { id: "f2", label: "　하위" },
];

function renderModal(document: DocumentSummary, onSaved = vi.fn(), onClose = vi.fn()) {
  return {
    ...render(
      <ToastProvider>
        <MoveDocumentModal
          open
          document={document}
          folderOptions={FOLDER_OPTIONS}
          onClose={onClose}
          onSaved={onSaved}
        />
      </ToastProvider>
    ),
    onSaved,
    onClose,
  };
}

beforeEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("MoveDocumentModal", () => {
  it("제목에 문서 이름을 보여주고, 미분류 문서는 대상 폴더가 '미분류'로 시작한다", () => {
    renderModal(DOC_UNCLASSIFIED);

    expect(screen.getByText('"문서A" 이동')).toBeInTheDocument();
    expect(screen.getByRole("combobox")).toHaveValue("");
  });

  it("이미 폴더에 속한 문서는 대상 폴더가 현재 폴더로 미리 선택되어 있다", () => {
    renderModal(DOC_IN_FOLDER);

    expect(screen.getByRole("combobox")).toHaveValue("f1");
  });

  it("폴더를 골라 저장하면 PUT /api/editor/documents/{pageId}/folder를 folderId와 함께 호출한다", async () => {
    const user = userEvent.setup();
    const fetchMock = stubFetch(() => new Response(null, { status: 204 }));
    const { onSaved, onClose } = renderModal(DOC_UNCLASSIFIED);

    await user.selectOptions(screen.getByRole("combobox"), "f1");
    await user.click(screen.getByRole("button", { name: "이동" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/editor/documents/1/folder",
        expect.objectContaining({
          method: "PUT",
          body: JSON.stringify({ folderId: "f1" }),
        })
      );
    });
    expect(await screen.findByText("문서를 이동했습니다.")).toBeInTheDocument();
    expect(onClose).toHaveBeenCalled();
    expect(onSaved).toHaveBeenCalled();
  });

  it("'미분류'를 고르면 folderId: null로 호출한다", async () => {
    const user = userEvent.setup();
    const fetchMock = stubFetch(() => new Response(null, { status: 204 }));
    renderModal(DOC_IN_FOLDER);

    await user.selectOptions(screen.getByRole("combobox"), "");
    await user.click(screen.getByRole("button", { name: "이동" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/editor/documents/2/folder",
        expect.objectContaining({
          method: "PUT",
          body: JSON.stringify({ folderId: null }),
        })
      );
    });
  });

  it("저장에 실패하면 오류 Toast를 보여주고 모달을 닫지 않는다", async () => {
    const user = userEvent.setup();
    stubFetch(() => jsonResponse({ error: { message: "개인 폴더가 없습니다." } }, 404));
    const { onClose, onSaved } = renderModal(DOC_UNCLASSIFIED);

    await user.click(screen.getByRole("button", { name: "이동" }));

    expect(await screen.findByText("개인 폴더가 없습니다.")).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
    expect(onSaved).not.toHaveBeenCalled();
  });

  it("하위 폴더 옵션은 들여쓰기(전각 공백)가 붙은 라벨로 보인다", () => {
    renderModal(DOC_UNCLASSIFIED);

    const select = screen.getByRole("combobox");
    expect(
      within(select).getByText("　하위", { normalizer: (text) => text })
    ).toBeInTheDocument();
  });
});
