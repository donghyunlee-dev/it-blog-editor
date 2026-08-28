import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth-guard", () => ({
  requireSessionEmail: vi.fn(),
}));

vi.mock("@/lib/editor/deleted-documents", () => ({
  restoreDocument: vi.fn(),
}));

import { requireSessionEmail } from "@/lib/auth-guard";
import { restoreDocument } from "@/lib/editor/deleted-documents";
import { NotFoundError, UnauthorizedError } from "@/lib/editor/errors";
import { POST } from "./route";

beforeEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

describe("POST /api/editor/documents/[pageId]/restore", () => {
  it("로그인한 이메일과 pageId로 restoreDocument를 호출하고 204를 반환한다", async () => {
    vi.mocked(requireSessionEmail).mockResolvedValue("user@s-food.com");
    vi.mocked(restoreDocument).mockResolvedValue(undefined);

    const request = new Request("http://localhost/api/editor/documents/doc-1/restore", {
      method: "POST",
    });
    const response = await POST(request, { params: Promise.resolve({ pageId: "doc-1" }) });

    expect(vi.mocked(restoreDocument)).toHaveBeenCalledWith("user@s-food.com", "doc-1");
    expect(response.status).toBe(204);
  });

  it("로그인하지 않았으면 401을 반환한다", async () => {
    vi.mocked(requireSessionEmail).mockRejectedValue(
      new UnauthorizedError("로그인이 필요합니다.")
    );

    const request = new Request("http://localhost/api/editor/documents/doc-1/restore", {
      method: "POST",
    });
    const response = await POST(request, { params: Promise.resolve({ pageId: "doc-1" }) });

    expect(response.status).toBe(401);
    expect(vi.mocked(restoreDocument)).not.toHaveBeenCalled();
  });

  it("본인의 삭제 목록에 없는 문서면 404를 반환한다(남의 문서 포함)", async () => {
    vi.mocked(requireSessionEmail).mockResolvedValue("user@s-food.com");
    vi.mocked(restoreDocument).mockRejectedValue(
      new NotFoundError("삭제된 문서 목록에서 찾을 수 없습니다.")
    );

    const request = new Request("http://localhost/api/editor/documents/doc-1/restore", {
      method: "POST",
    });
    const response = await POST(request, { params: Promise.resolve({ pageId: "doc-1" }) });

    expect(response.status).toBe(404);
  });
});
