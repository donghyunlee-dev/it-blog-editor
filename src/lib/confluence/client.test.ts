import { beforeEach, describe, expect, it, vi } from "vitest";
import { addLabels, clearPageRestrictions, ConfluenceApiError, createPage, downloadAttachment, getCurrentConfluenceUser, listChildPages, listPageVersions, movePage, PropertyVersionConflictError, removeLabel, replacePageBody, restrictPageToAccount, upsertPageProperty, listLabels } from "./client";

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

describe("replacePageBody", () => {
  it("현재 페이지를 조회한 뒤 title은 유지하고 body만 바꿔 PUT 요청을 보낸다", async () => {
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      if (!init || init.method === undefined) {
        return new Response(
          JSON.stringify({
            id: "111",
            status: "current",
            title: "user@s-food.com",
            spaceId: "1",
            parentId: "222",
            version: { number: 3, createdAt: "2026-08-21T00:00:00.000Z" },
          }),
          { status: 200 }
        );
      }
      return new Response(
        JSON.stringify({
          id: "111",
          status: "current",
          title: "user@s-food.com",
          spaceId: "1",
          parentId: "222",
          version: { number: 4, createdAt: "2026-08-21T00:00:00.000Z" },
        }),
        { status: 200 }
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    await replacePageBody("111", "<p>새 본문</p>");

    const putCall = fetchMock.mock.calls.find(([, init]) => init?.method === "PUT");
    expect(putCall).toBeDefined();
    const body = JSON.parse((putCall![1] as RequestInit).body as string);
    expect(body.title).toBe("user@s-food.com");
    expect(body.body).toEqual({ representation: "storage", value: "<p>새 본문</p>" });
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

describe("listChildPages", () => {
  it("_links.next 커서를 따라가며 모든 하위 페이지를 모아 반환한다", async () => {
    // v1 /rest/api/content/{id}/child/page 사용 이유: v2 /api/v2/pages/{id}/children는
    // 실제 Confluence Cloud에서 id/status/title/spaceId/childPosition만 반환하고 version을
    // 절대 포함하지 않는다(실제 인스턴스로 직접 확인, 2026-08-25). listDocuments가 매 문서마다
    // page.version.createdAt을 읽으므로 v2로는 항상 TypeError가 난다 — 유닛 테스트는 항상
    // version을 채운 mock을 쓰기 때문에 이 문제를 잡아내지 못했다.
    const nextCursor =
      "/rest/api/content/parent-1/child/page?next=true&expand=version,space&limit=100&start=2";
    const fetchMock = vi.fn(async (url: string, _init?: RequestInit) => {
      if (url.endsWith(nextCursor)) {
        return new Response(
          JSON.stringify({
            results: [
              { id: "c3", status: "current", title: "C", space: { id: 1 }, version: { number: 1, when: "2026-08-25T00:00:00.000Z" } },
            ],
            _links: {},
          }),
          { status: 200 }
        );
      }
      if (url.includes("/rest/api/content/parent-1/child/page")) {
        return new Response(
          JSON.stringify({
            results: [
              { id: "c1", status: "current", title: "A", space: { id: 1 }, version: { number: 1, when: "2026-08-24T00:00:00.000Z" } },
              { id: "c2", status: "current", title: "B", space: { id: 1 }, version: { number: 1, when: "2026-08-24T00:00:00.000Z" } },
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

    expect(pages).toEqual([
      { id: "c1", status: "current", title: "A", spaceId: "1", parentId: "parent-1", version: { number: 1, createdAt: "2026-08-24T00:00:00.000Z" } },
      { id: "c2", status: "current", title: "B", spaceId: "1", parentId: "parent-1", version: { number: 1, createdAt: "2026-08-24T00:00:00.000Z" } },
      { id: "c3", status: "current", title: "C", spaceId: "1", parentId: "parent-1", version: { number: 1, createdAt: "2026-08-25T00:00:00.000Z" } },
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

describe("upsertPageProperty", () => {
  function stubExistingProperty(versionNumber: number) {
    return vi.fn(async (url: string, init?: RequestInit) => {
      if (!init || init.method === undefined) {
        // GET /properties?key=... — 현재 속성 조회
        return new Response(
          JSON.stringify({
            results: [
              {
                id: "prop-1",
                key: "sourceDocument",
                value: { doc: { type: "doc", content: [] } },
                version: { number: versionNumber },
              },
            ],
          }),
          { status: 200 }
        );
      }
      return new Response(
        JSON.stringify({
          id: "prop-1",
          key: "sourceDocument",
          value: { doc: { type: "doc", content: [] } },
          version: { number: versionNumber + 1 },
        }),
        { status: 200 }
      );
    });
  }

  it("expectedVersion을 넘기지 않으면 검사 없이 항상 현재 버전+1로 덮어쓴다(기존 동작)", async () => {
    const fetchMock = stubExistingProperty(3);
    vi.stubGlobal("fetch", fetchMock);

    const result = await upsertPageProperty("111", "sourceDocument", {
      doc: { type: "doc", content: [] },
    });

    expect(result.version.number).toBe(4);
    const putCall = fetchMock.mock.calls.find(([, init]) => init?.method === "PUT");
    expect(putCall).toBeDefined();
  });

  it("expectedVersion이 현재 버전과 같으면 정상적으로 PUT한다", async () => {
    const fetchMock = stubExistingProperty(3);
    vi.stubGlobal("fetch", fetchMock);

    const result = await upsertPageProperty(
      "111",
      "sourceDocument",
      { doc: { type: "doc", content: [] } },
      { expectedVersion: 3 }
    );

    expect(result.version.number).toBe(4);
  });

  it("expectedVersion이 현재 버전과 다르면 PUT을 보내지 않고 PropertyVersionConflictError를 던진다", async () => {
    const fetchMock = stubExistingProperty(3);
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      upsertPageProperty(
        "111",
        "sourceDocument",
        { doc: { type: "doc", content: [] } },
        { expectedVersion: 2 }
      )
    ).rejects.toThrow(PropertyVersionConflictError);

    const putCall = fetchMock.mock.calls.find(([, init]) => init?.method === "PUT");
    expect(putCall).toBeUndefined();
  });
});

describe("confluenceRequest 재시도(P1-3)", () => {
  it("GET 요청이 500을 두 번 받은 뒤 성공하면 세 번째 시도의 값을 반환한다", async () => {
    vi.useFakeTimers();
    try {
      let call = 0;
      const fetchMock = vi.fn(async () => {
        call += 1;
        if (call < 3) {
          return new Response("boom", { status: 500, statusText: "Internal Server Error" });
        }
        return new Response(JSON.stringify({ accountId: "acc-1" }), { status: 200 });
      });
      vi.stubGlobal("fetch", fetchMock);

      const promise = getCurrentConfluenceUser();
      await vi.runAllTimersAsync();
      const user = await promise;

      expect(user.accountId).toBe("acc-1");
      expect(fetchMock).toHaveBeenCalledTimes(3);
    } finally {
      vi.useRealTimers();
    }
  });

  it("계속 503이면 최대 재시도(3회)를 소진한 뒤 ConfluenceApiError를 던진다", async () => {
    vi.useFakeTimers();
    try {
      const fetchMock = vi.fn(
        async () => new Response("unavailable", { status: 503, statusText: "Service Unavailable" })
      );
      vi.stubGlobal("fetch", fetchMock);

      const promise = getCurrentConfluenceUser();
      const assertion = expect(promise).rejects.toThrow(ConfluenceApiError);
      await vi.runAllTimersAsync();
      await assertion;

      // 최초 1회 + 재시도 3회 = 총 4회.
      expect(fetchMock).toHaveBeenCalledTimes(4);
    } finally {
      vi.useRealTimers();
    }
  });

  it("429 응답의 Retry-After 헤더(초) 값만큼 대기한 뒤에만 재시도한다", async () => {
    vi.useFakeTimers();
    try {
      let call = 0;
      const fetchMock = vi.fn(async () => {
        call += 1;
        if (call === 1) {
          return new Response("rate limited", {
            status: 429,
            statusText: "Too Many Requests",
            headers: { "Retry-After": "5" },
          });
        }
        return new Response(JSON.stringify({ accountId: "acc-1" }), { status: 200 });
      });
      vi.stubGlobal("fetch", fetchMock);

      const promise = getCurrentConfluenceUser();
      await vi.advanceTimersByTimeAsync(4000);
      expect(fetchMock).toHaveBeenCalledTimes(1); // 아직 Retry-After(5초)가 다 지나지 않음

      await vi.advanceTimersByTimeAsync(1000);
      const user = await promise;

      expect(user.accountId).toBe("acc-1");
      expect(fetchMock).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it("POST 요청(createPage)은 5xx를 받아도 재시도하지 않고 즉시 던진다", async () => {
    const fetchMock = vi.fn(
      async () => new Response("boom", { status: 500, statusText: "Internal Server Error" })
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      createPage({ spaceId: "1", parentId: "2", title: "T", bodyValue: "<p></p>" })
    ).rejects.toThrow(ConfluenceApiError);

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("GET 요청이 404를 받으면 재시도 없이 즉시 던진다(도메인 에러 구분에 영향 없음)", async () => {
    const fetchMock = vi.fn(
      async () => new Response("not found", { status: 404, statusText: "Not Found" })
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(getCurrentConfluenceUser()).rejects.toThrow(ConfluenceApiError);

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe("listPageVersions", () => {
  it("_links.next 커서를 따라가며 모든 버전을 모은다", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.endsWith("/api/v2/pages/111/versions?limit=50")) {
        return new Response(
          JSON.stringify({
            results: [{ number: 2, createdAt: "2026-08-27T00:00:00.000Z" }],
            _links: { next: "/api/v2/pages/111/versions?cursor=abc" },
          }),
          { status: 200 }
        );
      }
      if (url.endsWith("/api/v2/pages/111/versions?cursor=abc")) {
        return new Response(
          JSON.stringify({
            results: [{ number: 1, createdAt: "2026-08-20T00:00:00.000Z" }],
            _links: {},
          }),
          { status: 200 }
        );
      }
      throw new Error(`unexpected url: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const versions = await listPageVersions("111");

    expect(versions).toHaveLength(2);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("최신순(createdAt 내림차순)으로 정렬해 반환한다", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({
          results: [
            { number: 1, createdAt: "2026-08-20T00:00:00.000Z" },
            { number: 3, createdAt: "2026-08-27T00:00:00.000Z" },
            { number: 2, createdAt: "2026-08-24T00:00:00.000Z" },
          ],
          _links: {},
        }),
        { status: 200 }
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    const versions = await listPageVersions("111");

    expect(versions.map((v) => v.number)).toEqual([3, 2, 1]);
  });
});

describe("downloadAttachment", () => {
  it("파일명으로 첨부파일을 찾아 최신 다운로드 링크를 조회한 뒤 실제 바이트를 받아온다", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes("/child/attachment?filename=")) {
        expect(url).toContain("filename=photo.png");
        return new Response(
          JSON.stringify({
            results: [{ _links: { download: "/download/attachments/111/photo.png?version=2" } }],
          }),
          { status: 200 }
        );
      }
      return new Response(new Uint8Array([137, 80, 78, 71]), {
        status: 200,
        headers: { "content-type": "image/png" },
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await downloadAttachment("111", "photo.png");

    expect(result.contentType).toBe("image/png");
    expect(new Uint8Array(result.data)).toEqual(new Uint8Array([137, 80, 78, 71]));
    // 두 번째 fetch가 첫 번째 응답의 다운로드 링크(BASE_URL + _links.download)를 그대로 썼는지 확인.
    const downloadCall = fetchMock.mock.calls.find(([url]) =>
      (url as string).includes("/download/attachments/111/photo.png")
    );
    expect(downloadCall?.[0]).toBe(`${BASE_URL}/download/attachments/111/photo.png?version=2`);
  });

  it("해당 파일명의 첨부파일이 없으면 404 ConfluenceApiError를 던진다", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ results: [] }), { status: 200 }))
    );

    await expect(downloadAttachment("111", "missing.png")).rejects.toMatchObject({
      status: 404,
    });
  });

  it("첨부파일 목록 조회 자체가 실패하면 그 상태 코드로 ConfluenceApiError를 던진다", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("서버 오류", { status: 500 })));

    await expect(downloadAttachment("111", "photo.png")).rejects.toBeInstanceOf(ConfluenceApiError);
  });

  it("다운로드 요청 자체가 실패하면 그 상태 코드로 ConfluenceApiError를 던진다", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes("/child/attachment?filename=")) {
        return new Response(
          JSON.stringify({ results: [{ _links: { download: "/download/attachments/111/photo.png" } }] }),
          { status: 200 }
        );
      }
      return new Response("찾을 수 없음", { status: 404 });
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(downloadAttachment("111", "photo.png")).rejects.toMatchObject({ status: 404 });
  });
});
