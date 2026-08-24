import { beforeEach, describe, expect, it, vi } from "vitest";
import * as client from "@/lib/confluence/client";
import * as access from "./access";
import * as roots from "./roots";
import { UnauthorizedError, ValidationError } from "./errors";
import {
  createDocument,
  getDocumentDetail,
  listDocuments,
  requireDocumentOwner,
  updateDocument,
} from "./documents";

const SAMPLE_DOC = {
  type: "doc",
  content: [
    { type: "paragraph", content: [{ type: "text", text: "본문" }] },
  ],
};

const EMPTY_PARAGRAPH_DOC = {
  type: "doc",
  content: [{ type: "paragraph" }],
};

const WHITESPACE_ONLY_DOC = {
  type: "doc",
  content: [
    { type: "paragraph", content: [{ type: "text", text: "   " }] },
  ],
};

const IMAGE_ONLY_DOC = {
  type: "doc",
  content: [
    {
      type: "paragraph",
      content: [{ type: "image", attrs: { filename: "photo.png" } }],
    },
  ],
};

beforeEach(() => {
  vi.restoreAllMocks();
});

function page(id: string, title: string, parentId: string): client.ConfluencePage {
  return {
    id,
    status: "current",
    title,
    spaceId: "space-1",
    parentId,
    version: { number: 1, createdAt: "2026-08-21T00:00:00.000Z" },
  };
}

describe("listDocuments", () => {
  it("개인 폴더에 초안만 있으면 초안 목록을 그대로 반환한다", async () => {
    vi.spyOn(roots, "getContentRoots").mockResolvedValue({
      draftsRootId: "drafts-1",
      publishedRootId: "published-1",
    });
    vi.spyOn(client, "listChildPages").mockImplementation(async (parentId) => {
      if (parentId === "folder-1") {
        return [page("doc-1", "초안 문서", "folder-1")];
      }
      return [];
    });

    const documents = await listDocuments("folder-1", "user@s-food.com");

    expect(documents).toEqual([
      { pageId: "doc-1", title: "초안 문서", updatedAt: "2026-08-21T00:00:00.000Z" },
    ]);
  });

  it("게시됨 루트로 이동한 본인 문서도 목록에 함께 반환한다", async () => {
    vi.spyOn(roots, "getContentRoots").mockResolvedValue({
      draftsRootId: "drafts-1",
      publishedRootId: "published-1",
    });
    vi.spyOn(client, "listChildPages").mockImplementation(async (parentId) => {
      if (parentId === "folder-1") {
        return [page("doc-1", "초안 문서", "folder-1")];
      }
      if (parentId === "published-1") {
        return [
          page("doc-2", "게시된 내 문서", "published-1"),
          page("doc-3", "남의 게시 문서", "published-1"),
        ];
      }
      return [];
    });
    vi.spyOn(client, "getPageProperty").mockImplementation(async (pageId, key) => {
      if (key !== "authorMeta") {
        return null;
      }
      const email = pageId === "doc-2" ? "user@s-food.com" : "other@s-food.com";
      return {
        id: `prop-${pageId}`,
        key,
        value: { actualAuthorEmail: email },
        version: { number: 1 },
      };
    });

    const documents = await listDocuments("folder-1", "user@s-food.com");

    expect(documents.map((doc) => doc.pageId)).toEqual(["doc-1", "doc-2"]);
  });
});

describe("requireDocumentOwner", () => {
  function stubAuthorMeta(value: unknown) {
    vi.spyOn(client, "getPageProperty").mockImplementation(async (_pageId, key) => {
      if (key !== "authorMeta" || value === null) {
        return null;
      }
      return { id: "prop-1", key, value, version: { number: 1 } };
    });
  }

  it("작성자 본인이면 통과한다", async () => {
    stubAuthorMeta({ actualAuthorEmail: "user@s-food.com" });

    await expect(
      requireDocumentOwner("doc-1", "user@s-food.com")
    ).resolves.toBeUndefined();
  });

  it("다른 사용자면 UnauthorizedError를 던진다", async () => {
    stubAuthorMeta({ actualAuthorEmail: "owner@s-food.com" });

    await expect(
      requireDocumentOwner("doc-1", "attacker@s-food.com")
    ).rejects.toThrow(UnauthorizedError);
  });

  it("authorMeta가 없으면 UnauthorizedError를 던진다", async () => {
    stubAuthorMeta(null);

    await expect(
      requireDocumentOwner("doc-1", "user@s-food.com")
    ).rejects.toThrow(UnauthorizedError);
  });
});

