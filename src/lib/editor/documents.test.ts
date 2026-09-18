import { beforeEach, describe, expect, it, vi } from "vitest";
import * as client from "@/lib/confluence/client";
import * as access from "./access";
import * as folder from "./folder";
import * as folders from "./folders";
import * as tags from "./tags";
import { ConflictError, UnauthorizedError, ValidationError } from "./errors";
import {
  createDocument,
  deleteDocument,
  getDocumentDetail,
  getDocumentVersionHistory,
  getVersionDiff,
  listDocuments,
  listSharedDocuments,
  reassignDocumentsFolder,
  requireDocumentAccess,
  requireDocumentOwner,
  searchDocuments,
  setDocumentFolder,
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

/** sourceDocument/publishMetadata property를 문서별로 돌려주는 getPageProperty 스텁
 * (P0-7 — 표시 제목은 sourceDocument에서, P0-8 — 게시 여부는 publishMetadata에서 읽는다). */
function stubProperties(
  byPageId: Record<
    string,
    { sourceDocument?: { title?: string; doc?: unknown }; publishMetadata?: { isPublished: boolean } }
  >
) {
  return vi.spyOn(client, "getPageProperty").mockImplementation(async (pageId, key) => {
    const entry = byPageId[pageId]?.[key as "sourceDocument" | "publishMetadata"];
    if (!entry) return null;
    return { id: "prop-1", key, value: entry, version: { number: 1 } };
  });
}

describe("listDocuments", () => {
  it("계정 폴더의 문서 목록을 반환한다", async () => {
    vi.spyOn(client, "listChildPages").mockImplementation(async (parentId) => {
      if (parentId === "account-1") {
        return [page("doc-1", "internal-key-1", "account-1")];
      }
      return [];
    });
    vi.spyOn(tags, "getTags").mockResolvedValue([]);
    stubProperties({ "doc-1": { sourceDocument: { title: "초안 문서" } } });

    const documents = await listDocuments("account-1");

    expect(documents).toEqual([
      {
        pageId: "doc-1",
        title: "초안 문서",
        updatedAt: "2026-08-21T00:00:00.000Z",
        isPublished: false,
        tags: [],
        folderId: null,
      },
    ]);
  });

  it("게시 여부는 publishMetadata.isPublished로 판단한다(P0-8 — 더 이상 폴더 위치로 판단하지 않는다)", async () => {
    vi.spyOn(client, "listChildPages").mockImplementation(async (parentId) => {
      if (parentId === "account-1") {
        return [
          page("doc-1", "internal-key-1", "account-1"),
          page("doc-2", "internal-key-2", "account-1"),
        ];
      }
      return [];
    });
    vi.spyOn(tags, "getTags").mockResolvedValue([]);
    stubProperties({
      "doc-1": { sourceDocument: { title: "초안 문서" } },
      "doc-2": {
        sourceDocument: { title: "게시된 문서" },
        publishMetadata: { isPublished: true },
      },
    });

    const documents = await listDocuments("account-1");

    expect(documents).toEqual([
      {
        pageId: "doc-1",
        title: "초안 문서",
        updatedAt: "2026-08-21T00:00:00.000Z",
        isPublished: false,
        tags: [],
        folderId: null,
      },
      {
        pageId: "doc-2",
        title: "게시된 문서",
        updatedAt: "2026-08-21T00:00:00.000Z",
        isPublished: true,
        tags: [],
        folderId: null,
      },
    ]);
  });

  it("각 문서의 태그를 함께 반환한다(중복 조회 없음)", async () => {
    vi.spyOn(client, "listChildPages").mockImplementation(async (parentId) => {
      if (parentId === "account-1") {
        return [page("doc-1", "internal-key-1", "account-1")];
      }
      return [];
    });
    const tagsSpy = vi.spyOn(tags, "getTags").mockResolvedValue(["React"]);
    stubProperties({
      "doc-1": { sourceDocument: { title: "문서1" }, publishMetadata: { isPublished: true } },
    });

    const documents = await listDocuments("account-1");

    expect(documents).toEqual([
      {
        pageId: "doc-1",
        title: "문서1",
        updatedAt: "2026-08-21T00:00:00.000Z",
        isPublished: true,
        tags: ["React"],
        folderId: null,
      },
    ]);
    expect(tagsSpy).toHaveBeenCalledTimes(1);
    expect(tagsSpy).toHaveBeenCalledWith("doc-1");
  });

  it("sourceDocument에 title이 없으면(예: 마이그레이션 이전 데이터) Confluence page title로 대체한다", async () => {
    vi.spyOn(client, "listChildPages").mockImplementation(async (parentId) => {
      if (parentId === "account-1") {
        return [page("doc-1", "레거시 제목", "account-1")];
      }
      return [];
    });
    vi.spyOn(tags, "getTags").mockResolvedValue([]);
    vi.spyOn(client, "getPageProperty").mockResolvedValue(null);

    const documents = await listDocuments("account-1");

    expect(documents[0].title).toBe("레거시 제목");
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
  it("같은 accountFolderId로 다시 호출해도 하위 목록 조회는 한 번만 실행된다", async () => {
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
          if (parentId === "account-1") {
            return [page("doc-1", "문서1", "account-1")];
          }
          return [];
        });
      vi.spyOn(freshTags, "getTags").mockResolvedValue([]);
      vi.spyOn(freshClient, "getPageProperty").mockResolvedValue(null);

      // `/editor` 레이아웃과 `listTagSuggestions`는 각자 독립적으로 같은 문자열 값으로
      // 이 함수를 호출한다(공유 객체 참조가 없다). listDocuments가 폴더 ID를 원시값
      // 인자로 그대로 받기 때문에, 서로 다른 호출부에서 두 번 불려도 `cache()`가 값 기반으로
      // 동일 호출로 인식해 dedup해야 한다 — 그래서 여기서도 매번 새로 문자열 리터럴을
      // 전달해 호출하고, 공유 객체를 만들지 않는다.
      await freshListDocuments("account-1");
      await freshListDocuments("account-1");

      // cache()가 제대로 적용됐다면 두 번째 listDocuments 호출은 완전히 스킵되어
      // listChildPages 총 호출 수는 1(1회분)로 유지된다 — dedup이 없다면 2가 된다.
      expect(listChildPagesSpy).toHaveBeenCalledTimes(1);
    } finally {
      vi.doUnmock("react");
      vi.resetModules();
    }
  });
});

