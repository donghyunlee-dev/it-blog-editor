import { beforeEach, describe, expect, it, vi } from "vitest";
import * as client from "@/lib/confluence/client";
import type { ConfluencePage } from "@/lib/confluence/client";
import { getAccountsByEmails, searchAccounts, upsertAccountIndexEntry } from "./account-index";
import type { AccountIndexEntry } from "./account-index";

function page(id: string, title: string): ConfluencePage {
  return {
    id,
    status: "current",
    title,
    spaceId: "space-1",
    parentId: "home-1",
    version: { number: 1, createdAt: "" },
  };
}

const ENTRY: AccountIndexEntry = {
  email: "user@s-food.com",
  name: "홍길동",
  team: "IT팀",
  accessEnabled: true,
  accountFolderId: "account-1",
};

beforeEach(() => {
  vi.restoreAllMocks();
  vi.spyOn(client, "getConfiguredSpace").mockResolvedValue({
    id: "space-1",
    key: "SFOODIT",
    homepageId: "home-1",
  });
});

describe("upsertAccountIndexEntry", () => {
  it("계정 관리 페이지가 없으면 새로 만들고 항목을 upsert한다", async () => {
    vi.spyOn(client, "findChildPageByTitle").mockResolvedValue(null);
    const createSpy = vi
      .spyOn(client, "createPage")
      .mockResolvedValue(page("index-1", "계정 관리"));
    vi.spyOn(client, "getPageProperty").mockResolvedValue(null);
    const upsertSpy = vi.spyOn(client, "upsertPageProperty").mockResolvedValue({
      id: "prop-1",
      key: "accountIndex",
      value: [ENTRY],
      version: { number: 1 },
    });

    await upsertAccountIndexEntry(ENTRY);

    expect(createSpy).toHaveBeenCalledWith({
      spaceId: "space-1",
      parentId: "home-1",
      title: "계정 관리",
      bodyValue: expect.any(String),
    });
    expect(upsertSpy).toHaveBeenCalledWith("index-1", "accountIndex", [ENTRY]);
  });

  it("계정 관리 페이지가 이미 있으면 새로 만들지 않고 그 페이지에 upsert한다", async () => {
    vi.spyOn(client, "findChildPageByTitle").mockResolvedValue(page("index-1", "계정 관리"));
    const createSpy = vi.spyOn(client, "createPage");
    vi.spyOn(client, "getPageProperty").mockResolvedValue(null);
    const upsertSpy = vi.spyOn(client, "upsertPageProperty").mockResolvedValue({
      id: "prop-1",
      key: "accountIndex",
      value: [ENTRY],
      version: { number: 1 },
    });

    await upsertAccountIndexEntry(ENTRY);

    expect(createSpy).not.toHaveBeenCalled();
    expect(upsertSpy).toHaveBeenCalledWith("index-1", "accountIndex", [ENTRY]);
  });

  it("같은 이메일의 기존 항목은 추가하지 않고 교체한다", async () => {
    vi.spyOn(client, "findChildPageByTitle").mockResolvedValue(page("index-1", "계정 관리"));
    vi.spyOn(client, "getPageProperty").mockResolvedValue({
      id: "prop-1",
      key: "accountIndex",
      value: [ENTRY, { ...ENTRY, email: "other@s-food.com", name: "김철수" }],
      version: { number: 1 },
    });
    const upsertSpy = vi.spyOn(client, "upsertPageProperty").mockResolvedValue({
      id: "prop-1",
      key: "accountIndex",
      value: [],
      version: { number: 2 },
    });

    const updated = { ...ENTRY, name: "홍길동2", team: "디자인팀" };
    await upsertAccountIndexEntry(updated);

    expect(upsertSpy).toHaveBeenCalledWith("index-1", "accountIndex", [
      { ...ENTRY, email: "other@s-food.com", name: "김철수" },
      updated,
    ]);
  });
});

