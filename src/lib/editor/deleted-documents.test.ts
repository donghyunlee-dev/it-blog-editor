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
  /** `deletedDocuments`/`folderIndex`를 키에 맞춰 각각 돌려준다(P16-1). */
  function stubGetPageProperty(options: {
    registry?: unknown[];
    folderIndex?: Array<{ id: string; name: string; parentId: string | null; order: number }>;
  }) {
    return vi.spyOn(client, "getPageProperty").mockImplementation(async (pageId, key) => {
      if (key === "deletedDocuments" && pageId === "account-1") {
        return options.registry
          ? { id: "prop-1", key, value: options.registry, version: { number: 1 } }
          : null;
      }
      if (key === "folderIndex" && pageId === "account-1") {
        return options.folderIndex
          ? { id: "prop-2", key, value: options.folderIndex, version: { number: 1 } }
          : null;
      }
      return null;
    });
  }

  it("레지스트리가 없으면 빈 배열을 반환한다", async () => {
    stubGetPageProperty({});

    await expect(listDeletedDocuments("user@s-food.com")).resolves.toEqual([]);
  });

  it("삭제 시각 최신순으로 정렬해 반환한다", async () => {
    stubGetPageProperty({
      registry: [
        { pageId: "old", title: "오래된 삭제", deletedAt: "2026-08-01T00:00:00.000Z" },
        { pageId: "new", title: "최근 삭제", deletedAt: "2026-08-20T00:00:00.000Z" },
      ],
    });

    const result = await listDeletedDocuments("user@s-food.com");

    expect(result.map((entry) => entry.pageId)).toEqual(["new", "old"]);
  });

  it("P16-1 필드(tags/isPublished/folderId)가 없는 옛 항목은 기본값(빈 배열/false/null)으로 보정한다", async () => {
    stubGetPageProperty({
      registry: [{ pageId: "old", title: "옛 삭제 항목", deletedAt: "2026-08-01T00:00:00.000Z" }],
    });

    const [result] = await listDeletedDocuments("user@s-food.com");

    expect(result).toMatchObject({ tags: [], isPublished: false, folderId: null, folderName: null });
  });

  it("folderId가 현재 폴더 트리에 있으면 folderName을 이름으로 채운다(P16-1)", async () => {
    stubGetPageProperty({
      registry: [
        {
          pageId: "doc-1",
          title: "삭제된 문서",
          deletedAt: "2026-08-01T00:00:00.000Z",
          tags: ["React"],
          isPublished: true,
          folderId: "f1",
        },
      ],
      folderIndex: [{ id: "f1", name: "업무", parentId: null, order: 0 }],
    });

    const [result] = await listDeletedDocuments("user@s-food.com");

    expect(result).toMatchObject({ folderId: "f1", folderName: "업무" });
  });

  it("folderId가 가리키던 폴더가 그 사이 삭제됐으면 folderName을 null로 돌려준다(미분류와 동일하게 표시)", async () => {
    stubGetPageProperty({
      registry: [
        {
          pageId: "doc-1",
          title: "삭제된 문서",
          deletedAt: "2026-08-01T00:00:00.000Z",
          tags: [],
          isPublished: false,
          folderId: "deleted-folder",
        },
      ],
      folderIndex: [{ id: "f1", name: "업무", parentId: null, order: 0 }],
    });

    const [result] = await listDeletedDocuments("user@s-food.com");

    expect(result.folderName).toBeNull();
  });
});