describe("listSharedDocuments", () => {
  function stubFolder() {
    return vi.spyOn(folder, "ensurePersonalFolder").mockResolvedValue({
      accountFolderId: "my-account",
      spaceKey: "SFOODIT",
    });
  }

  function stubAccountIndexLookup() {
    vi.spyOn(client, "getConfiguredSpace").mockResolvedValue({
      id: "space-1",
      key: "SFOODIT",
      homepageId: "home-1",
    });
    vi.spyOn(client, "findChildPageByTitle").mockResolvedValue({
      id: "index-1",
      status: "current",
      title: "계정 관리",
      spaceId: "space-1",
      parentId: "home-1",
      version: { number: 1, createdAt: "" },
    });
  }

  it("공유받은 문서가 없으면 빈 배열을 반환한다(계정 관리 페이지도 조회하지 않는다)", async () => {
    stubFolder();
    vi.spyOn(client, "getPageProperty").mockResolvedValue(null);
    const findChildSpy = vi.spyOn(client, "findChildPageByTitle");

    await expect(listSharedDocuments("me@s-food.com")).resolves.toEqual([]);
    expect(findChildSpy).not.toHaveBeenCalled();
  });

  it("공유받은 문서 목록을 현재 상태·소유자 이름과 함께 반환한다", async () => {
    stubFolder();
    stubAccountIndexLookup();
    vi.spyOn(client, "getPage").mockImplementation(async (pageId) =>
      page(pageId, `internal-${pageId}`, "owner-account")
    );
    vi.spyOn(client, "listChildPages").mockResolvedValue([]);
    vi.spyOn(tags, "getTags").mockResolvedValue(["React"]);
    vi.spyOn(client, "getPageProperty").mockImplementation(async (pageId, key) => {
      if (pageId === "my-account" && key === "sharedDocumentRefs") {
        return {
          id: "prop-refs",
          key,
          value: [
            {
              pageId: "doc-1",
              ownerEmail: "owner@s-food.com",
              documentTitle: "공유 시점 제목(무시됨)",
              sharedAt: "2026-09-01T00:00:00.000Z",
            },
          ],
          version: { number: 1 },
        };
      }
      if (pageId === "doc-1" && key === "sourceDocument") {
        return {
          id: "prop-source",
          key,
          value: { title: "최신 제목", doc: { type: "doc", content: [] } },
          version: { number: 1 },
        };
      }
      if (pageId === "doc-1" && key === "publishMetadata") {
        return {
          id: "prop-publish",
          key,
          value: { isPublished: true },
          version: { number: 1 },
        };
      }
      if (pageId === "index-1" && key === "accountIndex") {
        return {
          id: "prop-index",
          key,
          value: [
            {
              email: "owner@s-food.com",
              name: "홍길동",
              team: "IT팀",
              accessEnabled: true,
              accountFolderId: "owner-account",
            },
          ],
          version: { number: 1 },
        };
      }
      return null;
    });

    const result = await listSharedDocuments("me@s-food.com");

    expect(result).toEqual([
      {
        pageId: "doc-1",
        title: "최신 제목",
        updatedAt: "2026-08-21T00:00:00.000Z",
        isPublished: true,
        tags: ["React"],
        folderId: null,
        ownerEmail: "owner@s-food.com",
        ownerName: "홍길동",
      },
    ]);
  });

  it("참조된 문서가 더 이상 존재하지 않으면(드리프트) 조용히 제외한다", async () => {
    stubFolder();
    stubAccountIndexLookup();
    vi.spyOn(client, "getPage").mockImplementation(async (pageId) => {
      if (pageId === "gone-doc") {
        throw new client.ConfluenceApiError(404, "찾을 수 없음");
      }
      return page(pageId, `internal-${pageId}`, "owner-account");
    });
    vi.spyOn(tags, "getTags").mockResolvedValue([]);
    vi.spyOn(client, "getPageProperty").mockImplementation(async (pageId, key) => {
      if (pageId === "my-account" && key === "sharedDocumentRefs") {
        return {
          id: "prop-refs",
          key,
          value: [
            {
              pageId: "gone-doc",
              ownerEmail: "owner@s-food.com",
              documentTitle: "삭제된 문서",
              sharedAt: "2026-09-01T00:00:00.000Z",
            },
            {
              pageId: "doc-2",
              ownerEmail: "owner@s-food.com",
              documentTitle: "남은 문서",
              sharedAt: "2026-09-01T00:00:00.000Z",
            },
          ],
          version: { number: 1 },
        };
      }
      if (pageId === "doc-2" && key === "sourceDocument") {
        return {
          id: "prop-source",
          key,
          value: { title: "남은 문서", doc: { type: "doc", content: [] } },
          version: { number: 1 },
        };
      }
      return null;
    });

    const result = await listSharedDocuments("me@s-food.com");

    expect(result).toEqual([
      expect.objectContaining({ pageId: "doc-2", title: "남은 문서" }),
    ]);
  });
});

