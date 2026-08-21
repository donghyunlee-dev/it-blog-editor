import { beforeEach, describe, expect, it, vi } from "vitest";
import * as client from "@/lib/confluence/client";
import * as roots from "./roots";
import * as access from "./access";
import { createPersonalFolder, findPersonalFolder } from "./folder";
import { ConflictError } from "./errors";

beforeEach(() => {
  vi.restoreAllMocks();
  vi.spyOn(roots, "getContentRoots").mockResolvedValue({
    draftsRootId: "drafts-1",
    publishedRootId: "published-1",
  });
  vi.spyOn(client, "getConfiguredSpace").mockResolvedValue({
    id: "space-1",
    key: "SFOODIT",
    homepageId: "home-1",
  });
});

describe("findPersonalFolder", () => {
  it("초안 루트 하위에서 이메일 제목의 폴더를 찾는다", async () => {
    const findSpy = vi.spyOn(client, "findChildPageByTitle").mockResolvedValue({
      id: "folder-1",
      status: "current",
      title: "user@s-food.com",
      spaceId: "space-1",
      parentId: "drafts-1",
      version: { number: 1, createdAt: "" },
    });

    const folder = await findPersonalFolder("user@s-food.com");

    expect(findSpy).toHaveBeenCalledWith("drafts-1", "user@s-food.com");
    expect(folder).toEqual({ folderId: "folder-1", spaceKey: "SFOODIT" });
  });

  it("폴더가 없으면 null을 반환한다", async () => {
    vi.spyOn(client, "findChildPageByTitle").mockResolvedValue(null);

    const folder = await findPersonalFolder("user@s-food.com");

    expect(folder).toBeNull();
  });
});

describe("createPersonalFolder", () => {
  it("초안 루트 하위에 폴더를 만들고 서비스 계정 전용으로 숨긴다", async () => {
    vi.spyOn(client, "findChildPageByTitle").mockResolvedValue(null);
    const createSpy = vi.spyOn(client, "createPage").mockResolvedValue({
      id: "folder-1",
      status: "current",
      title: "user@s-food.com",
      spaceId: "space-1",
      parentId: "drafts-1",
      version: { number: 1, createdAt: "" },
    });
    const hideSpy = vi.spyOn(access, "hidePageFromOthers").mockResolvedValue(undefined);

    const folder = await createPersonalFolder("user@s-food.com");

    expect(createSpy).toHaveBeenCalledWith({
      spaceId: "space-1",
      parentId: "drafts-1",
      title: "user@s-food.com",
      bodyValue: "<p>user@s-food.com님의 개인 폴더입니다.</p>",
    });
    expect(hideSpy).toHaveBeenCalledWith("folder-1");
    expect(folder).toEqual({ folderId: "folder-1", spaceKey: "SFOODIT" });
  });

  it("이미 폴더가 있으면 ConflictError를 던진다", async () => {
    vi.spyOn(client, "findChildPageByTitle").mockResolvedValue({
      id: "folder-1",
      status: "current",
      title: "user@s-food.com",
      spaceId: "space-1",
      parentId: "drafts-1",
      version: { number: 1, createdAt: "" },
    });

    await expect(createPersonalFolder("user@s-food.com")).rejects.toThrow(ConflictError);
  });
});
