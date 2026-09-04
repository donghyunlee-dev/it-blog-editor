import { beforeEach, describe, expect, it, vi } from "vitest";
import * as client from "@/lib/confluence/client";
import {
  getSharedDocumentRefs,
  getSharingMeta,
  shareDocument,
  unshareDocument,
  updateLastEditedBy,
} from "./sharing";
import type { SharedDocumentRef, SharingMeta } from "./sharing";

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("getSharingMeta", () => {
  it("sharingMeta property가 없으면 기본값({sharedWith: []})을 반환한다", async () => {
    vi.spyOn(client, "getPageProperty").mockResolvedValue(null);

    await expect(getSharingMeta("page-1")).resolves.toEqual({ sharedWith: [] });
  });

  it("sharingMeta property가 있으면 그 값을 그대로 반환한다", async () => {
    const value: SharingMeta = {
      sharedWith: ["a@s-food.com"],
      lastEditedBy: { email: "a@s-food.com", name: "김철수", editedAt: "2026-09-04T00:00:00.000Z" },
    };
    vi.spyOn(client, "getPageProperty").mockResolvedValue({
      id: "prop-1",
      key: "sharingMeta",
      value,
      version: { number: 1 },
    });

    await expect(getSharingMeta("page-1")).resolves.toEqual(value);
  });
});

describe("shareDocument", () => {
  it("공유 대상을 sharedWith에 추가한다", async () => {
    vi.spyOn(client, "getPageProperty").mockResolvedValue(null);
    const upsertSpy = vi.spyOn(client, "upsertPageProperty").mockResolvedValue({
      id: "prop-1",
      key: "sharingMeta",
      value: {},
      version: { number: 1 },
    });

    const result = await shareDocument("page-1", "a@s-food.com");

    expect(upsertSpy).toHaveBeenCalledWith("page-1", "sharingMeta", {
      sharedWith: ["a@s-food.com"],
    });
    expect(result.sharedWith).toEqual(["a@s-food.com"]);
  });

  it("이미 공유된 대상을 다시 추가해도 중복되지 않는다(idempotent)", async () => {
    vi.spyOn(client, "getPageProperty").mockResolvedValue({
      id: "prop-1",
      key: "sharingMeta",
      value: { sharedWith: ["a@s-food.com"] },
      version: { number: 1 },
    });
    const upsertSpy = vi.spyOn(client, "upsertPageProperty");

    const result = await shareDocument("page-1", "a@s-food.com");

    expect(upsertSpy).not.toHaveBeenCalled();
    expect(result.sharedWith).toEqual(["a@s-food.com"]);
  });

  it("기존 lastEditedBy는 보존한다", async () => {
    const lastEditedBy = { email: "owner@s-food.com", name: "홍길동", editedAt: "2026-09-01T00:00:00.000Z" };
    vi.spyOn(client, "getPageProperty").mockResolvedValue({
      id: "prop-1",
      key: "sharingMeta",
      value: { sharedWith: [], lastEditedBy },
      version: { number: 1 },
    });
    const upsertSpy = vi.spyOn(client, "upsertPageProperty").mockResolvedValue({
      id: "prop-1",
      key: "sharingMeta",
      value: {},
      version: { number: 2 },
    });

    await shareDocument("page-1", "a@s-food.com");

    expect(upsertSpy).toHaveBeenCalledWith("page-1", "sharingMeta", {
      sharedWith: ["a@s-food.com"],
      lastEditedBy,
    });
  });
});

describe("unshareDocument", () => {
  it("공유 대상을 sharedWith에서 제거한다", async () => {
    vi.spyOn(client, "getPageProperty").mockResolvedValue({
      id: "prop-1",
      key: "sharingMeta",
      value: { sharedWith: ["a@s-food.com", "b@s-food.com"] },
      version: { number: 1 },
    });
    const upsertSpy = vi.spyOn(client, "upsertPageProperty").mockResolvedValue({
      id: "prop-1",
      key: "sharingMeta",
      value: {},
      version: { number: 2 },
    });

    const result = await unshareDocument("page-1", "a@s-food.com");

    expect(upsertSpy).toHaveBeenCalledWith("page-1", "sharingMeta", {
      sharedWith: ["b@s-food.com"],
    });
    expect(result.sharedWith).toEqual(["b@s-food.com"]);
  });

  it("원래 공유돼 있지 않은 대상을 제거해도 에러 없이 그대로 둔다(idempotent)", async () => {
    vi.spyOn(client, "getPageProperty").mockResolvedValue({
      id: "prop-1",
      key: "sharingMeta",
      value: { sharedWith: ["b@s-food.com"] },
      version: { number: 1 },
    });
    const upsertSpy = vi.spyOn(client, "upsertPageProperty");

    const result = await unshareDocument("page-1", "a@s-food.com");

    expect(upsertSpy).not.toHaveBeenCalled();
    expect(result.sharedWith).toEqual(["b@s-food.com"]);
  });
});

describe("updateLastEditedBy", () => {
  it("lastEditedBy를 갱신하고 sharedWith는 보존한다", async () => {
    vi.spyOn(client, "getPageProperty").mockResolvedValue({
      id: "prop-1",
      key: "sharingMeta",
      value: { sharedWith: ["a@s-food.com"] },
      version: { number: 1 },
    });
    const upsertSpy = vi.spyOn(client, "upsertPageProperty").mockResolvedValue({
      id: "prop-1",
      key: "sharingMeta",
      value: {},
      version: { number: 2 },
    });

    const result = await updateLastEditedBy("page-1", { email: "a@s-food.com", name: "김철수" });

    expect(upsertSpy).toHaveBeenCalledWith(
      "page-1",
      "sharingMeta",
      expect.objectContaining({
        sharedWith: ["a@s-food.com"],
        lastEditedBy: expect.objectContaining({ email: "a@s-food.com", name: "김철수" }),
      })
    );
    expect(result.lastEditedBy?.editedAt).toBeDefined();
  });
});

describe("getSharedDocumentRefs", () => {
  it("sharedDocumentRefs property가 없으면 빈 배열을 반환한다", async () => {
    vi.spyOn(client, "getPageProperty").mockResolvedValue(null);

    await expect(getSharedDocumentRefs("account-1")).resolves.toEqual([]);
  });

  it("sharedDocumentRefs property가 있으면 그 값을 그대로 반환한다", async () => {
    const refs: SharedDocumentRef[] = [
      {
        pageId: "page-1",
        ownerEmail: "owner@s-food.com",
        documentTitle: "회의록",
        sharedAt: "2026-09-04T00:00:00.000Z",
      },
    ];
    vi.spyOn(client, "getPageProperty").mockResolvedValue({
      id: "prop-1",
      key: "sharedDocumentRefs",
      value: refs,
      version: { number: 1 },
    });

    await expect(getSharedDocumentRefs("account-1")).resolves.toEqual(refs);
  });
});