describe("searchDocuments(P1-1a 후속, Ctrl+K 전체 검색)", () => {
  it("빈 쿼리(공백만 포함)는 하위 문서를 조회하지 않고 빈 배열을 반환한다", async () => {
    const listChildPagesSpy = vi.spyOn(client, "listChildPages");

    const result = await searchDocuments("account-1", "   ");

    expect(result).toEqual([]);
    expect(listChildPagesSpy).not.toHaveBeenCalled();
  });

  it("제목에 쿼리가 포함된 문서를 찾는다(대소문자 무시)", async () => {
    vi.spyOn(client, "listChildPages").mockResolvedValue([
      page("doc-1", "internal-1", "account-1"),
      page("doc-2", "internal-2", "account-1"),
    ]);
    vi.spyOn(tags, "getTags").mockResolvedValue([]);
    stubProperties({
      "doc-1": { sourceDocument: { title: "React 19 정리", doc: SAMPLE_DOC } },
      "doc-2": { sourceDocument: { title: "회의록", doc: SAMPLE_DOC } },
    });

    const result = await searchDocuments("account-1", "REACT");

    expect(result.map((doc) => doc.pageId)).toEqual(["doc-1"]);
  });

  it("태그에 쿼리가 포함된 문서를 찾는다", async () => {
    vi.spyOn(client, "listChildPages").mockResolvedValue([
      page("doc-1", "internal-1", "account-1"),
    ]);
    vi.spyOn(tags, "getTags").mockResolvedValue(["Backend"]);
    stubProperties({
      "doc-1": { sourceDocument: { title: "무관한 제목", doc: SAMPLE_DOC } },
    });

    const result = await searchDocuments("account-1", "backend");

    expect(result.map((doc) => doc.pageId)).toEqual(["doc-1"]);
  });

  it("본문(sourceDocument.doc)에 쿼리가 포함된 문서를 찾는다", async () => {
    vi.spyOn(client, "listChildPages").mockResolvedValue([
      page("doc-1", "internal-1", "account-1"),
      page("doc-2", "internal-2", "account-1"),
    ]);
    vi.spyOn(tags, "getTags").mockResolvedValue([]);
    stubProperties({
      "doc-1": {
        sourceDocument: {
          title: "제목1",
          doc: {
            type: "doc",
            content: [{ type: "paragraph", content: [{ type: "text", text: "kubernetes 배포 노트" }] }],
          },
        },
      },
      "doc-2": { sourceDocument: { title: "제목2", doc: SAMPLE_DOC } },
    });

    const result = await searchDocuments("account-1", "kubernetes");

    expect(result.map((doc) => doc.pageId)).toEqual(["doc-1"]);
  });

  it("제목·태그·본문 어디에도 없으면 빈 배열을 반환한다", async () => {
    vi.spyOn(client, "listChildPages").mockResolvedValue([
      page("doc-1", "internal-1", "account-1"),
    ]);
    vi.spyOn(tags, "getTags").mockResolvedValue([]);
    stubProperties({
      "doc-1": { sourceDocument: { title: "제목", doc: SAMPLE_DOC } },
    });

    const result = await searchDocuments("account-1", "존재하지않는단어");

    expect(result).toEqual([]);
  });

  it("본문에 검색어가 있으면 그 앞뒤 문맥을 snippet으로 반환한다(미리보기 패널용)", async () => {
    vi.spyOn(client, "listChildPages").mockResolvedValue([
      page("doc-1", "internal-1", "account-1"),
    ]);
    vi.spyOn(tags, "getTags").mockResolvedValue([]);
    stubProperties({
      "doc-1": {
        sourceDocument: {
          title: "제목",
          doc: {
            type: "doc",
            content: [
              { type: "paragraph", content: [{ type: "text", text: "이것은 kubernetes 배포 노트입니다" }] },
            ],
          },
        },
      },
    });

    const result = await searchDocuments("account-1", "kubernetes");

    expect(result[0].snippet).toContain("kubernetes");
  });

  it("검색어가 제목에만 있고 본문에는 없으면 본문 맨 앞을 snippet으로 반환한다", async () => {
    vi.spyOn(client, "listChildPages").mockResolvedValue([
      page("doc-1", "internal-1", "account-1"),
    ]);
    vi.spyOn(tags, "getTags").mockResolvedValue([]);
    stubProperties({
      "doc-1": { sourceDocument: { title: "React 19 정리", doc: SAMPLE_DOC } },
    });

    const result = await searchDocuments("account-1", "react");

    expect(result[0].snippet).toBe("본문");
  });

  it("본문이 비어 있으면 snippet은 빈 문자열이다", async () => {
    vi.spyOn(client, "listChildPages").mockResolvedValue([
      page("doc-1", "internal-1", "account-1"),
    ]);
    vi.spyOn(tags, "getTags").mockResolvedValue([]);
    stubProperties({
      "doc-1": { sourceDocument: { title: "React 19 정리" } },
    });

    const result = await searchDocuments("account-1", "react");

    expect(result[0].snippet).toBe("");
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

describe("requireDocumentAccess", () => {
  /** authorMeta(소유자)와 sharingMeta(공유 대상 목록)를 함께 대역으로 세운다(P6-6). */
  function stubOwnerAndSharedWith(ownerEmail: string | null, sharedWith: string[]) {
    return vi.spyOn(client, "getPageProperty").mockImplementation(async (_pageId, key) => {
      if (key === "authorMeta") {
        return ownerEmail
          ? { id: "prop-1", key, value: { actualAuthorEmail: ownerEmail }, version: { number: 1 } }
          : null;
      }
      if (key === "sharingMeta") {
        return { id: "prop-2", key, value: { sharedWith }, version: { number: 1 } };
      }
      return null;
    });
  }

  it("작성자 본인이면 통과한다(공유 목록을 확인할 필요조차 없음)", async () => {
    stubOwnerAndSharedWith("owner@s-food.com", []);

    await expect(
      requireDocumentAccess("doc-1", "owner@s-food.com")
    ).resolves.toBeUndefined();
  });

  it("공유받은 계정이면 통과한다", async () => {
    stubOwnerAndSharedWith("owner@s-food.com", ["shared@s-food.com"]);

    await expect(
      requireDocumentAccess("doc-1", "shared@s-food.com")
    ).resolves.toBeUndefined();
  });

  it("공유받지 않은 제3자는 UnauthorizedError를 던진다", async () => {
    stubOwnerAndSharedWith("owner@s-food.com", ["shared@s-food.com"]);

    await expect(
      requireDocumentAccess("doc-1", "outsider@s-food.com")
    ).rejects.toThrow(UnauthorizedError);
  });

  it("authorMeta가 없고 공유 목록에도 없으면 UnauthorizedError를 던진다", async () => {
    stubOwnerAndSharedWith(null, []);

    await expect(
      requireDocumentAccess("doc-1", "user@s-food.com")
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
      accountFolderId: "folder-1",
      title: "제목",
      doc: SAMPLE_DOC,
      actualAuthorEmail: "user@s-food.com",
    });

    // P0-7: Confluence 페이지의 실제 title은 사용자가 입력한 "제목"이 아니라
    // randomUUID()로 만든 내부 고유키다 — Space 전체에서 유일해야 하는 Confluence의
    // title 제약을 서로 다른 계정끼리 흔한 제목으로 충돌시키지 않기 위해서다.
    expect(client.createPage).toHaveBeenCalledWith({
      spaceId: "space-1",
      parentId: "folder-1",
      title: expect.stringMatching(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      ),
      bodyValue: "<p>본문</p>",
    });
    // 사용자가 실제로 입력한 제목은 sourceDocument property에 doc과 함께 저장된다.
    expect(upsertSpy).toHaveBeenCalledWith("doc-1", "sourceDocument", {
      title: "제목",
      doc: SAMPLE_DOC,
    });
    expect(hideSpy).toHaveBeenCalledWith("doc-1");
    expect(result).toEqual({ pageId: "doc-1", version: 1 });
  });

  it("텍스트 없는 빈 문단만 있으면 ValidationError를 던진다", async () => {
    await expect(
      createDocument({
        accountFolderId: "folder-1",
        title: "제목",
        doc: EMPTY_PARAGRAPH_DOC,
        actualAuthorEmail: "user@s-food.com",
      })
    ).rejects.toThrow(ValidationError);
  });

  it("공백 문자만 있으면 ValidationError를 던진다", async () => {
    await expect(
      createDocument({
        accountFolderId: "folder-1",
        title: "제목",
        doc: WHITESPACE_ONLY_DOC,
        actualAuthorEmail: "user@s-food.com",
      })
    ).rejects.toThrow(ValidationError);
  });

  it("제목이 200자를 초과하면 ValidationError를 던진다(P1-6a)", async () => {
    await expect(
      createDocument({
        accountFolderId: "folder-1",
        title: "가".repeat(201),
        doc: SAMPLE_DOC,
        actualAuthorEmail: "user@s-food.com",
      })
    ).rejects.toThrow(ValidationError);
  });

  it("제목이 정확히 200자(경계값)면 정상 통과한다(P1-6a)", async () => {
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
      accountFolderId: "folder-1",
      title: "가".repeat(200),
      doc: SAMPLE_DOC,
      actualAuthorEmail: "user@s-food.com",
    });

    expect(result).toEqual({ pageId: "doc-1", version: 1 });
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
      accountFolderId: "folder-1",
      title: "제목",
      doc: IMAGE_ONLY_DOC,
      actualAuthorEmail: "user@s-food.com",
    });

    expect(result).toEqual({ pageId: "doc-1", version: 1 });
  });

  it("folderId를 지정하면 존재를 검증한 뒤 folderId property를 저장한다(P7-3)", async () => {
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
    vi.spyOn(folders, "listFolders").mockResolvedValue([
      { id: "f1", name: "업무", parentId: null, order: 0 },
    ]);
    const upsertSpy = vi.spyOn(client, "upsertPageProperty").mockResolvedValue({
      id: "prop-1",
      key: "authorMeta",
      value: {},
      version: { number: 1 },
    });
    vi.spyOn(access, "hidePageFromOthers").mockResolvedValue(undefined);

    await createDocument({
      accountFolderId: "folder-1",
      title: "제목",
      doc: SAMPLE_DOC,
      actualAuthorEmail: "user@s-food.com",
      folderId: "f1",
    });

    expect(upsertSpy).toHaveBeenCalledWith("doc-1", "folderId", "f1");
  });

  it("존재하지 않는 folderId면 ValidationError를 던지고 아무것도 만들지 않는다(P7-3)", async () => {
    vi.spyOn(folders, "listFolders").mockResolvedValue([]);
    const createPageSpy = vi.spyOn(client, "createPage");

    await expect(
      createDocument({
        accountFolderId: "folder-1",
        title: "제목",
        doc: SAMPLE_DOC,
        actualAuthorEmail: "user@s-food.com",
        folderId: "없는-id",
      })
    ).rejects.toThrow(ValidationError);
    expect(createPageSpy).not.toHaveBeenCalled();
  });

  it("folderId를 지정하지 않으면 folderId property를 쓰지 않는다(미분류로 시작)", async () => {
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
    vi.spyOn(access, "hidePageFromOthers").mockResolvedValue(undefined);

    await createDocument({
      accountFolderId: "folder-1",
      title: "제목",
      doc: SAMPLE_DOC,
      actualAuthorEmail: "user@s-food.com",
    });

    expect(upsertSpy).not.toHaveBeenCalledWith("doc-1", "folderId", expect.anything());
  });
});

