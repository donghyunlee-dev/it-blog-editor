import { beforeEach, describe, expect, it, vi } from "vitest";
import * as client from "@/lib/confluence/client";
import * as roots from "./roots";
import * as access from "./access";
import * as folder from "./folder";
import { getPublishState, setPublishState } from "./publish";
import { ConflictError, ValidationError } from "./errors";

beforeEach(() => {
  vi.restoreAllMocks();
  vi.spyOn(client, "getConfiguredSpace").mockResolvedValue({
    id: "space-1",
    key: "SFOODIT",
    homepageId: "home-1",
  });
  vi.spyOn(roots, "getContentRoots").mockResolvedValue({
    draftsRootId: "drafts-1",
    publishedRootId: "published-1",
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

describe("setPublishState — 생명주기", () => {
  it("처음 게시할 때 게시됨 루트로 이동하고 제한을 해제한다", async () => {
    vi.spyOn(roots, "getContentRoots").mockResolvedValue({
      draftsRootId: "drafts-1",
      publishedRootId: "published-1",
    });
    vi.spyOn(client, "getPageProperty").mockResolvedValue(null);
    vi.spyOn(client, "findPublishedPageBySlug").mockResolvedValue(null);
    vi.spyOn(client, "upsertPageProperty").mockResolvedValue({
      id: "prop-1",
      key: "publishMetadata",
      value: { isPublished: true, viewers: {} },
      version: { number: 1 },
    });
    const moveSpy = vi.spyOn(client, "movePage").mockResolvedValue({
      id: "doc-1",
      status: "current",
      title: "제목",
      spaceId: "space-1",
      parentId: "published-1",
      version: { number: 2, createdAt: "" },
    });
    const revealSpy = vi.spyOn(access, "revealPageToSpace").mockResolvedValue(undefined);

    await setPublishState({
      pageId: "doc-1",
      isPublished: true,
      viewers: { "tech-blog": { slug: "my-post", metaDescription: "설명" } },
    });

    expect(moveSpy).toHaveBeenCalledWith("doc-1", "published-1");
    expect(revealSpy).toHaveBeenCalledWith("doc-1");
  });

  it("게시 취소 시 작성자의 개인 폴더로 되돌리고 다시 숨긴다", async () => {
    vi.spyOn(roots, "getContentRoots").mockResolvedValue({
      draftsRootId: "drafts-1",
      publishedRootId: "published-1",
    });
    vi.spyOn(client, "getPageProperty").mockImplementation(async (_pageId, key) => {
      if (key === "publishMetadata") {
        return {
          id: "prop-1",
          key,
          value: { isPublished: true, viewers: { "tech-blog": { slug: "my-post", metaDescription: "설명" } } },
          version: { number: 1 },
        };
      }
      if (key === "authorMeta") {
        return {
          id: "prop-2",
          key,
          value: { actualAuthorEmail: "user@s-food.com" },
          version: { number: 1 },
        };
      }
      return null;
    });
    vi.spyOn(folder, "findPersonalFolder").mockResolvedValue({
      folderId: "folder-1",
      spaceKey: "SFOODIT",
    });
    vi.spyOn(client, "upsertPageProperty").mockResolvedValue({
      id: "prop-1",
      key: "publishMetadata",
      value: { isPublished: false, viewers: {} },
      version: { number: 2 },
    });
    const moveSpy = vi.spyOn(client, "movePage").mockResolvedValue({
      id: "doc-1",
      status: "current",
      title: "제목",
      spaceId: "space-1",
      parentId: "folder-1",
      version: { number: 3, createdAt: "" },
    });
    const hideSpy = vi.spyOn(access, "hidePageFromOthers").mockResolvedValue(undefined);

    await setPublishState({ pageId: "doc-1", isPublished: false });

    expect(moveSpy).toHaveBeenCalledWith("doc-1", "folder-1");
    expect(hideSpy).toHaveBeenCalledWith("doc-1");
  });
});
