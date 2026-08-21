import { beforeEach, describe, expect, it, vi } from "vitest";
import * as client from "@/lib/confluence/client";
import { getContentRoots } from "./roots";

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("getContentRoots", () => {
  it("Space 홈페이지 하위의 초안/게시됨 루트 페이지 ID를 반환한다", async () => {
    vi.spyOn(client, "getConfiguredSpace").mockResolvedValue({
      id: "1",
      key: "SFOODIT",
      homepageId: "home-1",
    });
    vi.spyOn(client, "findChildPageByTitle").mockImplementation(async (_parentId, title) => {
      if (title === "초안") {
        return { id: "drafts-1", status: "current", title: "초안", spaceId: "1", parentId: "home-1", version: { number: 1, createdAt: "" } };
      }
      if (title === "게시됨") {
        return { id: "published-1", status: "current", title: "게시됨", spaceId: "1", parentId: "home-1", version: { number: 1, createdAt: "" } };
      }
      return null;
    });

    const roots = await getContentRoots();

    expect(roots).toEqual({ draftsRootId: "drafts-1", publishedRootId: "published-1" });
  });

  it("루트 페이지가 없으면 에러를 던진다", async () => {
    vi.spyOn(client, "getConfiguredSpace").mockResolvedValue({
      id: "1",
      key: "SFOODIT",
      homepageId: "home-1",
    });
    vi.spyOn(client, "findChildPageByTitle").mockResolvedValue(null);

    await expect(getContentRoots()).rejects.toThrow();
  });
});
