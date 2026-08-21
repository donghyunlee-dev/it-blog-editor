import { beforeEach, describe, expect, it, vi } from "vitest";
import * as client from "@/lib/confluence/client";
import * as access from "./access";
import * as roots from "./roots";
import { createDocument, listDocuments } from "./documents";

beforeEach(() => {
  vi.restoreAllMocks();
});

function page(id: string, title: string, parentId: string): client.ConfluencePage {
  return {
    id,
    status: "current",
    title,
    spaceId: "space-1",
    parentId,
    version: { number: 1, createdAt: "2026-08-21T00:00:00.000Z" },
  };
}

describe("listDocuments", () => {
  it("개인 폴더에 초안만 있으면 초안 목록을 그대로 반환한다", async () => {
    vi.spyOn(roots, "getContentRoots").mockResolvedValue({
      draftsRootId: "drafts-1",
      publishedRootId: "published-1",
    });
    vi.spyOn(client, "listChildPages").mockImplementation(async (parentId) => {
      if (parentId === "folder-1") {
        return [page("doc-1", "초안 문서", "folder-1")];
      }
      return [];
    });

    const documents = await listDocuments("folder-1", "user@s-food.com");

    expect(documents).toEqual([
      { pageId: "doc-1", title: "초안 문서", updatedAt: "2026-08-21T00:00:00.000Z" },
    ]);
  });

  it("게시됨 루트로 이동한 본인 문서도 목록에 함께 반환한다", async () => {
    vi.spyOn(roots, "getContentRoots").mockResolvedValue({
      draftsRootId: "drafts-1",
      publishedRootId: "published-1",
    });
    vi.spyOn(client, "listChildPages").mockImplementation(async (parentId) => {
      if (parentId === "folder-1") {
        return [page("doc-1", "초안 문서", "folder-1")];
      }
      if (parentId === "published-1") {
        return [
          page("doc-2", "게시된 내 문서", "published-1"),
          page("doc-3", "남의 게시 문서", "published-1"),
        ];
      }
      return [];
    });
    vi.spyOn(client, "getPageProperty").mockImplementation(async (pageId, key) => {
      if (key !== "authorMeta") {
        return null;
      }
      const email = pageId === "doc-2" ? "user@s-food.com" : "other@s-food.com";
      return {
        id: `prop-${pageId}`,
        key,
        value: { actualAuthorEmail: email },
        version: { number: 1 },
      };
    });

    const documents = await listDocuments("folder-1", "user@s-food.com");

    expect(documents.map((doc) => doc.pageId)).toEqual(["doc-1", "doc-2"]);
  });
});

describe("createDocument", () => {
  it("문서를 만든 뒤 서비스 계정 전용으로 숨긴다", async () => {
    vi.spyOn(client, "getConfiguredSpace").mockResolvedValue({
      id: "space-1",
      key: "SFOODIT",
      homepageId: "home-1",
    });
    vi.spyOn(client, "createPage").mockResolvedValue({
      id: "doc-1",
      status: "current",
      title: "제목",
      spaceId: "space-1",
      parentId: "folder-1",
      version: { number: 1, createdAt: "" },
    });
    vi.spyOn(client, "upsertPageProperty").mockResolvedValue({
      id: "prop-1",
      key: "authorMeta",
      value: {},
      version: { number: 1 },
    });
    const hideSpy = vi.spyOn(access, "hidePageFromOthers").mockResolvedValue(undefined);

    const result = await createDocument({
      folderId: "folder-1",
      title: "제목",
      markdown: "본문",
      actualAuthorEmail: "user@s-food.com",
    });

    expect(hideSpy).toHaveBeenCalledWith("doc-1");
    expect(result).toEqual({ pageId: "doc-1", version: 1 });
  });
});