describe("setDocumentFolder", () => {
  it("폴더가 존재하면 folderId property를 갱신한다(P7-3)", async () => {
    vi.spyOn(folders, "listFolders").mockResolvedValue([
      { id: "f1", name: "업무", parentId: null, order: 0 },
    ]);
    const upsertSpy = vi.spyOn(client, "upsertPageProperty").mockResolvedValue({
      id: "prop-1",
      key: "folderId",
      value: "f1",
      version: { number: 1 },
    });

    await setDocumentFolder("doc-1", "account-1", "f1");

    expect(upsertSpy).toHaveBeenCalledWith("doc-1", "folderId", "f1");
  });

  it("null을 지정하면 property를 upsert하는 대신 지워서 미분류로 되돌린다(Confluence가 value:null을 거부함, 2026-09-09 실사용 확인)", async () => {
    const upsertSpy = vi.spyOn(client, "upsertPageProperty");
    const deleteSpy = vi.spyOn(client, "deletePageProperty").mockResolvedValue(undefined);

    await setDocumentFolder("doc-1", "account-1", null);

    expect(deleteSpy).toHaveBeenCalledWith("doc-1", "folderId");
    expect(upsertSpy).not.toHaveBeenCalled();
  });

  it("존재하지 않는 폴더면 ValidationError를 던지고 아무것도 쓰지 않는다", async () => {
    vi.spyOn(folders, "listFolders").mockResolvedValue([]);
    const upsertSpy = vi.spyOn(client, "upsertPageProperty");

    await expect(setDocumentFolder("doc-1", "account-1", "없는-id")).rejects.toThrow(
      ValidationError
    );
    expect(upsertSpy).not.toHaveBeenCalled();
  });
});

