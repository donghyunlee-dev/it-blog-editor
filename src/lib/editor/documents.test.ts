import { beforeEach, describe, expect, it, vi } from "vitest";
import * as client from "@/lib/confluence/client";
import * as access from "./access";
import * as folder from "./folder";
import * as tags from "./tags";
import { ConflictError, UnauthorizedError, ValidationError } from "./errors";
import {
  createDocument,
  deleteDocument,
  getDocumentDetail,
  getDocumentVersionHistory,
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
  it("초안 폴더에만 문서가 있으면 초안 목록을 그대로 반환한다", async () => {
    vi.spyOn(client, "listChildPages").mockImplementation(async (parentId) => {
      if (parentId === "draft-1") {
        return [page("doc-1", "초안 문서", "draft-1")];
      }
      return [];
    });
    vi.spyOn(tags, "getTags").mockResolvedValue([]);

    const documents = await listDocuments("draft-1", "published-1");

    expect(documents).toEqual([
      {
        pageId: "doc-1",
        title: "초안 문서",
        updatedAt: "2026-08-21T00:00:00.000Z",
        isPublished: false,
        tags: [],
      },
    ]);
  });

  it("게시 폴더에 있는 문서도 초안 문서와 함께 반환하며, 어느 서브폴더에서 나왔는지로 게시 여부를 판단한다", async () => {
    vi.spyOn(client, "listChildPages").mockImplementation(async (parentId) => {
      if (parentId === "draft-1") {
        return [page("doc-1", "초안 문서", "draft-1")];
      }
      if (parentId === "published-1") {
        return [page("doc-2", "게시된 문서", "published-1")];
      }
      return [];
    });
    vi.spyOn(tags, "getTags").mockResolvedValue([]);

    const documents = await listDocuments("draft-1", "published-1");

    expect(documents).toEqual([
      {
        pageId: "doc-1",
        title: "초안 문서",
        updatedAt: "2026-08-21T00:00:00.000Z",
        isPublished: false,
        tags: [],
      },
      {
        pageId: "doc-2",
        title: "게시된 문서",
        updatedAt: "2026-08-21T00:00:00.000Z",
        isPublished: true,
        tags: [],
      },
    ]);
  });

  it("각 문서의 태그를 함께 반환한다(중복 조회 없음)", async () => {
    vi.spyOn(client, "listChildPages").mockImplementation(async (parentId) => {
      if (parentId === "published-1") {
        return [page("doc-1", "문서1", "published-1")];
      }
      return [];
    });
    const tagsSpy = vi.spyOn(tags, "getTags").mockResolvedValue(["React"]);

    const documents = await listDocuments("draft-1", "published-1");

    expect(documents).toEqual([
      {
        pageId: "doc-1",
        title: "문서1",
        updatedAt: "2026-08-21T00:00:00.000Z",
        isPublished: true,
        tags: ["React"],
      },
    ]);
    expect(tagsSpy).toHaveBeenCalledTimes(1);
    expect(tagsSpy).toHaveBeenCalledWith("doc-1");
  });
});

