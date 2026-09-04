import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth-guard", () => ({
  requireSessionEmail: vi.fn(),
}));

vi.mock("@/lib/editor/publish", () => ({
  setPublishState: vi.fn(),
}));

vi.mock("@/lib/editor/documents", () => ({
  requireDocumentAccess: vi.fn(),
}));

vi.mock("@/lib/rate-limit", () => ({
  enforceRateLimit: vi.fn(),
}));

import { requireSessionEmail } from "@/lib/auth-guard";
import { setPublishState } from "@/lib/editor/publish";
import { requireDocumentAccess } from "@/lib/editor/documents";
import { RateLimitError, UnauthorizedError } from "@/lib/editor/errors";
import { enforceRateLimit } from "@/lib/rate-limit";
import { PATCH } from "./route";

beforeEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
  vi.mocked(requireDocumentAccess).mockResolvedValue(undefined);
});

describe("PATCH /api/editor/documents/[pageId]/publish", () => {
  it("소유자도 공유받은 사람도 아니면 401로 거부하고 게시 상태를 바꾸지 않는다", async () => {
    vi.mocked(requireSessionEmail).mockResolvedValue("attacker@s-food.com");
    vi.mocked(requireDocumentAccess).mockRejectedValue(
      new UnauthorizedError("이 문서에 대한 권한이 없습니다.")
    );

    const request = new Request("http://localhost/api/editor/documents/doc-1/publish", {
      method: "PATCH",
      body: JSON.stringify({ isPublished: true }),
    });

    const response = await PATCH(request, { params: Promise.resolve({ pageId: "doc-1" }) });

    expect(response.status).toBe(401);
    expect(vi.mocked(requireDocumentAccess)).toHaveBeenCalledWith(
      "doc-1",
      "attacker@s-food.com"
    );
    expect(vi.mocked(setPublishState)).not.toHaveBeenCalled();
  });

  it("공유받은 사람이면(소유자가 아니어도) 게시 설정을 바꿀 수 있다(P6-6)", async () => {
    vi.mocked(requireSessionEmail).mockResolvedValue("shared@s-food.com");
    vi.mocked(setPublishState).mockResolvedValue({
      pageId: "doc-1",
      isPublished: true,
      viewers: {},
      publishedAt: "2026-08-21T00:00:00.000Z",
    });

    const request = new Request("http://localhost/api/editor/documents/doc-1/publish", {
      method: "PATCH",
      body: JSON.stringify({ isPublished: true }),
    });

    const response = await PATCH(request, { params: Promise.resolve({ pageId: "doc-1" }) });

    expect(response.status).toBe(200);
    expect(vi.mocked(setPublishState)).toHaveBeenCalled();
  });

  it("viewers 필드를 그대로 setPublishState에 전달한다", async () => {
    vi.mocked(requireSessionEmail).mockResolvedValue("user@s-food.com");
    vi.mocked(setPublishState).mockResolvedValue({
      pageId: "doc-1",
      isPublished: true,
      viewers: {
        "tech-blog": { slug: "my-post", metaDescription: "설명", publicSlug: "my-post-internal-key" },
      },
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
    expect(body.viewers).toEqual({
      "tech-blog": { slug: "my-post", metaDescription: "설명", publicSlug: "my-post-internal-key" },
    });
  });

  it("레이트리밋을 초과하면 429를 반환하고 소유자 확인·setPublishState를 호출하지 않는다", async () => {
    vi.mocked(requireSessionEmail).mockResolvedValue("user@s-food.com");
    vi.mocked(enforceRateLimit).mockImplementation(() => {
      throw new RateLimitError(30);
    });

    const request = new Request("http://localhost/api/editor/documents/doc-1/publish", {
      method: "PATCH",
      body: JSON.stringify({ isPublished: true }),
    });

    const response = await PATCH(request, { params: Promise.resolve({ pageId: "doc-1" }) });

    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("30");
    expect(vi.mocked(requireDocumentAccess)).not.toHaveBeenCalled();
    expect(vi.mocked(setPublishState)).not.toHaveBeenCalled();
  });
});