describe("reassignDocumentsFolder", () => {
  it("지정한 폴더에 속한 문서만 새 폴더로 재배정한다(P7-3, 폴더 삭제 시 문서 승격)", async () => {
    vi.spyOn(client, "listChildPages").mockResolvedValue([
      page("doc-1", "internal-1", "account-1"),
      page("doc-2", "internal-2", "account-1"),
      page("doc-3", "internal-3", "account-1"),
    ]);
    vi.spyOn(client, "getPageProperty").mockImplementation(async (pageId) => {
      const folderIdByPage: Record<string, string | null> = {
        "doc-1": "target-folder",
        "doc-2": "other-folder",
        "doc-3": "target-folder",
      };
      return {
        id: "prop-1",
        key: "folderId",
        value: folderIdByPage[pageId] ?? null,
        version: { number: 1 },
      };
    });
    const upsertSpy = vi.spyOn(client, "upsertPageProperty").mockResolvedValue({
      id: "prop-1",
      key: "folderId",
      value: null,
      version: { number: 1 },
    });

    await reassignDocumentsFolder("account-1", "target-folder", "parent-folder");

    expect(upsertSpy).toHaveBeenCalledTimes(2);
    expect(upsertSpy).toHaveBeenCalledWith("doc-1", "folderId", "parent-folder");
    expect(upsertSpy).toHaveBeenCalledWith("doc-3", "folderId", "parent-folder");
    expect(upsertSpy).not.toHaveBeenCalledWith("doc-2", "folderId", expect.anything());
  });

  it("해당 폴더에 속한 문서가 없으면 아무것도 쓰지 않는다", async () => {
    vi.spyOn(client, "listChildPages").mockResolvedValue([page("doc-1", "internal-1", "account-1")]);
    vi.spyOn(client, "getPageProperty").mockResolvedValue(null);
    const upsertSpy = vi.spyOn(client, "upsertPageProperty");
    const deleteSpy = vi.spyOn(client, "deletePageProperty");

    await reassignDocumentsFolder("account-1", "target-folder", null);

    expect(upsertSpy).not.toHaveBeenCalled();
    expect(deleteSpy).not.toHaveBeenCalled();
  });

  it("최상위 폴더 삭제로 toFolderId가 null이면 property를 upsert하는 대신 지운다(Confluence가 value:null을 거부함, 2026-09-09 실사용 확인)", async () => {
    vi.spyOn(client, "listChildPages").mockResolvedValue([
      page("doc-1", "internal-1", "account-1"),
      page("doc-2", "internal-2", "account-1"),
    ]);
    vi.spyOn(client, "getPageProperty").mockImplementation(async (pageId) => ({
      id: "prop-1",
      key: "folderId",
      value: pageId === "doc-1" ? "target-folder" : "other-folder",
      version: { number: 1 },
    }));
    const upsertSpy = vi.spyOn(client, "upsertPageProperty");
    const deleteSpy = vi.spyOn(client, "deletePageProperty").mockResolvedValue(undefined);

    await reassignDocumentsFolder("account-1", "target-folder", null);

    expect(deleteSpy).toHaveBeenCalledWith("doc-1", "folderId");
    expect(deleteSpy).not.toHaveBeenCalledWith("doc-2", "folderId");
    expect(upsertSpy).not.toHaveBeenCalled();
  });
});

