import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth-guard", () => ({
  requireSessionEmail: vi.fn(),
}));

vi.mock("@/lib/editor/folder", () => ({
  findPersonalFolder: vi.fn(),
  createPersonalFolder: vi.fn(),
}));

import { requireSessionEmail } from "@/lib/auth-guard";
import { findPersonalFolder, createPersonalFolder } from "@/lib/editor/folder";
import { ConflictError, UnauthorizedError } from "@/lib/editor/errors";
import { GET, POST } from "./route";

beforeEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

describe("GET /api/editor/folder", () => {
  it("폴더가 없으면 exists: false를 반환한다", async () => {
    vi.mocked(requireSessionEmail).mockResolvedValue("user@s-food.com");
    vi.mocked(findPersonalFolder).mockResolvedValue(null);

    const response = await GET();
    const body = await response.json();

    expect(body).toEqual({ exists: false });
  });

  it("폴더가 있으면 accountFolderId·spaceKey와 함께 exists: true를 반환한다", async () => {
    vi.mocked(requireSessionEmail).mockResolvedValue("user@s-food.com");
    vi.mocked(findPersonalFolder).mockResolvedValue({ accountFolderId: "folder-1", spaceKey: "SF" });

    const response = await GET();
    const body = await response.json();

    expect(body).toEqual({ exists: true, accountFolderId: "folder-1", spaceKey: "SF" });
  });

  it("세션이 없으면 401을 반환한다", async () => {
    vi.mocked(requireSessionEmail).mockRejectedValue(new UnauthorizedError());

    const response = await GET();

    expect(response.status).toBe(401);
    expect(vi.mocked(findPersonalFolder)).not.toHaveBeenCalled();
  });
});

describe("POST /api/editor/folder", () => {
  it("정상 요청이면 createPersonalFolder를 호출해 201을 반환한다", async () => {
    vi.mocked(requireSessionEmail).mockResolvedValue("user@s-food.com");
    vi.mocked(createPersonalFolder).mockResolvedValue({ accountFolderId: "folder-1", spaceKey: "SF" });

    const response = await POST();
    const body = await response.json();

    expect(vi.mocked(createPersonalFolder)).toHaveBeenCalledWith("user@s-food.com");
    expect(response.status).toBe(201);
    expect(body).toEqual({ accountFolderId: "folder-1", spaceKey: "SF" });
  });

  it("createPersonalFolder가 ConflictError를 던지면(이미 존재) 409를 반환한다", async () => {
    vi.mocked(requireSessionEmail).mockResolvedValue("user@s-food.com");
    vi.mocked(createPersonalFolder).mockRejectedValue(new ConflictError("개인 폴더가 이미 존재합니다."));

    const response = await POST();

    expect(response.status).toBe(409);
  });

  it("세션이 없으면 401을 반환하고 createPersonalFolder를 호출하지 않는다", async () => {
    vi.mocked(requireSessionEmail).mockRejectedValue(new UnauthorizedError());

    const response = await POST();

    expect(response.status).toBe(401);
    expect(vi.mocked(createPersonalFolder)).not.toHaveBeenCalled();
  });
});
