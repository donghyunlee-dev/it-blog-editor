import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth-guard", () => ({
  requireSessionEmail: vi.fn(),
}));

vi.mock("@/lib/editor/tags", () => ({
  setTags: vi.fn(),
}));

import { requireSessionEmail } from "@/lib/auth-guard";
import { setTags } from "@/lib/editor/tags";
import { PUT } from "./route";

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("PUT /api/editor/documents/[pageId]/tags", () => {
  it("tags를 setTags에 전달하고 결과를 반환한다", async () => {
    vi.mocked(requireSessionEmail).mockResolvedValue("user@s-food.com");
    vi.mocked(setTags).mockResolvedValue(["React", "Backend"]);

    const request = new Request("http://localhost/api/editor/documents/doc-1/tags", {
      method: "PUT",
      body: JSON.stringify({ tags: ["React", "Backend"] }),
    });

    const response = await PUT(request, { params: Promise.resolve({ pageId: "doc-1" }) });
    const body = await response.json();

    expect(vi.mocked(setTags)).toHaveBeenCalledWith("doc-1", ["React", "Backend"]);
    expect(body).toEqual({ pageId: "doc-1", tags: ["React", "Backend"] });
  });

  it("tags가 없으면 빈 배열로 처리한다", async () => {
    vi.mocked(requireSessionEmail).mockResolvedValue("user@s-food.com");
    vi.mocked(setTags).mockResolvedValue([]);

    const request = new Request("http://localhost/api/editor/documents/doc-1/tags", {
      method: "PUT",
      body: JSON.stringify({}),
    });

    const response = await PUT(request, { params: Promise.resolve({ pageId: "doc-1" }) });
    const body = await response.json();

    expect(vi.mocked(setTags)).toHaveBeenCalledWith("doc-1", []);
    expect(body).toEqual({ pageId: "doc-1", tags: [] });
  });
});
