import { beforeEach, describe, expect, it, vi } from "vitest";
import * as client from "@/lib/confluence/client";
import { hidePageFromOthers, revealPageToSpace } from "./access";

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("hidePageFromOthers", () => {
  it("서비스 계정 자신의 accountId로 페이지를 제한한다", async () => {
    vi.spyOn(client, "getCurrentConfluenceUser").mockResolvedValue({ accountId: "acc-service" });
    const restrictSpy = vi.spyOn(client, "restrictPageToAccount").mockResolvedValue(undefined);

    await hidePageFromOthers("111");

    expect(restrictSpy).toHaveBeenCalledWith("111", "acc-service");
  });
});

describe("revealPageToSpace", () => {
  it("페이지 제한을 해제한다", async () => {
    const clearSpy = vi.spyOn(client, "clearPageRestrictions").mockResolvedValue(undefined);

    await revealPageToSpace("111");

    expect(clearSpy).toHaveBeenCalledWith("111");
  });
});
