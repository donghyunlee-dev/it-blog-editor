import { beforeEach, describe, expect, it, vi } from "vitest";
import * as client from "@/lib/confluence/client";
import type { ConfluencePage } from "@/lib/confluence/client";
import {
  createPersonalFolder,
  deletePersonalFolder,
  ensurePersonalFolder,
  findPersonalFolder,
} from "./folder";
import { ConflictError, NotFoundError } from "./errors";

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

describe("ensurePersonalFolder", () => {
  it("계정 폴더가 이미 있으면 그대로 반환하고 새로 만들지 않는다", async () => {
    vi.spyOn(client, "findChildPageByTitle").mockResolvedValue(
      page("account-1", EMAIL, "home-1")
    );
    const createSpy = vi.spyOn(client, "createPage");

    const folder = await ensurePersonalFolder(EMAIL);

    expect(folder).toEqual({ accountFolderId: "account-1", spaceKey: "SFOODIT" });
    expect(createSpy).not.toHaveBeenCalled();
  });

  it("계정 폴더가 없으면 새로 만들어 반환한다", async () => {
    vi.spyOn(client, "findChildPageByTitle").mockResolvedValue(null);
    vi.spyOn(client, "createPage").mockResolvedValue(page("account-1", EMAIL, "home-1"));
    vi.spyOn(client, "getPageProperty").mockResolvedValue(null);
    vi.spyOn(client, "upsertPageProperty").mockResolvedValue({
      id: "prop-1",
      key: "accountMeta",
      value: { name: "", team: "", accessEnabled: true },
      version: { number: 1 },
    });

    const folder = await ensurePersonalFolder(EMAIL);

    expect(folder).toEqual({ accountFolderId: "account-1", spaceKey: "SFOODIT" });
  });

  it("동시 생성 경쟁으로 ConflictError가 나면 다시 조회해 반환한다", async () => {
    let findCallCount = 0;
    vi.spyOn(client, "findChildPageByTitle").mockImplementation(async () => {
      findCallCount += 1;
      // 처음(생성 시도 전 확인)엔 없다가, 다른 요청이 먼저 만들어 두 번째(재조회)엔 있다.
      return findCallCount === 1 ? null : page("account-1", EMAIL, "home-1");
    });
    vi.spyOn(client, "createPage").mockRejectedValue(new ConflictError("개인 폴더가 이미 존재합니다."));

    const folder = await ensurePersonalFolder(EMAIL);

    expect(folder).toEqual({ accountFolderId: "account-1", spaceKey: "SFOODIT" });
  });

  it("경쟁 상황에서도 재조회에 실패하면 원래 오류를 그대로 전파한다", async () => {
    vi.spyOn(client, "findChildPageByTitle").mockResolvedValue(null);
    vi.spyOn(client, "createPage").mockRejectedValue(new ConflictError("개인 폴더가 이미 존재합니다."));

    await expect(ensurePersonalFolder(EMAIL)).rejects.toThrow(ConflictError);
  });
});

describe("deletePersonalFolder", () => {
  it("계정 폴더를 휴지통으로 이동한다", async () => {
    vi.spyOn(client, "findChildPageByTitle").mockResolvedValue(
      page("account-1", EMAIL, "home-1")
    );
    const deleteSpy = vi.spyOn(client, "deletePage").mockResolvedValue(undefined);

    await deletePersonalFolder(EMAIL);

    expect(deleteSpy).toHaveBeenCalledWith("account-1");
  });

  it("계정 폴더가 없으면 NotFoundError를 던진다", async () => {
    vi.spyOn(client, "findChildPageByTitle").mockResolvedValue(null);
    const deleteSpy = vi.spyOn(client, "deletePage");

    await expect(deletePersonalFolder(EMAIL)).rejects.toThrow(NotFoundError);
    expect(deleteSpy).not.toHaveBeenCalled();
  });
});
