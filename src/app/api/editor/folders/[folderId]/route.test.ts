import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth-guard", () => ({
  requireSessionEmail: vi.fn(),
}));

vi.mock("@/lib/editor/folder", () => ({
  findPersonalFolder: vi.fn(),
}));

vi.mock("@/lib/editor/folders", () => ({
  renameFolder: vi.fn(),
  deleteFolder: vi.fn(),
}));

vi.mock("@/lib/editor/documents", () => ({
  reassignDocumentsFolder: vi.fn(),
}));

import { requireSessionEmail } from "@/lib/auth-guard";
import { findPersonalFolder } from "@/lib/editor/folder";
import { deleteFolder, renameFolder } from "@/lib/editor/folders";
import { reassignDocumentsFolder } from "@/lib/editor/documents";
import { NotFoundError, ValidationError } from "@/lib/editor/errors";
import { DELETE, PUT } from "./route";

beforeEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
  vi.mocked(requireSessionEmail).mockResolvedValue("user@s-food.com");
  vi.mocked(findPersonalFolder).mockResolvedValue({ accountFolderId: "folder-1", spaceKey: "SF" });
});

function putRequest(body: unknown) {
  return new Request("http://localhost/api/editor/folders/f1", {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

describe("PUT /api/editor/folders/[folderId]", () => {
  it("정상 요청이면 accountFolderId·folderId로 renameFolder를 호출해 갱신된 폴더를 반환한다", async () => {
    vi.mocked(renameFolder).mockResolvedValue({ id: "f1", name: "새 이름", parentId: null, order: 0 });

    const response = await PUT(putRequest({ name: "새 이름" }), {
      params: Promise.resolve({ folderId: "f1" }),
    });
    const body = await response.json();

    expect(vi.mocked(renameFolder)).toHaveBeenCalledWith("folder-1", "f1", "새 이름");
    expect(body).toEqual({ id: "f1", name: "새 이름", parentId: null, order: 0 });
  });

  it("개인 폴더가 없으면 404를 반환하고 renameFolder를 호출하지 않는다", async () => {
    vi.mocked(findPersonalFolder).mockResolvedValue(null);

    const response = await PUT(putRequest({ name: "새 이름" }), {
      params: Promise.resolve({ folderId: "f1" }),
    });

    expect(response.status).toBe(404);
    expect(vi.mocked(renameFolder)).not.toHaveBeenCalled();
  });

  it("renameFolder가 NotFoundError를 던지면 404를 반환한다", async () => {
    vi.mocked(renameFolder).mockRejectedValue(new NotFoundError("폴더를 찾을 수 없습니다."));

    const response = await PUT(putRequest({ name: "새 이름" }), {
      params: Promise.resolve({ folderId: "없는-id" }),
    });

    expect(response.status).toBe(404);
  });

  it("renameFolder가 ValidationError를 던지면 400을 반환한다(이름 중복 등)", async () => {
    vi.mocked(renameFolder).mockRejectedValue(new ValidationError("같은 위치에 이미 같은 이름의 폴더가 있습니다."));

    const response = await PUT(putRequest({ name: "중복" }), {
      params: Promise.resolve({ folderId: "f1" }),
    });

    expect(response.status).toBe(400);
  });
});

describe("DELETE /api/editor/folders/[folderId]", () => {
  it("정상 요청이면 deleteFolder 호출 후 그 parentId로 reassignDocumentsFolder를 이어 호출하고 204를 반환한다(P7-3)", async () => {
    vi.mocked(deleteFolder).mockResolvedValue({
      id: "f1",
      name: "업무",
      parentId: "parent-1",
      order: 0,
    });
    vi.mocked(reassignDocumentsFolder).mockResolvedValue(undefined);

    const response = await DELETE(new Request("http://localhost/api/editor/folders/f1", { method: "DELETE" }), {
      params: Promise.resolve({ folderId: "f1" }),
    });

    expect(vi.mocked(deleteFolder)).toHaveBeenCalledWith("folder-1", "f1");
    expect(vi.mocked(reassignDocumentsFolder)).toHaveBeenCalledWith("folder-1", "f1", "parent-1");
    expect(response.status).toBe(204);
  });

  it("최상위 폴더를 삭제하면 문서도 parentId: null(미분류)로 재배정한다", async () => {
    vi.mocked(deleteFolder).mockResolvedValue({
      id: "top",
      name: "최상위",
      parentId: null,
      order: 0,
    });
    vi.mocked(reassignDocumentsFolder).mockResolvedValue(undefined);

    await DELETE(new Request("http://localhost/api/editor/folders/top", { method: "DELETE" }), {
      params: Promise.resolve({ folderId: "top" }),
    });

    expect(vi.mocked(reassignDocumentsFolder)).toHaveBeenCalledWith("folder-1", "top", null);
  });

  it("개인 폴더가 없으면 404를 반환하고 deleteFolder를 호출하지 않는다", async () => {
    vi.mocked(findPersonalFolder).mockResolvedValue(null);

    const response = await DELETE(new Request("http://localhost/api/editor/folders/f1", { method: "DELETE" }), {
      params: Promise.resolve({ folderId: "f1" }),
    });

    expect(response.status).toBe(404);
    expect(vi.mocked(deleteFolder)).not.toHaveBeenCalled();
  });

  it("deleteFolder가 NotFoundError를 던지면 404를 반환하고 reassignDocumentsFolder를 호출하지 않는다", async () => {
    vi.mocked(deleteFolder).mockRejectedValue(new NotFoundError("폴더를 찾을 수 없습니다."));

    const response = await DELETE(new Request("http://localhost/api/editor/folders/f1", { method: "DELETE" }), {
      params: Promise.resolve({ folderId: "없는-id" }),
    });

    expect(response.status).toBe(404);
    expect(vi.mocked(reassignDocumentsFolder)).not.toHaveBeenCalled();
  });
});
