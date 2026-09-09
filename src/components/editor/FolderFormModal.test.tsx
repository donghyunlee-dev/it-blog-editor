import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider } from "@sfood/ui";
import { FolderFormModal, type FolderFormMode } from "./FolderFormModal";

function stubFetch(handler: (url: string, init?: RequestInit) => Response | Promise<Response>) {
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => handler(url, init));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status });

function renderModal(mode: FolderFormMode, onSaved = vi.fn(), onClose = vi.fn()) {
  return {
    ...render(
      <ToastProvider>
        <FolderFormModal open mode={mode} onClose={onClose} onSaved={onSaved} />
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

describe("FolderFormModal", () => {
  it("생성 모드는 빈 이름으로 시작하고 제목이 '새 폴더'다", () => {
    renderModal({ type: "create", parentId: null });

    expect(screen.getByText("새 폴더")).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /폴더 이름/ })).toHaveValue("");
  });

  it("이름변경 모드는 현재 이름으로 채워지고 제목이 '폴더 이름 변경'이다", () => {
    renderModal({ type: "rename", folderId: "f1", currentName: "업무" });

    expect(screen.getByText("폴더 이름 변경")).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /폴더 이름/ })).toHaveValue("업무");
  });

  it("생성 모드에서 저장하면 POST /api/editor/folders를 parentId와 함께 호출한다", async () => {
    const user = userEvent.setup();
    const fetchMock = stubFetch(() => jsonResponse({ id: "f1", name: "업무", parentId: null, order: 0 }, 201));
    const { onSaved, onClose } = renderModal({ type: "create", parentId: "parent-1" });

    await user.type(screen.getByRole("textbox", { name: /폴더 이름/ }), "업무");
    await user.click(screen.getByRole("button", { name: "저장" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/editor/folders",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ name: "업무", parentId: "parent-1" }),
        })
      );
    });
    expect(await screen.findByText("폴더를 만들었습니다.")).toBeInTheDocument();
    expect(onClose).toHaveBeenCalled();
    expect(onSaved).toHaveBeenCalled();
  });

  it("이름변경 모드에서 저장하면 PUT /api/editor/folders/{folderId}를 호출한다", async () => {
    const user = userEvent.setup();
    const fetchMock = stubFetch(() => jsonResponse({ id: "f1", name: "새이름", parentId: null, order: 0 }));
    const { onSaved } = renderModal({ type: "rename", folderId: "f1", currentName: "업무" });

    const input = screen.getByRole("textbox", { name: /폴더 이름/ });
    await user.clear(input);
    await user.type(input, "새이름");
    await user.click(screen.getByRole("button", { name: "저장" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/editor/folders/f1",
        expect.objectContaining({
          method: "PUT",
          body: JSON.stringify({ name: "새이름" }),
        })
      );
    });
    expect(await screen.findByText("폴더 이름을 변경했습니다.")).toBeInTheDocument();
    expect(onSaved).toHaveBeenCalled();
  });

  it("저장에 실패하면 오류 Toast를 보여주고 모달을 닫지 않는다", async () => {
    const user = userEvent.setup();
    stubFetch(() => jsonResponse({ error: { message: "같은 위치에 이미 같은 이름의 폴더가 있습니다." } }, 400));
    const { onClose, onSaved } = renderModal({ type: "create", parentId: null });

    await user.type(screen.getByRole("textbox", { name: /폴더 이름/ }), "중복");
    await user.click(screen.getByRole("button", { name: "저장" }));

    expect(
      await screen.findByText("같은 위치에 이미 같은 이름의 폴더가 있습니다.")
    ).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
    expect(onSaved).not.toHaveBeenCalled();
  });

  it("이름을 입력하지 않으면 저장 버튼이 비활성화된다", () => {
    renderModal({ type: "create", parentId: null });

    expect(screen.getByRole("button", { name: "저장" })).toBeDisabled();
  });
});