describe("createDocument", () => {
  it("문서를 만든 뒤 서비스 계정 전용으로 숨긴다", async () => {
    vi.spyOn(client, "getConfiguredSpace").mockResolvedValue({
      id: "space-1",
      key: "SFOODIT",
      homepageId: "home-1",
    });
    vi.spyOn(client, "createPage").mockResolvedValue({
      id: "doc-1",
      status: "current",
      title: "제목",
      spaceId: "space-1",
      parentId: "folder-1",
      version: { number: 1, createdAt: "" },
    });
    const upsertSpy = vi.spyOn(client, "upsertPageProperty").mockResolvedValue({
      id: "prop-1",
      key: "authorMeta",
      value: {},
      version: { number: 1 },
    });
    const hideSpy = vi.spyOn(access, "hidePageFromOthers").mockResolvedValue(undefined);

    const result = await createDocument({
      folderId: "folder-1",
      title: "제목",
      doc: SAMPLE_DOC,
      actualAuthorEmail: "user@s-food.com",
    });

    expect(client.createPage).toHaveBeenCalledWith({
      spaceId: "space-1",
      parentId: "folder-1",
      title: "제목",
      bodyValue: "<p>본문</p>",
    });
    expect(upsertSpy).toHaveBeenCalledWith("doc-1", "sourceDocument", {
      doc: SAMPLE_DOC,
    });
    expect(hideSpy).toHaveBeenCalledWith("doc-1");
    expect(result).toEqual({ pageId: "doc-1", version: 1 });
  });

  it("텍스트 없는 빈 문단만 있으면 ValidationError를 던진다", async () => {
    await expect(
      createDocument({
        folderId: "folder-1",
        title: "제목",
        doc: EMPTY_PARAGRAPH_DOC,
        actualAuthorEmail: "user@s-food.com",
      })
    ).rejects.toThrow(ValidationError);
  });

  it("공백 문자만 있으면 ValidationError를 던진다", async () => {
    await expect(
      createDocument({
        folderId: "folder-1",
        title: "제목",
        doc: WHITESPACE_ONLY_DOC,
        actualAuthorEmail: "user@s-food.com",
      })
    ).rejects.toThrow(ValidationError);
  });

  it("텍스트 없이 이미지만 있어도 유효한 본문으로 통과한다", async () => {
    vi.spyOn(client, "getConfiguredSpace").mockResolvedValue({
      id: "space-1",
      key: "SFOODIT",
      homepageId: "home-1",
    });
    vi.spyOn(client, "createPage").mockResolvedValue({
      id: "doc-1",
      status: "current",
      title: "제목",
      spaceId: "space-1",
      parentId: "folder-1",
      version: { number: 1, createdAt: "" },
    });
    vi.spyOn(client, "upsertPageProperty").mockResolvedValue({
      id: "prop-1",
      key: "authorMeta",
      value: {},
      version: { number: 1 },
    });
    vi.spyOn(access, "hidePageFromOthers").mockResolvedValue(undefined);

    const result = await createDocument({
      folderId: "folder-1",
      title: "제목",
      doc: IMAGE_ONLY_DOC,
      actualAuthorEmail: "user@s-food.com",
    });

    expect(result).toEqual({ pageId: "doc-1", version: 1 });
  });
});

describe("getDocumentDetail", () => {
  it("sourceDocument property에서 편집 원본을 읽어온다", async () => {
    vi.spyOn(client, "getPage").mockResolvedValue({
      id: "doc-1",
      status: "current",
      title: "제목",
      spaceId: "space-1",
      parentId: "folder-1",
      version: { number: 2, createdAt: "" },
    });
    vi.spyOn(client, "getPageProperty").mockResolvedValue({
      id: "prop-1",
      key: "sourceDocument",
      value: { doc: SAMPLE_DOC },
      version: { number: 1 },
    });

    const detail = await getDocumentDetail("doc-1");

    expect(detail).toEqual({
      pageId: "doc-1",
      title: "제목",
      doc: SAMPLE_DOC,
      version: 2,
    });
  });
});

describe("updateDocument", () => {
  it("버전이 일치하면 doc을 갱신한다", async () => {
    vi.spyOn(client, "getPage").mockResolvedValue({
      id: "doc-1",
      status: "current",
      title: "제목",
      spaceId: "space-1",
      parentId: "folder-1",
      version: { number: 1, createdAt: "" },
    });
    vi.spyOn(client, "updatePage").mockResolvedValue({
      id: "doc-1",
      status: "current",
      title: "새 제목",
      spaceId: "space-1",
      parentId: "folder-1",
      version: { number: 2, createdAt: "" },
    });
    const upsertSpy = vi.spyOn(client, "upsertPageProperty").mockResolvedValue({
      id: "prop-1",
      key: "sourceDocument",
      value: {},
      version: { number: 1 },
    });

    const result = await updateDocument({
      pageId: "doc-1",
      title: "새 제목",
      doc: SAMPLE_DOC,
      expectedVersion: 1,
    });

    expect(upsertSpy).toHaveBeenCalledWith("doc-1", "sourceDocument", {
      doc: SAMPLE_DOC,
    });
    expect(result).toEqual({ pageId: "doc-1", version: 2 });
  });

  it("텍스트 없는 빈 문단만 있으면 ValidationError를 던진다(createDocument와 동일한 검증 경로)", async () => {
    await expect(
      updateDocument({
        pageId: "doc-1",
        title: "새 제목",
        doc: EMPTY_PARAGRAPH_DOC,
        expectedVersion: 1,
      })
    ).rejects.toThrow(ValidationError);
  });

  it("공백 문자만 있으면 ValidationError를 던진다", async () => {
    await expect(
      updateDocument({
        pageId: "doc-1",
        title: "새 제목",
        doc: WHITESPACE_ONLY_DOC,
        expectedVersion: 1,
      })
    ).rejects.toThrow(ValidationError);
  });
});
