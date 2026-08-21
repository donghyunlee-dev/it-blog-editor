import { beforeEach, describe, expect, it, vi } from "vitest";
import { addLabels, clearPageRestrictions, findPublishedPageBySlug, getCurrentConfluenceUser, listChildPages, listLabels, movePage, removeLabel, restrictPageToAccount } from "./client";

const BASE_URL = "https://test.atlassian.net/wiki";

beforeEach(() => {
  process.env.CONFLUENCE_BASE_URL = BASE_URL;
  process.env.CONFLUENCE_EMAIL = "service@example.com";
  process.env.CONFLUENCE_API_TOKEN = "test-token";
  vi.restoreAllMocks();
});

describe("getCurrentConfluenceUser", () => {
  it("서비스 계정의 accountId를 반환한다", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async (_url: string, _init?: RequestInit) =>
          new Response(JSON.stringify({ accountId: "acc-1" }), { status: 200 })
      )
    );

    const user = await getCurrentConfluenceUser();

    expect(user.accountId).toBe("acc-1");
  });
});

describe("movePage", () => {
  it("현재 페이지를 조회한 뒤 parentId를 바꿔 PUT 요청을 보낸다", async () => {
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      if (!init || init.method === undefined) {
        return new Response(
          JSON.stringify({
            id: "111",
            status: "current",
            title: "문서 A",
            spaceId: "1",
            parentId: "222",
            version: { number: 3, createdAt: "2026-08-21T00:00:00.000Z" },
            body: { storage: { value: "<p>내용</p>", representation: "storage" } },
          }),
          { status: 200 }
        );
      }
      return new Response(
        JSON.stringify({
          id: "111",
          status: "current",
          title: "문서 A",
          spaceId: "1",
          parentId: "999",
          version: { number: 4, createdAt: "2026-08-21T00:00:00.000Z" },
        }),
        { status: 200 }
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await movePage("111", "999");

    expect(result.parentId).toBe("999");
    const putCall = fetchMock.mock.calls.find(([, init]) => init?.method === "PUT");
    expect(putCall).toBeDefined();
    const body = JSON.parse((putCall![1] as RequestInit).body as string);
    expect(body.parentId).toBe("999");
    expect(body.version.number).toBe(4);
  });
});

describe("restrictPageToAccount", () => {
  it("read/update 제한을 지정한 accountId로 PUT 요청을 보낸다", async () => {
    const fetchMock = vi.fn(
      async (_url: string, _init?: RequestInit) => new Response(null, { status: 204 })
    );
    vi.stubGlobal("fetch", fetchMock);

    await restrictPageToAccount("111", "acc-service");

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${BASE_URL}/rest/api/content/111/restriction`);
    expect(init?.method).toBe("PUT");
    const body = JSON.parse(init!.body as string);
    expect(body).toEqual([
      { operation: "read", restrictions: { user: [{ type: "known", accountId: "acc-service" }] } },
      { operation: "update", restrictions: { user: [{ type: "known", accountId: "acc-service" }] } },
    ]);
  });
});

describe("clearPageRestrictions", () => {
  it("read/update 제한을 빈 목록으로 PUT 요청을 보낸다", async () => {
    const fetchMock = vi.fn(
      async (_url: string, _init?: RequestInit) => new Response(null, { status: 204 })
    );
    vi.stubGlobal("fetch", fetchMock);

    await clearPageRestrictions("111");

    const [, init] = fetchMock.mock.calls[0];
    const body = JSON.parse(init!.body as string);
    expect(body).toEqual([
      { operation: "read", restrictions: { user: [] } },
      { operation: "update", restrictions: { user: [] } },
    ]);
  });
});

describe("listLabels", () => {
  it("페이지에 붙은 라벨 목록을 반환한다", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async (_url: string, _init?: RequestInit) =>
          new Response(
            JSON.stringify({ results: [{ id: "1", name: "React" }] }),
            { status: 200 }
          )
      )
    );

    const labels = await listLabels("111");

    expect(labels).toEqual([{ id: "1", name: "React" }]);
  });
});

describe("addLabels", () => {
  it("global prefix로 라벨을 추가하는 POST 요청을 보낸다", async () => {
    const fetchMock = vi.fn(
      async (_url: string, _init?: RequestInit) =>
        new Response(JSON.stringify({ results: [] }), { status: 200 })
    );
    vi.stubGlobal("fetch", fetchMock);

    await addLabels("111", ["React", "Backend"]);

    const [, init] = fetchMock.mock.calls[0];
    expect(init?.method).toBe("POST");
    expect(JSON.parse(init!.body as string)).toEqual([
      { prefix: "global", name: "React" },
      { prefix: "global", name: "Backend" },
    ]);
  });
});

describe("removeLabel", () => {
  it("이름으로 라벨을 삭제하는 DELETE 요청을 보낸다", async () => {
    const fetchMock = vi.fn(
      async (_url: string, _init?: RequestInit) => new Response(null, { status: 204 })
    );
    vi.stubGlobal("fetch", fetchMock);

    await removeLabel("111", "React");

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${BASE_URL}/rest/api/content/111/label?name=React`);
    expect(init?.method).toBe("DELETE");
  });
});

