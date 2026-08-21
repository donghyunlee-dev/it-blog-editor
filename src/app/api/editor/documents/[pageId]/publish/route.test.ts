import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth-guard", () => ({
  requireSessionEmail: vi.fn(),
}));

vi.mock("@/lib/editor/publish", () => ({
  setPublishState: vi.fn(),
}));

vi.mock("@/lib/editor/documents", () => ({
  requireDocumentOwner: vi.fn(),
}));

import { requireSessionEmail } from "@/lib/auth-guard";
import { setPublishState } from "@/lib/editor/publish";
import { requireDocumentOwner } from "@/lib/editor/documents";
import { UnauthorizedError } from "@/lib/editor/errors";
import { PATCH } from "./route";

beforeEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
  vi.mocked(requireDocumentOwner).mockResolvedValue(undefined);
});

describe("PATCH /api/editor/documents/[pageId]/publish", () => {
  it("작성자가 아니면 401로 거부하고 게시 상태를 바꾸지 않는다", async () => {
    vi.mocked(requireSessionEmail).mockResolvedValue("attacker@s-food.com");
    vi.mocked(requireDocumentOwner).mockRejectedValue(
      new UnauthorizedError("이 문서에 대한 권한이 없습니다.")
    );

    const request = new Request("http://localhost/api/editor/documents/doc-1/publish", {
      method: "PATCH",
      body: JSON.stringify({ isPublished: true }),
    });

    const response = await PATCH(request, { params: Promise.resolve({ pageId: "doc-1" }) });

    expect(response.status).toBe(401);
    expect(vi.mocked(requireDocumentOwner)).toHaveBeenCalledWith(
      "doc-1",
      "attacker@s-food.com"
    );
    expect(vi.mocked(setPublishState)).not.toHaveBeenCalled();
  });

  it("viewers 필드를 그대로 setPublishState에 전달한다", async () => {
    vi.mocked(requireSessionEmail).mockResolvedValue("user@s-food.com");
    vi.mocked(setPublishState).mockResolvedValue({
      pageId: "doc-1",
      isPublished: true,
      viewers: { "tech-blog": { slug: "my-post", metaDescription: "설명" } },
      publishedAt: "2026-08-21T00:00:00.000Z",
    });

    const request = new Request("http://localhost/api/editor/documents/doc-1/publish", {
      method: "PATCH",
      body: JSON.stringify({
        isPublished: true,
        viewers: { "tech-blog": { slug: "my-post", metaDescription: "설명" } },
      }),
    });

    const response = await PATCH(request, { params: Promise.resolve({ pageId: "doc-1" }) });
    const body = await response.json();

    expect(vi.mocked(setPublishState)).toHaveBeenCalledWith({
      pageId: "doc-1",
      isPublished: true,
      viewers: { "tech-blog": { slug: "my-post", metaDescription: "설명" } },
    });
    expect(body.viewers).toEqual({ "tech-blog": { slug: "my-post", metaDescription: "설명" } });
  });
});
