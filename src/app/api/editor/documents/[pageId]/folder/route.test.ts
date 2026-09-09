import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth-guard", () => ({
  requireSessionEmail: vi.fn(),
}));

vi.mock("@/lib/editor/folder", () => ({
  findPersonalFolder: vi.fn(),
}));

vi.mock("@/lib/editor/documents", () => ({
  requireDocumentOwner: vi.fn(),
  setDocumentFolder: vi.fn(),
}));

import { requireSessionEmail } from "@/lib/auth-guard";
import { findPersonalFolder } from "@/lib/editor/folder";
import { requireDocumentOwner, setDocumentFolder } from "@/lib/editor/documents";
import { NotFoundError, UnauthorizedError, ValidationError } from "@/lib/editor/errors";
import { PUT } from "./route";

beforeEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
  vi.mocked(requireSessionEmail).mockResolvedValue("user@s-food.com");
  vi.mocked(requireDocumentOwner).mockResolvedValue(undefined);
  vi.mocked(findPersonalFolder).mockResolvedValue({ accountFolderId: "folder-1", spaceKey: "SF" });
});

function putRequest(body: unknown) {
  return new Request("http://localhost/api/editor/documents/doc-1/folder", {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

describe("PUT /api/editor/documents/[pageId]/folder", () => {
  it("소유자를 확인한 뒤 accountFolderId·pageId·folderId로 setDocumentFolder를 호출해 204를 반환한다", async () => {
    vi.mocked(setDocumentFolder).mockResolvedValue(undefined);

    const response = await PUT(putRequest({ folderId: "f1" }), {
      params: Promise.resolve({ pageId: "doc-1" }),
    });

    expect(vi.mocked(requireDocumentOwner)).toHaveBeenCalledWith("doc-1", "user@s-food.com");
    expect(vi.mocked(setDocumentFolder)).toHaveBeenCalledWith("doc-1", "folder-1", "f1");
    expect(response.status).toBe(204);
  });

  it("folderId를 생략하면 null(미분류)로 호출한다", async () => {
    vi.mocked(setDocumentFolder).mockResolvedValue(undefined);

    await PUT(putRequest({}), { params: Promise.resolve({ pageId: "doc-1" }) });

    expect(vi.mocked(setDocumentFolder)).toHaveBeenCalledWith("doc-1", "folder-1", null);
  });

  it("소유자가 아니면 401을 반환하고 setDocumentFolder를 호출하지 않는다", async () => {
    vi.mocked(requireDocumentOwner).mockRejectedValue(new UnauthorizedError("이 문서에 대한 권한이 없습니다."));

    const response = await PUT(putRequest({ folderId: "f1" }), {
      params: Promise.resolve({ pageId: "doc-1" }),
    });

    expect(response.status).toBe(401);
    expect(vi.mocked(setDocumentFolder)).not.toHaveBeenCalled();
  });

  it("개인 폴더가 없으면 404를 반환하고 setDocumentFolder를 호출하지 않는다", async () => {
    vi.mocked(findPersonalFolder).mockResolvedValue(null);

    const response = await PUT(putRequest({ folderId: "f1" }), {
      params: Promise.resolve({ pageId: "doc-1" }),
    });

    expect(response.status).toBe(404);
    expect(vi.mocked(setDocumentFolder)).not.toHaveBeenCalled();
  });

  it("setDocumentFolder가 ValidationError를 던지면(존재하지 않는 폴더) 400을 반환한다", async () => {
    vi.mocked(setDocumentFolder).mockRejectedValue(new ValidationError("폴더를 찾을 수 없습니다."));

    const response = await PUT(putRequest({ folderId: "없는-id" }), {
      params: Promise.resolve({ pageId: "doc-1" }),
    });

    expect(response.status).toBe(400);
  });

  it("setDocumentFolder가 NotFoundError를 던지면 404를 반환한다", async () => {
    vi.mocked(setDocumentFolder).mockRejectedValue(new NotFoundError("문서를 찾을 수 없습니다."));

    const response = await PUT(putRequest({ folderId: "f1" }), {
      params: Promise.resolve({ pageId: "doc-1" }),
    });

    expect(response.status).toBe(404);
  });
});
