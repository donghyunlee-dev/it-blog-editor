import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth-guard", () => ({
  requireSessionEmail: vi.fn(),
}));

vi.mock("@/lib/editor/folder", () => ({
  findPersonalFolder: vi.fn(),
}));

vi.mock("@/lib/editor/account", () => ({
  getAccountMeta: vi.fn(),
  needsOnboarding: vi.fn(),
  saveAccountMeta: vi.fn(),
}));

import { requireSessionEmail } from "@/lib/auth-guard";
import { findPersonalFolder } from "@/lib/editor/folder";
import { getAccountMeta, needsOnboarding, saveAccountMeta } from "@/lib/editor/account";
import { UnauthorizedError, ValidationError } from "@/lib/editor/errors";
import { GET, PUT } from "./route";

const FOLDER = { accountFolderId: "account-1", spaceKey: "SF" };

beforeEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
  vi.mocked(requireSessionEmail).mockResolvedValue("user@s-food.com");
});

function putRequest(body: unknown) {
  return new Request("http://localhost/api/editor/account", {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

describe("GET /api/editor/account", () => {
  it("계정 정보와 needsOnboarding 여부를 반환한다", async () => {
    vi.mocked(findPersonalFolder).mockResolvedValue(FOLDER);
    vi.mocked(getAccountMeta).mockResolvedValue({
      name: "홍길동",
      team: "IT팀",
      accessEnabled: true,
    });
    vi.mocked(needsOnboarding).mockReturnValue(false);

    const response = await GET();
    const body = await response.json();

    expect(vi.mocked(getAccountMeta)).toHaveBeenCalledWith("account-1");
    expect(body).toEqual({
      email: "user@s-food.com",
      name: "홍길동",
      team: "IT팀",
      needsOnboarding: false,
    });
  });

  it("개인 폴더가 없으면 404를 반환한다", async () => {
    vi.mocked(findPersonalFolder).mockResolvedValue(null);

    const response = await GET();

    expect(response.status).toBe(404);
    expect(vi.mocked(getAccountMeta)).not.toHaveBeenCalled();
  });

  it("세션이 없으면 401을 반환한다", async () => {
    vi.mocked(requireSessionEmail).mockRejectedValue(new UnauthorizedError());

    const response = await GET();

    expect(response.status).toBe(401);
    expect(vi.mocked(findPersonalFolder)).not.toHaveBeenCalled();
  });
});

describe("PUT /api/editor/account", () => {
  it("정상 요청이면 saveAccountMeta를 호출해 저장된 값을 반환한다", async () => {
    vi.mocked(findPersonalFolder).mockResolvedValue(FOLDER);
    vi.mocked(saveAccountMeta).mockResolvedValue({
      name: "홍길동",
      team: "IT팀",
      accessEnabled: true,
    });

    const response = await PUT(putRequest({ name: "홍길동", team: "IT팀" }));
    const body = await response.json();

    expect(vi.mocked(saveAccountMeta)).toHaveBeenCalledWith("account-1", {
      name: "홍길동",
      team: "IT팀",
    });
    expect(body).toEqual({ email: "user@s-food.com", name: "홍길동", team: "IT팀" });
  });

  it("saveAccountMeta가 ValidationError를 던지면 400을 반환한다(이름/팀 누락)", async () => {
    vi.mocked(findPersonalFolder).mockResolvedValue(FOLDER);
    vi.mocked(saveAccountMeta).mockRejectedValue(
      new ValidationError("이름과 팀을 모두 입력해주세요.")
    );

    const response = await PUT(putRequest({ name: "", team: "IT팀" }));

    expect(response.status).toBe(400);
  });

  it("개인 폴더가 없으면 404를 반환하고 saveAccountMeta를 호출하지 않는다", async () => {
    vi.mocked(findPersonalFolder).mockResolvedValue(null);

    const response = await PUT(putRequest({ name: "홍길동", team: "IT팀" }));

    expect(response.status).toBe(404);
    expect(vi.mocked(saveAccountMeta)).not.toHaveBeenCalled();
  });

  it("세션이 없으면 401을 반환한다", async () => {
    vi.mocked(requireSessionEmail).mockRejectedValue(new UnauthorizedError());

    const response = await PUT(putRequest({ name: "홍길동", team: "IT팀" }));

    expect(response.status).toBe(401);
    expect(vi.mocked(saveAccountMeta)).not.toHaveBeenCalled();
  });
});
