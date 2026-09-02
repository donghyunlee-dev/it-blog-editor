import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth-guard", () => ({
  requireSessionEmail: vi.fn(),
}));

vi.mock("@/lib/editor/documents", () => ({
  updateDocument: vi.fn(),
  deleteDocument: vi.fn(),
  requireDocumentOwner: vi.fn(),
}));

import { requireSessionEmail } from "@/lib/auth-guard";
import { updateDocument, deleteDocument, requireDocumentOwner } from "@/lib/editor/documents";
import { ConflictError, NotFoundError, UnauthorizedError } from "@/lib/editor/errors";
import { PUT, DELETE } from "./route";

beforeEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
  vi.mocked(requireSessionEmail).mockResolvedValue("user@s-food.com");
  vi.mocked(requireDocumentOwner).mockResolvedValue(undefined);
});

function putRequest(body: unknown) {
  return new Request("http://localhost/api/editor/documents/doc-1", {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

describe("PUT /api/editor/documents/[pageId]", () => {
  it("정상 요청이면 소유자를 확인하고 updateDocument에 그대로 위임해 200을 반환한다", async () => {
    vi.mocked(updateDocument).mockResolvedValue({ pageId: "doc-1", version: 3 });

    const doc = { type: "doc", content: [] };
    const response = await PUT(putRequest({ title: "제목", doc, version: 2 }), {
      params: Promise.resolve({ pageId: "doc-1" }),
    });
    const body = await response.json();

    expect(vi.mocked(requireDocumentOwner)).toHaveBeenCalledWith("doc-1", "user@s-food.com");
    expect(vi.mocked(updateDocument)).toHaveBeenCalledWith({
      pageId: "doc-1",
      title: "제목",
      doc,
      expectedVersion: 2,
    });
    expect(body).toEqual({ pageId: "doc-1", version: 3 });
  });

  it("소유자가 아니면 401을 반환하고 updateDocument를 호출하지 않는다", async () => {
    vi.mocked(requireDocumentOwner).mockRejectedValue(new UnauthorizedError("이 문서에 대한 권한이 없습니다."));

    const response = await PUT(putRequest({ title: "제목", doc: { type: "doc", content: [] }, version: 1 }), {
      params: Promise.resolve({ pageId: "doc-1" }),
    });

    expect(response.status).toBe(401);
    expect(vi.mocked(updateDocument)).not.toHaveBeenCalled();
  });

  it("version이 숫자가 아니면(누락 포함) 400을 반환하고 updateDocument를 호출하지 않는다", async () => {
    const response = await PUT(putRequest({ title: "제목", doc: { type: "doc", content: [] } }), {
      params: Promise.resolve({ pageId: "doc-1" }),
    });

    expect(response.status).toBe(400);
    expect(vi.mocked(updateDocument)).not.toHaveBeenCalled();
  });

  it("updateDocument가 ConflictError를 던지면 409를 반환한다", async () => {
    vi.mocked(updateDocument).mockRejectedValue(new ConflictError("다른 사용자가 먼저 저장했습니다."));

    const response = await PUT(putRequest({ title: "제목", doc: { type: "doc", content: [] }, version: 1 }), {
      params: Promise.resolve({ pageId: "doc-1" }),
    });

    expect(response.status).toBe(409);
  });
});

describe("DELETE /api/editor/documents/[pageId]", () => {
  it("정상 요청이면 소유자를 확인하고 deleteDocument를 호출해 204를 반환한다", async () => {
    vi.mocked(deleteDocument).mockResolvedValue(undefined);

    const request = new Request("http://localhost/api/editor/documents/doc-1", { method: "DELETE" });
    const response = await DELETE(request, { params: Promise.resolve({ pageId: "doc-1" }) });

    expect(vi.mocked(requireDocumentOwner)).toHaveBeenCalledWith("doc-1", "user@s-food.com");
    expect(vi.mocked(deleteDocument)).toHaveBeenCalledWith("doc-1");
    expect(response.status).toBe(204);
  });

  it("소유자가 아니면 401을 반환하고 deleteDocument를 호출하지 않는다", async () => {
    vi.mocked(requireDocumentOwner).mockRejectedValue(new UnauthorizedError("이 문서에 대한 권한이 없습니다."));

    const request = new Request("http://localhost/api/editor/documents/doc-1", { method: "DELETE" });
    const response = await DELETE(request, { params: Promise.resolve({ pageId: "doc-1" }) });

    expect(response.status).toBe(401);
    expect(vi.mocked(deleteDocument)).not.toHaveBeenCalled();
  });

  it("deleteDocument가 NotFoundError를 던지면 404를 반환한다", async () => {
    vi.mocked(deleteDocument).mockRejectedValue(new NotFoundError("문서를 찾을 수 없습니다."));

    const request = new Request("http://localhost/api/editor/documents/doc-1", { method: "DELETE" });
    const response = await DELETE(request, { params: Promise.resolve({ pageId: "doc-1" }) });

    expect(response.status).toBe(404);
  });
});
