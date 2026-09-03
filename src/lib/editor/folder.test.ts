import { beforeEach, describe, expect, it, vi } from "vitest";
import * as client from "@/lib/confluence/client";
import type { ConfluencePage } from "@/lib/confluence/client";
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
  it("이메일 제목의 계정 폴더를 찾아 반환한다", async () => {
    const findSpy = vi.spyOn(client, "findChildPageByTitle").mockImplementation(
      async (parentId, title) => {
        if (parentId === "home-1" && title === EMAIL) {
          return page("account-1", EMAIL, "home-1");
        }
        return null;
      }
    );

    const folder = await findPersonalFolder(EMAIL);

    expect(findSpy).toHaveBeenCalledWith("home-1", EMAIL);
    expect(folder).toEqual({ accountFolderId: "account-1", spaceKey: "SFOODIT" });
  });

  it("계정 폴더가 없으면 null을 반환한다", async () => {
    vi.spyOn(client, "findChildPageByTitle").mockResolvedValue(null);

    const folder = await findPersonalFolder(EMAIL);

    expect(folder).toBeNull();
  });
});

describe("createPersonalFolder", () => {
  it("계정 폴더를 만든다(제한 없음)", async () => {
    vi.spyOn(client, "findChildPageByTitle").mockResolvedValue(null);
    const createSpy = vi.spyOn(client, "createPage").mockResolvedValue(
      page("account-1", EMAIL, "home-1")
    );
    vi.spyOn(client, "getPageProperty").mockResolvedValue(null);
    const upsertSpy = vi.spyOn(client, "upsertPageProperty").mockResolvedValue({
      id: "prop-1",
      key: "accountMeta",
      value: { name: "", team: "", accessEnabled: true },
      version: { number: 1 },
    });

    const folder = await createPersonalFolder(EMAIL);

    expect(createSpy).toHaveBeenCalledWith({
      spaceId: "space-1",
      parentId: "home-1",
      title: EMAIL,
      bodyValue: expect.stringContaining(EMAIL),
    });
    expect(upsertSpy).toHaveBeenCalledWith("account-1", "accountMeta", {
      name: "",
      team: "",
      accessEnabled: true,
    });
    expect(folder).toEqual({ accountFolderId: "account-1", spaceKey: "SFOODIT" });
  });

  it("이미 계정 폴더가 있으면 ConflictError를 던진다", async () => {
    vi.spyOn(client, "findChildPageByTitle").mockResolvedValue(
      page("account-1", EMAIL, "home-1")
    );

    await expect(createPersonalFolder(EMAIL)).rejects.toThrow(ConflictError);
  });
});