describe("restoreDocument", () => {
  /** 레지스트리(계정 폴더)와, 복구 대상 문서의 publishMetadata를 각각 키에 맞춰 돌려준다.
   * P0-8 — restoreDocument가 복구 후 publishMetadata도 함께 조회/갱신하므로 키를 구분해야
   * 한다(하나의 mockResolvedValue로 뭉뚱그리면 잘못된 shape을 돌려주게 된다). */
  function stubGetPageProperty(options: {
    registry?: Array<{ pageId: string; title: string; deletedAt: string }>;
    publishMetadata?: { isPublished: boolean; viewers?: Record<string, unknown> };
    /** 복구 대상 문서(doc-1)의 folderId property 원본값(P7-9). */
    folderId?: string;
    /** 계정 폴더의 folderIndex(P7-9 — 폴더가 실제로 존재하는지 검증하는 데 쓴다). */
    folderIndex?: Array<{ id: string; name: string; parentId: string | null; order: number }>;
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
      if (key === "folderId" && pageId === "doc-1") {
        return options.folderId
          ? { id: "prop-3", key, value: options.folderId, version: { number: 1 } }
          : null;
      }
      if (key === "folderIndex" && pageId === "account-1") {
        return options.folderIndex
          ? { id: "prop-4", key, value: options.folderIndex, version: { number: 1 } }
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

  /**
   * `moveSpy`가 정확히 `"account-1"`(findPersonalFolder가 돌려준 계정 폴더 id)로 호출됐는지
   * 확인하는 것이 이 테스트의 핵심이다 — P1-10에서 실제 인스턴스에 발견된 사례(복구된 문서가
   * 계정 폴더가 아니라 Space 홈페이지 최상위로 이동한 것)를 이 assertion이 구조적으로 막는다.
   * P0-8 이전 커밋(`469c3bb^1`)의 구현도 확인했지만 `folder.draftFolderId`가 `space.homepageId`와
   * 같아지는 코드 경로는 찾지 못했다 — 정확한 원래 원인은 특정하지 못한 채 남겨둔다(`task.md` 참고).
   * 지금 구현은 애초에 서브폴더 선택 자체가 없어(계정 폴더 하나뿐) 그 종류의 버그가 들어설 자리가 없다.
   */
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

  it("복구된 문서가 가리키던 폴더가 그대로 있으면 folderId를 건드리지 않는다(P7-9)", async () => {
    stubGetPageProperty({
      registry: [{ pageId: "doc-1", title: "문서 1", deletedAt: "2026-08-01T00:00:00.000Z" }],
      folderId: "f1",
      folderIndex: [{ id: "f1", name: "업무", parentId: null, order: 0 }],
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
    vi.spyOn(client, "upsertPageProperty").mockResolvedValue({
      id: "prop-1",
      key: "deletedDocuments",
      value: [],
      version: { number: 2 },
    });
    const deleteSpy = vi.spyOn(client, "deletePageProperty").mockResolvedValue(undefined);

    await restoreDocument("user@s-food.com", "doc-1");

    expect(deleteSpy).not.toHaveBeenCalled();
  });

  it("복구된 문서가 가리키던 폴더가 그 사이 삭제됐으면 미분류로 되돌린다(P7-9 — 휴지통에 있는 동안의 폴더 삭제는 reassignDocumentsFolder의 재배정 대상에서 빠지기 때문)", async () => {
    stubGetPageProperty({
      registry: [{ pageId: "doc-1", title: "문서 1", deletedAt: "2026-08-01T00:00:00.000Z" }],
      folderId: "deleted-folder",
      folderIndex: [{ id: "f1", name: "업무", parentId: null, order: 0 }],
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
    vi.spyOn(client, "upsertPageProperty").mockResolvedValue({
      id: "prop-1",
      key: "deletedDocuments",
      value: [],
      version: { number: 2 },
    });
    const deleteSpy = vi.spyOn(client, "deletePageProperty").mockResolvedValue(undefined);

    await restoreDocument("user@s-food.com", "doc-1");

    expect(deleteSpy).toHaveBeenCalledWith("doc-1", "folderId");
  });

  it("복구된 문서가 애초에 미분류(folderId 없음)였으면 아무 것도 하지 않는다(P7-9)", async () => {
    stubGetPageProperty({
      registry: [{ pageId: "doc-1", title: "문서 1", deletedAt: "2026-08-01T00:00:00.000Z" }],
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
    vi.spyOn(client, "upsertPageProperty").mockResolvedValue({
      id: "prop-1",
      key: "deletedDocuments",
      value: [],
      version: { number: 2 },
    });
    const deleteSpy = vi.spyOn(client, "deletePageProperty").mockResolvedValue(undefined);

    await restoreDocument("user@s-food.com", "doc-1");

    expect(deleteSpy).not.toHaveBeenCalled();
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
