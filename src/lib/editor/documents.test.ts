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
  searchDocuments,
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
    vi.spyOn(client, "getPageProperty").mockResolvedValue({
      id: "prop-1",
      key: "sourceDocument",
      value: { title: "제목", doc: SAMPLE_DOC },
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
    // P0-7: 사용자가 입력한 새 제목은 sourceDocument에만 반영한다.
    expect(upsertSpy).toHaveBeenCalledWith(
      "doc-1",
      "sourceDocument",
      { title: "새 제목", doc: SAMPLE_DOC },
      { expectedVersion: 5 }
    );
    // P0-7: Confluence 페이지의 실제 title(내부 고유키)은 생성 이후 절대 바뀌지 않는다 —
    // 기존 title("제목")을 그대로 다시 보내지, 사용자가 입력한 "새 제목"을 보내지 않는다.
    expect(client.updatePage).toHaveBeenCalledWith(
      expect.objectContaining({ title: "제목" })
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

  it("제목이 200자를 초과하면 ValidationError를 던진다(P1-6a)", async () => {
    await expect(
      updateDocument({
        pageId: "doc-1",
        title: "가".repeat(201),
        doc: SAMPLE_DOC,
        expectedVersion: 1,
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
    });

    expect(result).toEqual({ pageId: "doc-1", version: 2 });
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
