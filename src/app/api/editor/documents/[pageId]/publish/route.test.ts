import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth-guard", () => ({
  requireSessionEmail: vi.fn(),
}));

vi.mock("@/lib/editor/publish", () => ({
  setPublishState: vi.fn(),
}));

import { requireSessionEmail } from "@/lib/auth-guard";
import { setPublishState } from "@/lib/editor/publish";
import { PATCH } from "./route";

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("PATCH /api/editor/documents/[pageId]/publish", () => {
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
