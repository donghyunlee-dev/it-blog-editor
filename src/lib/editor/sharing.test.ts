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

const TARGET = { email: "a@s-food.com", accountFolderId: "account-a" };
const DOC_META = { ownerEmail: "owner@s-food.com", documentTitle: "회의록" };

/** pageId+key 조합별로 다른 값을 돌려주는 getPageProperty 대역. */
function stubProperties(
  values: Record<string, Record<string, unknown>>
) {
  return vi.spyOn(client, "getPageProperty").mockImplementation(async (pageId, key) => {
    const value = values[pageId]?.[key as string];
    if (value === undefined) return null;
    return { id: "prop-1", key: key as string, value, version: { number: 1 } };
  });
}

describe("shareDocument", () => {
  it("공유 대상을 sharedWith에 추가하고, 대상 계정 폴더의 sharedDocumentRefs에도 항목을 추가한다(P6-4)", async () => {
    vi.spyOn(client, "getPageProperty").mockResolvedValue(null);
    const upsertSpy = vi.spyOn(client, "upsertPageProperty").mockResolvedValue({
      id: "prop-1",
      key: "sharingMeta",
      value: {},
      version: { number: 1 },
    });

    const result = await shareDocument("page-1", TARGET, DOC_META);

    expect(upsertSpy).toHaveBeenCalledWith("page-1", "sharingMeta", {
      sharedWith: ["a@s-food.com"],
    });
    expect(upsertSpy).toHaveBeenCalledWith("account-a", "sharedDocumentRefs", [
      {
        pageId: "page-1",
        ownerEmail: "owner@s-food.com",
        documentTitle: "회의록",
        sharedAt: expect.any(String),
      },
    ]);
    expect(result.sharedWith).toEqual(["a@s-food.com"]);
  });

  it("이미 공유된 대상을 다시 추가해도 sharedWith가 중복되지 않고 sharedDocumentRefs도 건드리지 않는다(idempotent)", async () => {
    vi.spyOn(client, "getPageProperty").mockResolvedValue({
      id: "prop-1",
      key: "sharingMeta",
      value: { sharedWith: ["a@s-food.com"] },
      version: { number: 1 },
    });
    const upsertSpy = vi.spyOn(client, "upsertPageProperty");

    const result = await shareDocument("page-1", TARGET, DOC_META);

    expect(upsertSpy).not.toHaveBeenCalled();
    expect(result.sharedWith).toEqual(["a@s-food.com"]);
  });

  it("재공유(다른 문서 제목)하면 sharedDocumentRefs의 기존 항목을 교체한다(중복 추가 아님)", async () => {
    stubProperties({
      "page-1": { sharingMeta: { sharedWith: [] } },
      "account-a": {
        sharedDocumentRefs: [
          {
            pageId: "page-1",
            ownerEmail: "owner@s-food.com",
            documentTitle: "옛 제목",
            sharedAt: "2026-09-01T00:00:00.000Z",
          },
          {
            pageId: "page-2",
            ownerEmail: "owner@s-food.com",
            documentTitle: "다른 문서",
            sharedAt: "2026-09-01T00:00:00.000Z",
          },
        ],
      },
    });
    const upsertSpy = vi.spyOn(client, "upsertPageProperty").mockResolvedValue({
      id: "prop-1",
      key: "sharedDocumentRefs",
      value: [],
      version: { number: 2 },
    });

    await shareDocument("page-1", TARGET, { ...DOC_META, documentTitle: "새 제목" });

    expect(upsertSpy).toHaveBeenCalledWith("account-a", "sharedDocumentRefs", [
      {
        pageId: "page-2",
        ownerEmail: "owner@s-food.com",
        documentTitle: "다른 문서",
        sharedAt: "2026-09-01T00:00:00.000Z",
      },
      {
        pageId: "page-1",
        ownerEmail: "owner@s-food.com",
        documentTitle: "새 제목",
        sharedAt: expect.any(String),
      },
    ]);
  });

  it("기존 lastEditedBy는 보존한다", async () => {
    const lastEditedBy = { email: "owner@s-food.com", name: "홍길동", editedAt: "2026-09-01T00:00:00.000Z" };
    stubProperties({
      "page-1": { sharingMeta: { sharedWith: [], lastEditedBy } },
    });
    const upsertSpy = vi.spyOn(client, "upsertPageProperty").mockResolvedValue({
      id: "prop-1",
      key: "sharingMeta",
      value: {},
      version: { number: 2 },
    });

    await shareDocument("page-1", TARGET, DOC_META);

    expect(upsertSpy).toHaveBeenCalledWith("page-1", "sharingMeta", {
      sharedWith: ["a@s-food.com"],
      lastEditedBy,
    });
  });
});

