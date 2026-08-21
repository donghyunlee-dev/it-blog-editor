import { beforeEach, describe, expect, it, vi } from "vitest";
import * as client from "@/lib/confluence/client";
import { getPublishState, setPublishState } from "./publish";
import { ConflictError, ValidationError } from "./errors";

beforeEach(() => {
  vi.restoreAllMocks();
  vi.spyOn(client, "getConfiguredSpace").mockResolvedValue({
    id: "space-1",
    key: "SFOODIT",
    homepageId: "home-1",
  });
});

describe("getPublishState", () => {
  it("설정이 없으면 기본값(미게시, 빈 viewers)을 반환한다", async () => {
    vi.spyOn(client, "getPageProperty").mockResolvedValue(null);

    const state = await getPublishState("doc-1");

    expect(state).toEqual({ isPublished: false, viewers: {} });
  });
});

describe("setPublishState", () => {
  it("게시 시 slug/metaDescription이 없으면 ValidationError를 던진다", async () => {
    vi.spyOn(client, "getPageProperty").mockResolvedValue(null);

    await expect(
      setPublishState({ pageId: "doc-1", isPublished: true, viewers: {} })
    ).rejects.toThrow(ValidationError);
  });

  it("같은 뷰어에서 slug가 이미 쓰이고 있으면 ConflictError를 던진다", async () => {
    vi.spyOn(client, "getPageProperty").mockResolvedValue(null);
    vi.spyOn(client, "findPublishedPageBySlug").mockResolvedValue({
      id: "other-doc",
      status: "current",
      title: "다른 문서",
      spaceId: "space-1",
      parentId: null,
      version: { number: 1, createdAt: "" },
    });

    await expect(
      setPublishState({
        pageId: "doc-1",
        isPublished: true,
        viewers: { "tech-blog": { slug: "my-post", metaDescription: "설명" } },
      })
    ).rejects.toThrow(ConflictError);
  });
});