describe("findPublishedPageBySlug", () => {
  it("지정한 viewerId의 slug가 일치하는 페이지를 찾는다", async () => {
    const fetchMock = vi.fn(async (url: string, _init?: RequestInit) => {
      if (url.includes("/pages?limit=100")) {
        return new Response(
          JSON.stringify({
            results: [
              { id: "1", status: "current", title: "A", spaceId: "1", parentId: null, version: { number: 1, createdAt: "" } },
              { id: "2", status: "current", title: "B", spaceId: "1", parentId: null, version: { number: 1, createdAt: "" } },
            ],
            _links: {},
          }),
          { status: 200 }
        );
      }
      if (url.includes("/pages/1/properties")) {
        return new Response(
          JSON.stringify({
            results: [
              {
                id: "p1",
                key: "publishMetadata",
                value: { isPublished: true, viewers: { "tech-blog": { slug: "other-post" } } },
                version: { number: 1 },
              },
            ],
          }),
          { status: 200 }
        );
      }
      if (url.includes("/pages/2/properties")) {
        return new Response(
          JSON.stringify({
            results: [
              {
                id: "p2",
                key: "publishMetadata",
                value: { isPublished: true, viewers: { "tech-blog": { slug: "my-post" } } },
                version: { number: 1 },
              },
            ],
          }),
          { status: 200 }
        );
      }
      throw new Error(`unexpected url: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await findPublishedPageBySlug("1", "tech-blog", "my-post", "publishMetadata");

    expect(result?.id).toBe("2");
  });

  it("slug가 같아도 게시 취소된 문서는 중복으로 보지 않는다", async () => {
    const fetchMock = vi.fn(async (url: string, _init?: RequestInit) => {
      if (url.includes("/pages?limit=100")) {
        return new Response(
          JSON.stringify({
            results: [
              { id: "1", status: "current", title: "A", spaceId: "1", parentId: null, version: { number: 1, createdAt: "" } },
            ],
            _links: {},
          }),
          { status: 200 }
        );
      }
      if (url.includes("/pages/1/properties")) {
        return new Response(
          JSON.stringify({
            results: [
              {
                id: "p1",
                key: "publishMetadata",
                value: { isPublished: false, viewers: { "tech-blog": { slug: "my-post" } } },
                version: { number: 1 },
              },
            ],
          }),
          { status: 200 }
        );
      }
      throw new Error(`unexpected url: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await findPublishedPageBySlug("1", "tech-blog", "my-post", "publishMetadata");

    expect(result).toBeNull();
  });
});

describe("listChildPages", () => {
  it("_links.next 커서를 따라가며 모든 하위 페이지를 모아 반환한다", async () => {
    const nextCursor = "/api/v2/pages/parent-1/children?limit=100&cursor=page2";
    const fetchMock = vi.fn(async (url: string, _init?: RequestInit) => {
      if (url.endsWith(nextCursor)) {
        return new Response(
          JSON.stringify({
            results: [
              { id: "c3", status: "current", title: "C", spaceId: "1", parentId: "parent-1", version: { number: 1, createdAt: "" } },
            ],
            _links: {},
          }),
          { status: 200 }
        );
      }
      if (url.includes("/pages/parent-1/children")) {
        return new Response(
          JSON.stringify({
            results: [
              { id: "c1", status: "current", title: "A", spaceId: "1", parentId: "parent-1", version: { number: 1, createdAt: "" } },
              { id: "c2", status: "current", title: "B", spaceId: "1", parentId: "parent-1", version: { number: 1, createdAt: "" } },
            ],
            _links: { next: nextCursor },
          }),
          { status: 200 }
        );
      }
      throw new Error(`unexpected url: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const pages = await listChildPages("parent-1");

    expect(pages.map((page) => page.id)).toEqual(["c1", "c2", "c3"]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
