import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth-guard", () => ({
  requireSessionEmail: vi.fn(),
}));

vi.mock("@/lib/editor/deleted-documents", () => ({
  listDeletedDocuments: vi.fn(),
}));

import { requireSessionEmail } from "@/lib/auth-guard";
import { listDeletedDocuments } from "@/lib/editor/deleted-documents";
import { UnauthorizedError } from "@/lib/editor/errors";
import { GET } from "./route";

beforeEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

describe("GET /api/editor/documents/deleted", () => {
  it("로그인한 이메일 기준 삭제된 문서 목록을 반환한다", async () => {
    vi.mocked(requireSessionEmail).mockResolvedValue("user@s-food.com");
    vi.mocked(listDeletedDocuments).mockResolvedValue([
      { pageId: "doc-1", title: "문서 1", deletedAt: "2026-08-20T00:00:00.000Z" },
    ]);

    const response = await GET();
    const body = await response.json();

    expect(vi.mocked(listDeletedDocuments)).toHaveBeenCalledWith("user@s-food.com");
    expect(body).toEqual({
      documents: [{ pageId: "doc-1", title: "문서 1", deletedAt: "2026-08-20T00:00:00.000Z" }],
    });
  });

  it("로그인하지 않았으면 401을 반환한다", async () => {
    vi.mocked(requireSessionEmail).mockRejectedValue(
      new UnauthorizedError("로그인이 필요합니다.")
    );

    const response = await GET();

    expect(response.status).toBe(401);
    expect(vi.mocked(listDeletedDocuments)).not.toHaveBeenCalled();
  });
});