describe("searchAccounts", () => {
  const OTHER: AccountIndexEntry = {
    email: "other@s-food.com",
    name: "김철수",
    team: "디자인팀",
    accessEnabled: false,
    accountFolderId: "account-2",
  };

  it("계정 관리 페이지가 없으면 페이지를 만들지 않고 빈 배열을 반환한다", async () => {
    vi.spyOn(client, "findChildPageByTitle").mockResolvedValue(null);
    const createSpy = vi.spyOn(client, "createPage");

    await expect(searchAccounts("아무거나")).resolves.toEqual([]);
    expect(createSpy).not.toHaveBeenCalled();
  });

  it("검색어가 빈 문자열이면 전체 목록을 반환한다", async () => {
    vi.spyOn(client, "findChildPageByTitle").mockResolvedValue(page("index-1", "계정 관리"));
    vi.spyOn(client, "getPageProperty").mockResolvedValue({
      id: "prop-1",
      key: "accountIndex",
      value: [ENTRY, OTHER],
      version: { number: 1 },
    });

    await expect(searchAccounts("")).resolves.toEqual([ENTRY, OTHER]);
  });

  it("이름·이메일·팀 부분 일치(대소문자 무시)로 필터링한다", async () => {
    vi.spyOn(client, "findChildPageByTitle").mockResolvedValue(page("index-1", "계정 관리"));
    vi.spyOn(client, "getPageProperty").mockResolvedValue({
      id: "prop-1",
      key: "accountIndex",
      value: [ENTRY, OTHER],
      version: { number: 1 },
    });

    await expect(searchAccounts("김철수")).resolves.toEqual([OTHER]);
    await expect(searchAccounts("IT팀")).resolves.toEqual([ENTRY]);
    await expect(searchAccounts("USER@S-FOOD.COM")).resolves.toEqual([ENTRY]);
  });

  it("접속이 차단된 계정도 검색 결과에 포함한다", async () => {
    vi.spyOn(client, "findChildPageByTitle").mockResolvedValue(page("index-1", "계정 관리"));
    vi.spyOn(client, "getPageProperty").mockResolvedValue({
      id: "prop-1",
      key: "accountIndex",
      value: [OTHER],
      version: { number: 1 },
    });

    await expect(searchAccounts("김철수")).resolves.toEqual([OTHER]);
  });
});

describe("getAccountsByEmails", () => {
  const OTHER: AccountIndexEntry = {
    email: "other@s-food.com",
    name: "김철수",
    team: "디자인팀",
    accessEnabled: true,
    accountFolderId: "account-2",
  };

  it("빈 배열이면 페이지를 조회하지 않고 빈 배열을 반환한다", async () => {
    const findSpy = vi.spyOn(client, "findChildPageByTitle");

    await expect(getAccountsByEmails([])).resolves.toEqual([]);
    expect(findSpy).not.toHaveBeenCalled();
  });

  it("주어진 이메일에 해당하는 계정만 골라 반환한다", async () => {
    vi.spyOn(client, "findChildPageByTitle").mockResolvedValue(page("index-1", "계정 관리"));
    vi.spyOn(client, "getPageProperty").mockResolvedValue({
      id: "prop-1",
      key: "accountIndex",
      value: [ENTRY, OTHER],
      version: { number: 1 },
    });

    await expect(getAccountsByEmails(["other@s-food.com"])).resolves.toEqual([OTHER]);
  });

  it("인덱스에 없는 이메일은 조용히 빠진다", async () => {
    vi.spyOn(client, "findChildPageByTitle").mockResolvedValue(page("index-1", "계정 관리"));
    vi.spyOn(client, "getPageProperty").mockResolvedValue({
      id: "prop-1",
      key: "accountIndex",
      value: [ENTRY],
      version: { number: 1 },
    });

    await expect(
      getAccountsByEmails(["user@s-food.com", "unknown@s-food.com"])
    ).resolves.toEqual([ENTRY]);
  });

  it("계정 관리 페이지가 없으면 빈 배열을 반환한다", async () => {
    vi.spyOn(client, "findChildPageByTitle").mockResolvedValue(null);

    await expect(getAccountsByEmails(["user@s-food.com"])).resolves.toEqual([]);
  });
});
