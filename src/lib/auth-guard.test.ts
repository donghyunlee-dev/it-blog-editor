import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/editor/folder", () => ({
  findPersonalFolder: vi.fn(),
}));

vi.mock("@/lib/editor/account", () => ({
  getAccountMeta: vi.fn(),
}));

import { auth } from "@/lib/auth";
import { findPersonalFolder } from "@/lib/editor/folder";
import { getAccountMeta } from "@/lib/editor/account";
import { AccessDisabledError, UnauthorizedError, requireSessionEmail } from "./auth-guard";

const EMAIL = "user@s-food.com";

// next-auth v5의 `auth`는 세션 조회용 오버로드와 미들웨어용 오버로드를 함께 갖고 있어
// `vi.mocked(auth)`가 미들웨어 시그니처로 추론된다 — 이 테스트가 실제로 쓰는 건 세션
// 조회 오버로드뿐이므로 그 형태로만 좁혀 캐스팅한다.
const mockedAuth = vi.mocked(
  auth as unknown as () => Promise<{ user: { email: string } } | null>
);

beforeEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

describe("requireSessionEmail", () => {
  it("세션이 없으면 UnauthorizedError를 던진다", async () => {
    mockedAuth.mockResolvedValue(null);

    await expect(requireSessionEmail()).rejects.toThrow(UnauthorizedError);
    expect(vi.mocked(findPersonalFolder)).not.toHaveBeenCalled();
  });

  it("계정 폴더가 아직 없으면 접속 차단 검사를 건너뛰고 이메일을 반환한다", async () => {
    mockedAuth.mockResolvedValue({ user: { email: EMAIL } });
    vi.mocked(findPersonalFolder).mockResolvedValue(null);

    await expect(requireSessionEmail()).resolves.toBe(EMAIL);
    expect(vi.mocked(getAccountMeta)).not.toHaveBeenCalled();
  });

  it("accessEnabled가 true(기본값 포함)면 이메일을 반환한다", async () => {
    mockedAuth.mockResolvedValue({ user: { email: EMAIL } });
    vi.mocked(findPersonalFolder).mockResolvedValue({
      accountFolderId: "account-1",
      spaceKey: "SF",
    });
    vi.mocked(getAccountMeta).mockResolvedValue({
      name: "홍길동",
      team: "IT팀",
      accessEnabled: true,
    });

    await expect(requireSessionEmail()).resolves.toBe(EMAIL);
  });

  it("accessEnabled가 false면 AccessDisabledError를 던진다", async () => {
    mockedAuth.mockResolvedValue({ user: { email: EMAIL } });
    vi.mocked(findPersonalFolder).mockResolvedValue({
      accountFolderId: "account-1",
      spaceKey: "SF",
    });
    vi.mocked(getAccountMeta).mockResolvedValue({
      name: "홍길동",
      team: "IT팀",
      accessEnabled: false,
    });

    await expect(requireSessionEmail()).rejects.toThrow(AccessDisabledError);
  });
});