describe("getDocumentDetail", () => {
  it("sourceDocument property에서 편집 원본과 표시 제목을 읽어온다(P0-7 — Confluence page title은 내부 고유키일 뿐이라 쓰지 않는다)", async () => {
    vi.spyOn(client, "getPage").mockResolvedValue({
      id: "doc-1",
      status: "current",
      title: "internal-key-1",
      spaceId: "space-1",
      parentId: "folder-1",
      version: { number: 2, createdAt: "" },
    });
    // sharingMeta/authorMeta도 함께 읽으므로(P6-2/P6-3), 이 테스트의 관심사(sourceDocument)와
    // 무관한 두 키는 key별로 구분해 없는 값(null → 기본값)으로 응답한다.
    vi.spyOn(client, "getPageProperty").mockImplementation(async (_pageId, key) => {
      if (key === "sourceDocument") {
        return { id: "prop-1", key, value: { title: "제목", doc: SAMPLE_DOC }, version: { number: 1 } };
      }
      return null;
    });

    const detail = await getDocumentDetail("doc-1");

    expect(detail).toEqual({
      pageId: "doc-1",
      title: "제목",
      doc: SAMPLE_DOC,
      version: 2,
      updatedAt: "",
      lastEditedBy: undefined,
      ownerEmail: "",
      sharedWith: [],
      folderId: null,
    });
  });

  it("folderId property가 있으면 그 값을 그대로 반환한다(P7-7 브레드크럼이 이 값으로 폴더 경로를 조회한다)", async () => {
    vi.spyOn(client, "getPage").mockResolvedValue({
      id: "doc-1",
      status: "current",
      title: "internal-key-1",
      spaceId: "space-1",
      parentId: "folder-1",
      version: { number: 2, createdAt: "" },
    });
    vi.spyOn(client, "getPageProperty").mockImplementation(async (_pageId, key) => {
      if (key === "sourceDocument") {
        return { id: "prop-1", key, value: { title: "제목", doc: SAMPLE_DOC }, version: { number: 1 } };
      }
      if (key === "folderId") {
        return { id: "prop-5", key, value: "f1", version: { number: 1 } };
      }
      return null;
    });

    const detail = await getDocumentDetail("doc-1");

    expect(detail.folderId).toBe("f1");
  });

  it("공유된 대상이 있으면 accountIndex에서 이름을 채워 sharedWith로 반환한다(P6-2/P6-3)", async () => {
    vi.spyOn(client, "getPage").mockResolvedValue({
      id: "doc-1",
      status: "current",
      title: "internal-key-1",
      spaceId: "space-1",
      parentId: "folder-1",
      version: { number: 2, createdAt: "" },
    });
    vi.spyOn(client, "getPageProperty").mockImplementation(async (pageId, key) => {
      if (key === "sourceDocument") {
        return { id: "prop-1", key, value: { title: "제목", doc: SAMPLE_DOC }, version: { number: 1 } };
      }
      if (key === "authorMeta") {
        return { id: "prop-2", key, value: { actualAuthorEmail: "owner@s-food.com" }, version: { number: 1 } };
      }
      if (key === "sharingMeta") {
        return { id: "prop-3", key, value: { sharedWith: ["a@s-food.com", "unknown@s-food.com"] }, version: { number: 1 } };
      }
      if (key === "accountIndex") {
        return {
          id: "prop-4",
          key,
          value: [{ email: "a@s-food.com", name: "김철수", team: "디자인팀", accessEnabled: true, accountFolderId: "account-a" }],
          version: { number: 1 },
        };
      }
      return null;
    });
    vi.spyOn(client, "getConfiguredSpace").mockResolvedValue({
      id: "space-1",
      key: "SFOODIT",
      homepageId: "home-1",
    });
    vi.spyOn(client, "findChildPageByTitle").mockResolvedValue({
      id: "index-1",
      status: "current",
      title: "계정 관리",
      spaceId: "space-1",
      parentId: "home-1",
      version: { number: 1, createdAt: "" },
    });

    const detail = await getDocumentDetail("doc-1");

    expect(detail.ownerEmail).toBe("owner@s-food.com");
    expect(detail.sharedWith).toEqual([
      { email: "a@s-food.com", name: "김철수" },
      { email: "unknown@s-food.com", name: "" },
    ]);
  });
});

