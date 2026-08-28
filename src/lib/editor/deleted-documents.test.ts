import { beforeEach, describe, expect, it, vi } from "vitest";
import * as client from "@/lib/confluence/client";
import * as access from "./access";
import * as folder from "./folder";
import { NotFoundError } from "./errors";
import { listDeletedDocuments, restoreDocument } from "./deleted-documents";

const FOLDER = {
  accountFolderId: "account-1",
  draftFolderId: "draft-1",
  publishedFolderId: "published-1",
  spaceKey: "SPACE",
};

beforeEach(() => {
  vi.restoreAllMocks();
  vi.spyOn(folder, "findPersonalFolder").mockResolvedValue(FOLDER);
});

describe("listDeletedDocuments", () => {
  it("레지스트리가 없으면 빈 배열을 반환한다", async () => {
    vi.spyOn(client, "getPageProperty").mockResolvedValue(null);

    await expect(listDeletedDocuments("user@s-food.com")).resolves.toEqual([]);
  });

  it("삭제 시각 최신순으로 정렬해 반환한다", async () => {
    vi.spyOn(client, "getPageProperty").mockResolvedValue({
      id: "prop-1",
      key: "deletedDocuments",
      value: [
        { pageId: "old", title: "오래된 삭제", deletedAt: "2026-08-01T00:00:00.000Z" },
        { pageId: "new", title: "최근 삭제", deletedAt: "2026-08-20T00:00:00.000Z" },
      ],
      version: { number: 1 },
    });

    const result = await listDeletedDocuments("user@s-food.com");

    expect(result.map((entry) => entry.pageId)).toEqual(["new", "old"]);
  });
});

describe("restoreDocument", () => {
  function stubRegistry(entries: Array<{ pageId: string; title: string; deletedAt: string }>) {
    return vi.spyOn(client, "getPageProperty").mockResolvedValue({
      id: "prop-1",
      key: "deletedDocuments",
      value: entries,
      version: { number: 1 },
    });
  }

  it("레지스트리에 없는 pageId면 NotFoundError를 던진다(남의 문서 포함)", async () => {
    stubRegistry([{ pageId: "other-doc", title: "다른 문서", deletedAt: "2026-08-01T00:00:00.000Z" }]);

    await expect(restoreDocument("user@s-food.com", "doc-1")).rejects.toThrow(
      NotFoundError
    );
  });

  it("레지스트리에 있으면 초안 폴더로 이동시키고 제한을 다시 걸고 레지스트리에서 제거한다", async () => {
    stubRegistry([{ pageId: "doc-1", title: "문서 1", deletedAt: "2026-08-01T00:00:00.000Z" }]);
    const moveSpy = vi.spyOn(client, "movePage").mockResolvedValue({
      id: "doc-1",
      status: "current",
      title: "문서 1",
      spaceId: "space-1",
      parentId: "draft-1",
      version: { number: 3, createdAt: "" },
    });
    const hideSpy = vi.spyOn(access, "hidePageFromOthers").mockResolvedValue(undefined);
    const upsertSpy = vi.spyOn(client, "upsertPageProperty").mockResolvedValue({
      id: "prop-1",
      key: "deletedDocuments",
      value: [],
      version: { number: 2 },
    });

    await restoreDocument("user@s-food.com", "doc-1");

    expect(moveSpy).toHaveBeenCalledWith("doc-1", "draft-1");
    expect(hideSpy).toHaveBeenCalledWith("doc-1");
    expect(upsertSpy).toHaveBeenCalledWith("account-1", "deletedDocuments", []);
  });

  it("Confluence에서 이미 영구 삭제됐으면(404) 레지스트리에서 정리하고 NotFoundError를 던진다", async () => {
    stubRegistry([{ pageId: "doc-1", title: "문서 1", deletedAt: "2026-08-01T00:00:00.000Z" }]);
    vi.spyOn(client, "movePage").mockRejectedValue(
      new client.ConfluenceApiError(404, "Not Found")
    );
    const upsertSpy = vi.spyOn(client, "upsertPageProperty").mockResolvedValue({
      id: "prop-1",
      key: "deletedDocuments",
      value: [],
      version: { number: 2 },
    });

    await expect(restoreDocument("user@s-food.com", "doc-1")).rejects.toThrow(
      NotFoundError
    );
    expect(upsertSpy).toHaveBeenCalledWith("account-1", "deletedDocuments", []);
  });

  it("이동 중 예상 못한 오류(404 아님)는 레지스트리를 건드리지 않고 그대로 전파한다", async () => {
    stubRegistry([{ pageId: "doc-1", title: "문서 1", deletedAt: "2026-08-01T00:00:00.000Z" }]);
    vi.spyOn(client, "movePage").mockRejectedValue(
      new client.ConfluenceApiError(502, "Bad Gateway")
    );
    const upsertSpy = vi.spyOn(client, "upsertPageProperty");

    await expect(restoreDocument("user@s-food.com", "doc-1")).rejects.toThrow(
      client.ConfluenceApiError
    );
    expect(upsertSpy).not.toHaveBeenCalled();
  });
});
