import { beforeEach, describe, expect, it, vi } from "vitest";
import * as client from "@/lib/confluence/client";
import type { ConfluencePage } from "@/lib/confluence/client";
import * as access from "./access";
import { createPersonalFolder, findPersonalFolder } from "./folder";
import { ConflictError } from "./errors";

const EMAIL = "user@s-food.com";

function page(id: string, title: string, parentId: string | null): ConfluencePage {
  return {
    id,
    status: "current",
    title,
    spaceId: "space-1",
    parentId,
    version: { number: 1, createdAt: "" },
  };
}

beforeEach(() => {
  vi.restoreAllMocks();
  vi.spyOn(client, "getConfiguredSpace").mockResolvedValue({
    id: "space-1",
    key: "SFOODIT",
    homepageId: "home-1",
  });
});

describe("findPersonalFolder", () => {
  it("계정 폴더와 그 하위 초안/게시 서브폴더를 찾아 반환한다", async () => {
    const findSpy = vi.spyOn(client, "findChildPageByTitle").mockImplementation(
      async (parentId, title) => {
        if (parentId === "home-1" && title === EMAIL) {
          return page("account-1", EMAIL, "home-1");
        }
        if (parentId === "account-1" && title === "초안") {
          return page("draft-1", "초안", "account-1");
        }
        if (parentId === "account-1" && title === "게시") {
          return page("published-1", "게시", "account-1");
        }
        return null;
      }
    );

    const folder = await findPersonalFolder(EMAIL);

    expect(findSpy).toHaveBeenCalledWith("home-1", EMAIL);
    expect(findSpy).toHaveBeenCalledWith("account-1", "초안");
    expect(findSpy).toHaveBeenCalledWith("account-1", "게시");
    expect(folder).toEqual({
      accountFolderId: "account-1",
      draftFolderId: "draft-1",
      publishedFolderId: "published-1",
      spaceKey: "SFOODIT",
    });
  });

  it("계정 폴더가 없으면 null을 반환한다", async () => {
    vi.spyOn(client, "findChildPageByTitle").mockResolvedValue(null);

    const folder = await findPersonalFolder(EMAIL);

    expect(folder).toBeNull();
  });

  it("계정 폴더는 있지만 '게시' 서브폴더가 없으면 만들어서 보완한다", async () => {
    vi.spyOn(client, "findChildPageByTitle").mockImplementation(
      async (parentId, title) => {
        if (parentId === "home-1" && title === EMAIL) {
          return page("account-1", EMAIL, "home-1");
        }
        if (parentId === "account-1" && title === "초안") {
          return page("draft-1", "초안", "account-1");
        }
        // "게시" 서브폴더가 아직 없는 부분 실패 상황(직전 createPersonalFolder가 중간에 실패)
        return null;
      }
    );
    const createSpy = vi.spyOn(client, "createPage").mockResolvedValue(
      page("published-1", "게시", "account-1")
    );
    const hideSpy = vi.spyOn(access, "hidePageFromOthers").mockResolvedValue(undefined);

    const folder = await findPersonalFolder(EMAIL);

    expect(createSpy).toHaveBeenCalledWith({
      spaceId: "space-1",
      parentId: "account-1",
      title: "게시",
      bodyValue: expect.any(String),
    });
    expect(hideSpy).not.toHaveBeenCalled();
    expect(folder).toEqual({
      accountFolderId: "account-1",
      draftFolderId: "draft-1",
      publishedFolderId: "published-1",
      spaceKey: "SFOODIT",
    });
  });

  it("계정 폴더는 있지만 '초안' 서브폴더가 없으면 만들어서 보완하고 제한을 건다", async () => {
    vi.spyOn(client, "findChildPageByTitle").mockImplementation(
      async (parentId, title) => {
        if (parentId === "home-1" && title === EMAIL) {
          return page("account-1", EMAIL, "home-1");
        }
        if (parentId === "account-1" && title === "게시") {
          return page("published-1", "게시", "account-1");
        }
        // "초안" 서브폴더가 아직 없는 부분 실패 상황
        return null;
      }
    );
    const createSpy = vi.spyOn(client, "createPage").mockResolvedValue(
      page("draft-1", "초안", "account-1")
    );
    const hideSpy = vi.spyOn(access, "hidePageFromOthers").mockResolvedValue(undefined);

    const folder = await findPersonalFolder(EMAIL);

    expect(createSpy).toHaveBeenCalledWith({
      spaceId: "space-1",
      parentId: "account-1",
      title: "초안",
      bodyValue: expect.any(String),
    });
    expect(hideSpy).toHaveBeenCalledTimes(1);
    expect(hideSpy).toHaveBeenCalledWith("draft-1");
    expect(folder).toEqual({
      accountFolderId: "account-1",
      draftFolderId: "draft-1",
      publishedFolderId: "published-1",
      spaceKey: "SFOODIT",
    });
  });
});

describe("createPersonalFolder", () => {
  it("계정 폴더 + 초안/게시 서브폴더를 만들고 초안 폴더만 숨긴다", async () => {
    vi.spyOn(client, "findChildPageByTitle").mockResolvedValue(null);
    const createSpy = vi.spyOn(client, "createPage").mockImplementation(async (input) => {
      if (input.title === EMAIL) {
        return page("account-1", EMAIL, "home-1");
      }
      if (input.title === "초안") {
        return page("draft-1", "초안", "account-1");
      }
      return page("published-1", "게시", "account-1");
    });
    const hideSpy = vi.spyOn(access, "hidePageFromOthers").mockResolvedValue(undefined);

    const folder = await createPersonalFolder(EMAIL);

    expect(createSpy).toHaveBeenCalledWith({
      spaceId: "space-1",
      parentId: "home-1",
      title: EMAIL,
      bodyValue: expect.stringContaining(EMAIL),
    });
    expect(createSpy).toHaveBeenCalledWith({
      spaceId: "space-1",
      parentId: "account-1",
      title: "초안",
      bodyValue: expect.any(String),
    });
    expect(createSpy).toHaveBeenCalledWith({
      spaceId: "space-1",
      parentId: "account-1",
      title: "게시",
      bodyValue: expect.any(String),
    });

    expect(hideSpy).toHaveBeenCalledTimes(1);
    expect(hideSpy).toHaveBeenCalledWith("draft-1");

    expect(folder).toEqual({
      accountFolderId: "account-1",
      draftFolderId: "draft-1",
      publishedFolderId: "published-1",
      spaceKey: "SFOODIT",
    });
  });

  it("이미 계정 폴더가 있으면 ConflictError를 던진다", async () => {
    vi.spyOn(client, "findChildPageByTitle").mockResolvedValue(
      page("account-1", EMAIL, "home-1")
    );

    await expect(createPersonalFolder(EMAIL)).rejects.toThrow(ConflictError);
  });
});