describe("getDocumentVersionHistory", () => {
  it("버전 코멘트(message)가 있으면 작성자로, 없으면(빈 문자열) null로 매핑한다(P19-4)", async () => {
    vi.spyOn(client, "listPageVersions").mockResolvedValue([
      {
        number: 2,
        createdAt: "2026-09-18T00:00:00.000Z",
        message: "김철수(editor@s-food.com)",
      },
      { number: 1, createdAt: "2026-09-14T00:00:00.000Z", message: "" },
    ]);

    const versions = await getDocumentVersionHistory("doc-1");

    expect(versions).toEqual([
      {
        number: 2,
        createdAt: "2026-09-18T00:00:00.000Z",
        isCurrent: true,
        author: "김철수(editor@s-food.com)",
      },
      {
        number: 1,
        createdAt: "2026-09-14T00:00:00.000Z",
        isCurrent: false,
        author: null,
      },
    ]);
  });
});

describe("getVersionDiff", () => {
  it("버전 1은 이전 버전이 없어 null을 반환한다(P19-5)", async () => {
    const diff = await getVersionDiff("doc-1", 1);
    expect(diff).toBeNull();
  });

  it("현재 버전과 그 이전 버전의 순수 텍스트 diff를 반환한다", async () => {
    vi.spyOn(client, "getPage").mockResolvedValue({
      id: "doc-1",
      status: "current",
      title: "제목",
      spaceId: "space-1",
      parentId: "folder-1",
      version: { number: 2, createdAt: "" },
      body: { storage: { value: "<p>안녕 세상</p>", representation: "storage" } },
    });
    const historicalSpy = vi
      .spyOn(client, "getHistoricalPageBody")
      .mockResolvedValue("<p>안녕</p>");

    const diff = await getVersionDiff("doc-1", 2);

    // 버전 2가 현재 버전이므로 그 본문은 getPage 결과를 그대로 쓰고, 이전 버전(1)만
    // getHistoricalPageBody로 조회한다.
    expect(historicalSpy).toHaveBeenCalledWith("doc-1", 1);
    expect(historicalSpy).toHaveBeenCalledTimes(1);
    expect(diff).toEqual([
      { value: "안녕", added: false, removed: false },
      { value: " 세상", added: true, removed: false },
    ]);
  });

  it("존재하지 않는 버전(현재 버전보다 큼)이면 NotFoundError를 던진다", async () => {
    vi.spyOn(client, "getPage").mockResolvedValue({
      id: "doc-1",
      status: "current",
      title: "제목",
      spaceId: "space-1",
      parentId: "folder-1",
      version: { number: 2, createdAt: "" },
      body: { storage: { value: "<p>내용</p>", representation: "storage" } },
    });

    await expect(getVersionDiff("doc-1", 5)).rejects.toThrow("존재하지 않는 버전입니다.");
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
      editor: { email: "editor@s-food.com", name: "김철수" },
    });

    // P0-3: sourceDocument 저장 시점에도, 저장을 시작할 때 읽어 둔 속성 버전(5)을
    // 그대로 전달해 그 사이 다른 요청이 먼저 쓰지 않았는지 확인한다.
    // P0-7: 사용자가 입력한 새 제목은 sourceDocument에만 반영한다.
    expect(upsertSpy).toHaveBeenCalledWith(
      "doc-1",
      "sourceDocument",
      { title: "새 제목", doc: SAMPLE_DOC },
      { expectedVersion: 5 }
    );
    // P0-7: Confluence 페이지의 실제 title(내부 고유키)은 생성 이후 절대 바뀌지 않는다 —
    // 기존 title("제목")을 그대로 다시 보내지, 사용자가 입력한 "새 제목"을 보내지 않는다.
    // P19-4: version.authorId는 서비스 계정 고정값이라 쓸 수 없어, 저장자 표시를 버전
    // 코멘트(message)에 실어 보낸다.
    expect(client.updatePage).toHaveBeenCalledWith(
      expect.objectContaining({ title: "제목", message: "김철수(editor@s-food.com)" })
    );
    // P6-7: 저장 성공 시 sharingMeta.lastEditedBy를 저장자로 갱신하고, 그 값을 응답에도 포함한다.
    expect(result).toEqual({
      pageId: "doc-1",
      version: 2,
      lastEditedBy: {
        email: "editor@s-food.com",
        name: "김철수",
        editedAt: expect.any(String),
      },
    });
  });

  it("요청한 버전이 최신이 아니면 ConflictError를 던지고 마지막 수정자 정보를 메시지·details에 포함한다(P6-7)", async () => {
    vi.spyOn(client, "getPage").mockResolvedValue({
      id: "doc-1",
      status: "current",
      title: "제목",
      spaceId: "space-1",
      parentId: "folder-1",
      version: { number: 3, createdAt: "" },
    });
    vi.spyOn(client, "getPageProperty").mockResolvedValue({
      id: "prop-1",
      key: "sharingMeta",
      value: {
        sharedWith: [],
        lastEditedBy: {
          email: "other@s-food.com",
          name: "김철수",
          editedAt: "2026-09-04T00:00:00.000Z",
        },
      },
      version: { number: 1 },
    });

    await expect(
      updateDocument({
        pageId: "doc-1",
        title: "새 제목",
        doc: SAMPLE_DOC,
        expectedVersion: 1,
        editor: { email: "editor@s-food.com", name: "이영희" },
      })
    ).rejects.toMatchObject({
      message: expect.stringContaining("김철수(other@s-food.com)"),
      details: {
        lastEditedBy: {
          email: "other@s-food.com",
          name: "김철수",
          editedAt: "2026-09-04T00:00:00.000Z",
        },
      },
    });
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
        editor: { email: "editor@s-food.com", name: "김철수" },
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
        editor: { email: "editor@s-food.com", name: "김철수" },
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
        editor: { email: "editor@s-food.com", name: "김철수" },
      })
    ).rejects.toThrow(ValidationError);
  });

  it("제목이 200자를 초과하면 ValidationError를 던진다(P1-6a)", async () => {
    await expect(
      updateDocument({
        pageId: "doc-1",
        title: "가".repeat(201),
        doc: SAMPLE_DOC,
        expectedVersion: 1,
        editor: { email: "editor@s-food.com", name: "김철수" },
      })
    ).rejects.toThrow(ValidationError);
  });

  it("제목이 정확히 200자(경계값)면 정상 통과한다(P1-6a)", async () => {
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
      title: "제목",
      spaceId: "space-1",
      parentId: "folder-1",
      version: { number: 2, createdAt: "" },
    });
    vi.spyOn(client, "upsertPageProperty").mockResolvedValue({
      id: "prop-1",
      key: "sourceDocument",
      value: {},
      version: { number: 6 },
    });

    const result = await updateDocument({
      pageId: "doc-1",
      title: "가".repeat(200),
      doc: SAMPLE_DOC,
      expectedVersion: 1,
      editor: { email: "editor@s-food.com", name: "김철수" },
    });

    expect(result).toEqual({
      pageId: "doc-1",
      version: 2,
      lastEditedBy: {
        email: "editor@s-food.com",
        name: "김철수",
        editedAt: expect.any(String),
      },
    });
  });
});