describe("listDocuments 요청 내 중복 조회 방지 (React cache)", () => {
  // 실제 Next.js(App Router) 요청 안에서는 React의 `cache()`가 렌더 트리 내 동일 인자
  // 호출을 dedup한다. Vitest/Node 환경에는 이 dispatcher가 없어 `cache()`가 아무 캐싱도
  // 하지 않고 그대로 통과시킨다는 것을 이미 별도로 확인했으므로(직접 node로 실행해
  // 두 번째 호출도 원본 함수가 다시 실행됨을 확인), 여기서는 `react`의 `cache`를 진짜로
  // 동작하는(같은 인자면 메모이즈하는) 구현으로 교체해 "우리 코드가 `cache()`를 올바르게
  // 감싸 사용하고 있는지"를 검증한다 — dispatcher가 있는 실제 런타임에서 기대하는 동작과
  // 정확히 같은 것을 이 스텁으로 재현한다.
  it("같은 (draftFolderId, publishedFolderId)로 다시 호출해도 하위 목록 조회는 한 번만 실행된다", async () => {
    vi.resetModules();
    vi.doMock("react", async (importOriginal) => {
      const actual = await importOriginal<typeof import("react")>();
      return {
        ...actual,
        cache<Fn extends (...args: never[]) => unknown>(fn: Fn): Fn {
          const store = new Map<string, ReturnType<Fn>>();
          return ((...args: Parameters<Fn>) => {
            const key = JSON.stringify(args);
            if (!store.has(key)) {
              store.set(key, fn(...args) as ReturnType<Fn>);
            }
            return store.get(key);
          }) as Fn;
        },
      };
    });

    try {
      const freshClient = await import("@/lib/confluence/client");
      const freshTags = await import("./tags");
      const { listDocuments: freshListDocuments } = await import("./documents");

      const listChildPagesSpy = vi
        .spyOn(freshClient, "listChildPages")
        .mockImplementation(async (parentId) => {
          if (parentId === "draft-1") {
            return [page("doc-1", "문서1", "draft-1")];
          }
          return [];
        });
      vi.spyOn(freshTags, "getTags").mockResolvedValue([]);

      // `/editor` 레이아웃과 `listTagSuggestions`는 각자 독립적으로 같은 두 문자열 값으로
      // 이 함수를 호출한다(공유 객체 참조가 없다). listDocuments가 두 폴더 ID를 원시값
      // 인자로 그대로 받기 때문에, 서로 다른 호출부에서 두 번 불려도 `cache()`가 값 기반으로
      // 동일 호출로 인식해 dedup해야 한다 — 그래서 여기서도 매번 새로 두 문자열 리터럴을
      // 전달해 호출하고, 공유 객체를 만들지 않는다.
      await freshListDocuments("draft-1", "published-1");
      await freshListDocuments("draft-1", "published-1");

      // listChildPages는 listDocuments 한 번 호출당 2번(초안 폴더 + 게시 폴더) 불린다.
      // cache()가 제대로 적용됐다면 두 번째 listDocuments 호출은 완전히 스킵되어
      // 총 호출 수는 2(1회분)로 유지된다 — dedup이 없다면 4가 된다.
      expect(listChildPagesSpy).toHaveBeenCalledTimes(2);
    } finally {
      vi.doUnmock("react");
      vi.resetModules();
    }
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
      draftFolderId: "folder-1",
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
        draftFolderId: "folder-1",
        title: "제목",
        doc: EMPTY_PARAGRAPH_DOC,
        actualAuthorEmail: "user@s-food.com",
      })
    ).rejects.toThrow(ValidationError);
  });

  it("공백 문자만 있으면 ValidationError를 던진다", async () => {
    await expect(
      createDocument({
        draftFolderId: "folder-1",
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
      draftFolderId: "folder-1",
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
      updatedAt: "",
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
    vi.spyOn(client, "getPageProperty").mockResolvedValue({
      id: "prop-1",
      key: "sourceDocument",
      value: { doc: {} },
      version: { number: 5 },
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
      version: { number: 6 },
    });

    const result = await updateDocument({
      pageId: "doc-1",
      title: "새 제목",
      doc: SAMPLE_DOC,
      expectedVersion: 1,
    });

    // P0-3: sourceDocument 저장 시점에도, 저장을 시작할 때 읽어 둔 속성 버전(5)을
    // 그대로 전달해 그 사이 다른 요청이 먼저 쓰지 않았는지 확인한다.
    expect(upsertSpy).toHaveBeenCalledWith(
      "doc-1",
      "sourceDocument",
      { doc: SAMPLE_DOC },
      { expectedVersion: 5 }
    );
    expect(result).toEqual({ pageId: "doc-1", version: 2 });
  });

  it("본문 저장 중 다른 요청이 sourceDocument를 먼저 갱신했으면(속성 버전 드리프트) ConflictError를 던진다(P0-3)", async () => {
    vi.spyOn(client, "getPage").mockResolvedValue({
      id: "doc-1",
      status: "current",
      title: "제목",
      spaceId: "space-1",
      parentId: "folder-1",
      version: { number: 1, createdAt: "" },
    });
    vi.spyOn(client, "getPageProperty").mockResolvedValue({
      id: "prop-1",
      key: "sourceDocument",
      value: { doc: {} },
      version: { number: 5 },
    });
    vi.spyOn(client, "updatePage").mockResolvedValue({
      id: "doc-1",
      status: "current",
      title: "새 제목",
      spaceId: "space-1",
      parentId: "folder-1",
      version: { number: 2, createdAt: "" },
    });
    // 이 요청이 저장을 시작한 뒤(속성 버전 5를 읽은 뒤), 실제로 쓰기 직전에 다른
    // 요청이 먼저 써서 버전이 이미 움직여 있는 상황을 흉내낸다.
    vi.spyOn(client, "upsertPageProperty").mockRejectedValue(
      new client.PropertyVersionConflictError()
    );

    await expect(
      updateDocument({
        pageId: "doc-1",
        title: "새 제목",
        doc: SAMPLE_DOC,
        expectedVersion: 1,
      })
    ).rejects.toThrow(ConflictError);
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

describe("deleteDocument", () => {
  function stubPage() {
    vi.spyOn(client, "getPage").mockResolvedValue(
      page("doc-1", "삭제될 문서", "draft-folder-1")
    );
  }

  function stubPersonalFolder() {
    return vi.spyOn(folder, "findPersonalFolder").mockResolvedValue({
      accountFolderId: "account-1",
      draftFolderId: "draft-folder-1",
      publishedFolderId: "published-folder-1",
      spaceKey: "SPACE",
    });
  }

  it("작성자 계정 폴더의 deletedDocuments 속성에 삭제 항목을 추가하고 페이지를 삭제한다(P1-2b)", async () => {
    stubPage();
    stubPersonalFolder();
    vi.spyOn(client, "getPageProperty").mockImplementation(async (pageId, key) => {
      if (key === "authorMeta") {
        return {
          id: "prop-author",
          key,
          value: { actualAuthorEmail: "user@s-food.com" },
          version: { number: 1 },
        };
      }
      if (key === "deletedDocuments" && pageId === "account-1") {
        return {
          id: "prop-deleted",
          key,
          value: [{ pageId: "old-doc", title: "예전 삭제 문서", deletedAt: "2026-08-01T00:00:00.000Z" }],
          version: { number: 3 },
        };
      }
      return null;
    });
    const upsertSpy = vi.spyOn(client, "upsertPageProperty").mockResolvedValue({
      id: "prop-deleted",
      key: "deletedDocuments",
      value: [],
      version: { number: 4 },
    });
    const deletePageSpy = vi.spyOn(client, "deletePage").mockResolvedValue(undefined);

    await deleteDocument("doc-1");

    expect(upsertSpy).toHaveBeenCalledWith(
      "account-1",
      "deletedDocuments",
      [
        { pageId: "old-doc", title: "예전 삭제 문서", deletedAt: "2026-08-01T00:00:00.000Z" },
        expect.objectContaining({ pageId: "doc-1", title: "삭제될 문서" }),
      ]
    );
    expect(deletePageSpy).toHaveBeenCalledWith("doc-1");
  });

  it("작성자를 찾을 수 없어도(authorMeta 없음) 삭제 자체는 계속 진행한다", async () => {
    stubPage();
    vi.spyOn(client, "getPageProperty").mockResolvedValue(null);
    const upsertSpy = vi.spyOn(client, "upsertPageProperty");
    const deletePageSpy = vi.spyOn(client, "deletePage").mockResolvedValue(undefined);

    await deleteDocument("doc-1");

    expect(upsertSpy).not.toHaveBeenCalled();
    expect(deletePageSpy).toHaveBeenCalledWith("doc-1");
  });

  it("레지스트리 기록이 실패해도(예: Confluence 오류) 삭제 자체는 계속 진행한다", async () => {
    stubPage();
    stubPersonalFolder();
    vi.spyOn(client, "getPageProperty").mockImplementation(async (_pageId, key) => {
      if (key === "authorMeta") {
        return {
          id: "prop-author",
          key,
          value: { actualAuthorEmail: "user@s-food.com" },
          version: { number: 1 },
        };
      }
      throw new client.ConfluenceApiError(502, "일시적 오류");
    });
    const deletePageSpy = vi.spyOn(client, "deletePage").mockResolvedValue(undefined);
    vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(deleteDocument("doc-1")).resolves.toBeUndefined();
    expect(deletePageSpy).toHaveBeenCalledWith("doc-1");
  });
});
