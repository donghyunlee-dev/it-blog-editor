import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth-guard", () => ({
  requireSessionEmail: vi.fn(),
}));

vi.mock("@/lib/editor/account-index", () => ({
  searchAccounts: vi.fn(),
}));

import { requireSessionEmail } from "@/lib/auth-guard";
import { searchAccounts } from "@/lib/editor/account-index";
import { AccessDisabledError, UnauthorizedError } from "@/lib/editor/errors";
import { GET } from "./route";

beforeEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
  vi.mocked(requireSessionEmail).mockResolvedValue("user@s-food.com");
});

function searchRequest(query?: string) {
  const url =
    query === undefined
      ? "http://localhost/api/editor/account/search"
      : `http://localhost/api/editor/account/search?q=${encodeURIComponent(query)}`;
  return new Request(url);
}

describe("GET /api/editor/account/search", () => {
  it("q로 필터링된 계정 목록을 반환한다(accountFolderId는 노출하지 않음)", async () => {
    vi.mocked(searchAccounts).mockResolvedValue([
      {
        email: "other@s-food.com",
        name: "김철수",
        team: "디자인팀",
        accessEnabled: true,
        accountFolderId: "account-2",
      },
    ]);

    const response = await GET(searchRequest("김철수"));
    const body = await response.json();

    expect(vi.mocked(searchAccounts)).toHaveBeenCalledWith("김철수");
    expect(body).toEqual({
      accounts: [
        { email: "other@s-food.com", name: "김철수", team: "디자인팀", accessEnabled: true },
      ],
    });
  });

  it("q가 빈 문자열이면 전체 목록 조회로 취급한다", async () => {
    vi.mocked(searchAccounts).mockResolvedValue([]);

    const response = await GET(searchRequest(""));

    expect(response.status).toBe(200);
    expect(vi.mocked(searchAccounts)).toHaveBeenCalledWith("");
  });

  it("q 파라미터 자체가 없으면 400을 반환한다", async () => {
    const response = await GET(searchRequest(undefined));

    expect(response.status).toBe(400);
    expect(vi.mocked(searchAccounts)).not.toHaveBeenCalled();
  });

  it("세션이 없으면 401을 반환한다", async () => {
    vi.mocked(requireSessionEmail).mockRejectedValue(new UnauthorizedError());

    const response = await GET(searchRequest("아무거나"));

    expect(response.status).toBe(401);
    expect(vi.mocked(searchAccounts)).not.toHaveBeenCalled();
  });

  it("접속이 차단된 계정이면 403을 반환한다", async () => {
    vi.mocked(requireSessionEmail).mockRejectedValue(new AccessDisabledError());

    const response = await GET(searchRequest("아무거나"));

    expect(response.status).toBe(403);
  });
});