describe("unshareDocument", () => {
  it("공유 대상을 sharedWith에서 제거하고, 대상 계정 폴더의 sharedDocumentRefs에서도 그 문서 항목을 제거한다(P6-4)", async () => {
    stubProperties({
      "page-1": { sharingMeta: { sharedWith: ["a@s-food.com", "b@s-food.com"] } },
      "account-a": {
        sharedDocumentRefs: [
          {
            pageId: "page-1",
            ownerEmail: "owner@s-food.com",
            documentTitle: "회의록",
            sharedAt: "2026-09-01T00:00:00.000Z",
          },
          {
            pageId: "page-2",
            ownerEmail: "owner@s-food.com",
            documentTitle: "다른 문서",
            sharedAt: "2026-09-01T00:00:00.000Z",
          },
        ],
      },
    });
    const upsertSpy = vi.spyOn(client, "upsertPageProperty").mockResolvedValue({
      id: "prop-1",
      key: "sharingMeta",
      value: {},
      version: { number: 2 },
    });

    const result = await unshareDocument("page-1", TARGET);

    expect(upsertSpy).toHaveBeenCalledWith("page-1", "sharingMeta", {
      sharedWith: ["b@s-food.com"],
    });
    expect(upsertSpy).toHaveBeenCalledWith("account-a", "sharedDocumentRefs", [
      {
        pageId: "page-2",
        ownerEmail: "owner@s-food.com",
        documentTitle: "다른 문서",
        sharedAt: "2026-09-01T00:00:00.000Z",
      },
    ]);
    expect(result.sharedWith).toEqual(["b@s-food.com"]);
  });

  it("원래 공유돼 있지 않은 대상을 제거해도 에러 없이 그대로 두고 sharedDocumentRefs도 건드리지 않는다(idempotent)", async () => {
    vi.spyOn(client, "getPageProperty").mockResolvedValue({
      id: "prop-1",
      key: "sharingMeta",
      value: { sharedWith: ["b@s-food.com"] },
      version: { number: 1 },
    });
    const upsertSpy = vi.spyOn(client, "upsertPageProperty");

    const result = await unshareDocument("page-1", TARGET);

    expect(upsertSpy).not.toHaveBeenCalled();
    expect(result.sharedWith).toEqual(["b@s-food.com"]);
  });

  it("sharedDocumentRefs에 그 문서 항목이 이미 없으면(드리프트) 다시 쓰지 않는다(idempotent)", async () => {
    stubProperties({
      "page-1": { sharingMeta: { sharedWith: ["a@s-food.com"] } },
      "account-a": {
        sharedDocumentRefs: [
          {
            pageId: "page-2",
            ownerEmail: "owner@s-food.com",
            documentTitle: "다른 문서",
            sharedAt: "2026-09-01T00:00:00.000Z",
          },
        ],
      },
    });
    const upsertSpy = vi.spyOn(client, "upsertPageProperty").mockResolvedValue({
      id: "prop-1",
      key: "sharingMeta",
      value: {},
      version: { number: 2 },
    });

    await unshareDocument("page-1", TARGET);

    expect(upsertSpy).toHaveBeenCalledTimes(1);
    expect(upsertSpy).toHaveBeenCalledWith("page-1", "sharingMeta", { sharedWith: [] });
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