describe("deleteDocument", () => {
  function stubPage() {
    vi.spyOn(client, "getPage").mockResolvedValue(
      page("doc-1", "internal-key-1", "draft-folder-1")
    );
  }

  function stubPersonalFolder() {
    return vi.spyOn(folder, "findPersonalFolder").mockResolvedValue({
      accountFolderId: "account-1",
      spaceKey: "SPACE",
    });
  }

  it("작성자 계정 폴더의 deletedDocuments 속성에 삭제 항목(태그·게시 상태·폴더 스냅샷 포함, P16-1)을 추가하고 페이지를 삭제한다(P1-2b)", async () => {
    stubPage();
    stubPersonalFolder();
    vi.spyOn(tags, "getTags").mockResolvedValue(["React"]);
    vi.spyOn(client, "getPageProperty").mockImplementation(async (pageId, key) => {
      if (key === "authorMeta") {
        return {
          id: "prop-author",
          key,
          value: { actualAuthorEmail: "user@s-food.com" },
          version: { number: 1 },
        };
      }
      // P0-7: 실제 삭제 목록에 보여줄 표시 제목은 sourceDocument에서 읽는다(page.title은
      // 내부 고유키일 뿐이다).
      if (key === "sourceDocument" && pageId === "doc-1") {
        return {
          id: "prop-source",
          key,
          value: { title: "삭제될 문서", doc: {} },
          version: { number: 1 },
        };
      }
      if (key === "publishMetadata" && pageId === "doc-1") {
        return {
          id: "prop-publish",
          key,
          value: { isPublished: true },
          version: { number: 1 },
        };
      }
      if (key === "folderId" && pageId === "doc-1") {
        return { id: "prop-folder", key, value: "f1", version: { number: 1 } };
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
        expect.objectContaining({
          pageId: "doc-1",
          title: "삭제될 문서",
          tags: ["React"],
          isPublished: true,
          folderId: "f1",
        }),
      ]
    );
    expect(deletePageSpy).toHaveBeenCalledWith("doc-1");
  });

  it("태그·게시 상태·폴더가 없는(기본값) 문서를 삭제하면 그 기본값(빈 배열/false/null)으로 기록한다(P16-1)", async () => {
    stubPage();
    stubPersonalFolder();
    vi.spyOn(tags, "getTags").mockResolvedValue([]);
    vi.spyOn(client, "getPageProperty").mockImplementation(async (_pageId, key) => {
      if (key === "authorMeta") {
        return {
          id: "prop-author",
          key,
          value: { actualAuthorEmail: "user@s-food.com" },
          version: { number: 1 },
        };
      }
      return null;
    });
    const upsertSpy = vi.spyOn(client, "upsertPageProperty").mockResolvedValue({
      id: "prop-deleted",
      key: "deletedDocuments",
      value: [],
      version: { number: 1 },
    });
    vi.spyOn(client, "deletePage").mockResolvedValue(undefined);

    await deleteDocument("doc-1");

    expect(upsertSpy).toHaveBeenCalledWith(
      "account-1",
      "deletedDocuments",
      [expect.objectContaining({ tags: [], isPublished: false, folderId: null })]
    );
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
