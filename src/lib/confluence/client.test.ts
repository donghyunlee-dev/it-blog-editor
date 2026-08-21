import { beforeEach, describe, expect, it, vi } from "vitest";
import { getCurrentConfluenceUser, movePage } from "./client";

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
      vi.fn(async () => new Response(JSON.stringify({ accountId: "acc-1" }), { status: 200 }))
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
