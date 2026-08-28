import { beforeEach, describe, expect, it, vi } from "vitest";
import * as client from "@/lib/confluence/client";
import * as access from "./access";
import * as folder from "./folder";
import { NotFoundError } from "./errors";
import { listDeletedDocuments, restoreDocument } from "./deleted-documents";

const FOLDER = {
  accountFolderId: "account-1",
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
  /** 레지스트리(계정 폴더)와, 복구 대상 문서의 publishMetadata를 각각 키에 맞춰 돌려준다.
   * P0-8 — restoreDocument가 복구 후 publishMetadata도 함께 조회/갱신하므로 키를 구분해야
   * 한다(하나의 mockResolvedValue로 뭉뚱그리면 잘못된 shape을 돌려주게 된다). */
  function stubGetPageProperty(options: {
    registry?: Array<{ pageId: string; title: string; deletedAt: string }>;
    publishMetadata?: { isPublished: boolean; viewers?: Record<string, unknown> };
  }) {
    return vi.spyOn(client, "getPageProperty").mockImplementation(async (pageId, key) => {
      if (key === "deletedDocuments" && pageId === "account-1") {
        return options.registry
          ? { id: "prop-1", key, value: options.registry, version: { number: 1 } }
          : null;
      }
      if (key === "publishMetadata") {
        return options.publishMetadata
          ? { id: "prop-2", key, value: options.publishMetadata, version: { number: 1 } }
          : null;
      }
      return null;
    });
  }

  it("레지스트리에 없는 pageId면 NotFoundError를 던진다(남의 문서 포함)", async () => {
    stubGetPageProperty({
      registry: [{ pageId: "other-doc", title: "다른 문서", deletedAt: "2026-08-01T00:00:00.000Z" }],
    });

    await expect(restoreDocument("user@s-food.com", "doc-1")).rejects.toThrow(
      NotFoundError
    );
  });

  it("레지스트리에 있으면 계정 폴더로 이동시키고 제한을 다시 걸고 레지스트리에서 제거한다(P0-8 — 더 이상 '초안' 서브폴더가 아니라 계정 폴더 하나뿐이다)", async () => {
    stubGetPageProperty({
      registry: [{ pageId: "doc-1", title: "문서 1", deletedAt: "2026-08-01T00:00:00.000Z" }],
    });
    const moveSpy = vi.spyOn(client, "movePage").mockResolvedValue({
      id: "doc-1",
      status: "current",
      title: "문서 1",
      spaceId: "space-1",
      parentId: "account-1",
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

    expect(moveSpy).toHaveBeenCalledWith("doc-1", "account-1");
    expect(hideSpy).toHaveBeenCalledWith("doc-1");
    expect(upsertSpy).toHaveBeenCalledWith("account-1", "deletedDocuments", []);
  });

  it("게시 중이던 문서를 복구하면 publishMetadata.isPublished를 false로 되돌린다(P0-8 — 안 하면 비공개 restriction과 '게시됨' 표시가 서로 모순된다)", async () => {
    stubGetPageProperty({
      registry: [{ pageId: "doc-1", title: "문서 1", deletedAt: "2026-08-01T00:00:00.000Z" }],
      publishMetadata: {
        isPublished: true,
        viewers: { "tech-blog": { slug: "my-post", metaDescription: "설명", publicSlug: "my-post-key" } },
      },
    });
    vi.spyOn(client, "movePage").mockResolvedValue({
      id: "doc-1",
      status: "current",
      title: "문서 1",
      spaceId: "space-1",
      parentId: "account-1",
      version: { number: 3, createdAt: "" },
    });
    vi.spyOn(access, "hidePageFromOthers").mockResolvedValue(undefined);
    const upsertSpy = vi.spyOn(client, "upsertPageProperty").mockResolvedValue({
      id: "prop-1",
      key: "deletedDocuments",
      value: [],
      version: { number: 2 },
    });

    await restoreDocument("user@s-food.com", "doc-1");

    expect(upsertSpy).toHaveBeenCalledWith("doc-1", "publishMetadata", {
      isPublished: false,
      viewers: { "tech-blog": { slug: "my-post", metaDescription: "설명", publicSlug: "my-post-key" } },
    });
  });

  it("게시 중이 아니었던 문서를 복구하면 publishMetadata를 다시 쓰지 않는다", async () => {
    stubGetPageProperty({
      registry: [{ pageId: "doc-1", title: "문서 1", deletedAt: "2026-08-01T00:00:00.000Z" }],
      publishMetadata: { isPublished: false },
    });
    vi.spyOn(client, "movePage").mockResolvedValue({
      id: "doc-1",
      status: "current",
      title: "문서 1",
      spaceId: "space-1",
      parentId: "account-1",
      version: { number: 3, createdAt: "" },
    });
    vi.spyOn(access, "hidePageFromOthers").mockResolvedValue(undefined);
    const upsertSpy = vi.spyOn(client, "upsertPageProperty").mockResolvedValue({
      id: "prop-1",
      key: "deletedDocuments",
      value: [],
      version: { number: 2 },
    });

    await restoreDocument("user@s-food.com", "doc-1");

    expect(upsertSpy).not.toHaveBeenCalledWith("doc-1", "publishMetadata", expect.anything());
  });

  it("Confluence에서 이미 영구 삭제됐으면(404) 레지스트리에서 정리하고 NotFoundError를 던진다", async () => {
    stubGetPageProperty({
      registry: [{ pageId: "doc-1", title: "문서 1", deletedAt: "2026-08-01T00:00:00.000Z" }],
    });
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
    stubGetPageProperty({
      registry: [{ pageId: "doc-1", title: "문서 1", deletedAt: "2026-08-01T00:00:00.000Z" }],
    });
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
