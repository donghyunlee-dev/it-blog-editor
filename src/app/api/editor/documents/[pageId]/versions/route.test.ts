import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth-guard", () => ({
  requireSessionEmail: vi.fn(),
}));

vi.mock("@/lib/editor/documents", () => ({
  requireDocumentAccess: vi.fn(),
  getDocumentVersionHistory: vi.fn(),
}));

import { requireSessionEmail } from "@/lib/auth-guard";
import {
  requireDocumentAccess,
  getDocumentVersionHistory,
} from "@/lib/editor/documents";
import { UnauthorizedError } from "@/lib/editor/errors";
import { GET } from "./route";

beforeEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
  vi.mocked(requireDocumentAccess).mockResolvedValue(undefined);
});

describe("GET /api/editor/documents/[pageId]/versions", () => {
  it("문서의 버전 이력을 반환한다", async () => {
    vi.mocked(requireSessionEmail).mockResolvedValue("user@s-food.com");
    vi.mocked(getDocumentVersionHistory).mockResolvedValue([
      { number: 2, createdAt: "2026-08-27T00:00:00.000Z", isCurrent: true },
      { number: 1, createdAt: "2026-08-20T00:00:00.000Z", isCurrent: false },
    ]);

    const request = new Request(
      "http://localhost/api/editor/documents/doc-1/versions"
    );
    const response = await GET(request, {
      params: Promise.resolve({ pageId: "doc-1" }),
    });
    const body = await response.json();

    expect(vi.mocked(getDocumentVersionHistory)).toHaveBeenCalledWith("doc-1");
    expect(body).toEqual({
      versions: [
        { number: 2, createdAt: "2026-08-27T00:00:00.000Z", isCurrent: true },
        { number: 1, createdAt: "2026-08-20T00:00:00.000Z", isCurrent: false },
      ],
    });
  });

  it("소유자도 공유받은 사람도 아니면 401로 거부하고 버전 이력을 조회하지 않는다", async () => {
    vi.mocked(requireSessionEmail).mockResolvedValue("attacker@s-food.com");
    vi.mocked(requireDocumentAccess).mockRejectedValue(
      new UnauthorizedError("이 문서에 대한 권한이 없습니다.")
    );

    const request = new Request(
      "http://localhost/api/editor/documents/doc-1/versions"
    );
    const response = await GET(request, {
      params: Promise.resolve({ pageId: "doc-1" }),
    });

    expect(response.status).toBe(401);
    expect(vi.mocked(getDocumentVersionHistory)).not.toHaveBeenCalled();
  });

  it("공유받은 사람이면(소유자가 아니어도) 버전 이력을 볼 수 있다(P6-6)", async () => {
    vi.mocked(requireSessionEmail).mockResolvedValue("shared@s-food.com");
    vi.mocked(getDocumentVersionHistory).mockResolvedValue([]);

    const request = new Request(
      "http://localhost/api/editor/documents/doc-1/versions"
    );
    const response = await GET(request, {
      params: Promise.resolve({ pageId: "doc-1" }),
    });

    expect(response.status).toBe(200);
    expect(vi.mocked(getDocumentVersionHistory)).toHaveBeenCalledWith("doc-1");
  });
});
