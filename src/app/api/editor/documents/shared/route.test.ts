import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth-guard", () => ({
  requireSessionEmail: vi.fn(),
}));

vi.mock("@/lib/editor/documents", () => ({
  listSharedDocuments: vi.fn(),
}));

import { requireSessionEmail } from "@/lib/auth-guard";
import { listSharedDocuments } from "@/lib/editor/documents";
import { UnauthorizedError } from "@/lib/editor/errors";
import { GET } from "./route";

beforeEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

describe("GET /api/editor/documents/shared", () => {
  it("로그인한 이메일 기준 공유받은 문서 목록을 반환한다", async () => {
    vi.mocked(requireSessionEmail).mockResolvedValue("user@s-food.com");
    vi.mocked(listSharedDocuments).mockResolvedValue([
      {
        pageId: "doc-1",
        title: "회의록",
        updatedAt: "2026-09-04T00:00:00.000Z",
        isPublished: false,
        tags: ["React"],
        folderId: null,
        ownerEmail: "owner@s-food.com",
        ownerName: "홍길동",
      },
    ]);

    const response = await GET();
    const body = await response.json();

    expect(vi.mocked(listSharedDocuments)).toHaveBeenCalledWith("user@s-food.com");
    expect(body).toEqual({
      documents: [
        {
          pageId: "doc-1",
          title: "회의록",
          updatedAt: "2026-09-04T00:00:00.000Z",
          isPublished: false,
          tags: ["React"],
          folderId: null,
          ownerEmail: "owner@s-food.com",
          ownerName: "홍길동",
        },
      ],
    });
  });

  it("로그인하지 않았으면 401을 반환한다", async () => {
    vi.mocked(requireSessionEmail).mockRejectedValue(
      new UnauthorizedError("로그인이 필요합니다.")
    );

    const response = await GET();

    expect(response.status).toBe(401);
    expect(vi.mocked(listSharedDocuments)).not.toHaveBeenCalled();
  });
});
