import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth-guard", () => ({
  requireSessionEmail: vi.fn(),
}));

vi.mock("@/lib/editor/folder", () => ({
  findPersonalFolder: vi.fn(),
}));

vi.mock("@/lib/editor/folders", () => ({
  createFolder: vi.fn(),
  listFolders: vi.fn(),
}));

import { requireSessionEmail } from "@/lib/auth-guard";
import { findPersonalFolder } from "@/lib/editor/folder";
import { createFolder, listFolders } from "@/lib/editor/folders";
import { ValidationError } from "@/lib/editor/errors";
import { GET, POST } from "./route";

beforeEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

function postRequest(body: unknown) {
  return new Request("http://localhost/api/editor/folders", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

describe("GET /api/editor/folders", () => {
  it("개인 폴더가 없으면 빈 목록을 반환하고 listFolders를 호출하지 않는다", async () => {
    vi.mocked(requireSessionEmail).mockResolvedValue("user@s-food.com");
    vi.mocked(findPersonalFolder).mockResolvedValue(null);

    const response = await GET();
    const body = await response.json();

    expect(body).toEqual({ folders: [] });
    expect(vi.mocked(listFolders)).not.toHaveBeenCalled();
  });

  it("개인 폴더가 있으면 그 accountFolderId로 listFolders를 호출해 목록을 반환한다", async () => {
    vi.mocked(requireSessionEmail).mockResolvedValue("user@s-food.com");
    vi.mocked(findPersonalFolder).mockResolvedValue({ accountFolderId: "folder-1", spaceKey: "SF" });
    vi.mocked(listFolders).mockResolvedValue([
      { id: "f1", name: "업무", parentId: null, order: 0 },
    ]);

    const response = await GET();
    const body = await response.json();

    expect(vi.mocked(listFolders)).toHaveBeenCalledWith("folder-1");
    expect(body).toEqual({ folders: [{ id: "f1", name: "업무", parentId: null, order: 0 }] });
  });
});

describe("POST /api/editor/folders", () => {
  it("개인 폴더가 없으면 400이 아니라 404(NOT_FOUND)를 반환하고 createFolder를 호출하지 않는다", async () => {
    vi.mocked(requireSessionEmail).mockResolvedValue("user@s-food.com");
    vi.mocked(findPersonalFolder).mockResolvedValue(null);

    const response = await POST(postRequest({ name: "업무", parentId: null }));

    expect(response.status).toBe(404);
    expect(vi.mocked(createFolder)).not.toHaveBeenCalled();
  });

  it("정상 요청이면 accountFolderId로 createFolder를 호출해 201을 반환한다", async () => {
    vi.mocked(requireSessionEmail).mockResolvedValue("user@s-food.com");
    vi.mocked(findPersonalFolder).mockResolvedValue({ accountFolderId: "folder-1", spaceKey: "SF" });
    vi.mocked(createFolder).mockResolvedValue({ id: "f1", name: "업무", parentId: null, order: 0 });

    const response = await POST(postRequest({ name: "업무", parentId: null }));
    const body = await response.json();

    expect(vi.mocked(createFolder)).toHaveBeenCalledWith("folder-1", { name: "업무", parentId: null });
    expect(response.status).toBe(201);
    expect(body).toEqual({ id: "f1", name: "업무", parentId: null, order: 0 });
  });

  it("createFolder가 ValidationError를 던지면 400을 반환한다", async () => {
    vi.mocked(requireSessionEmail).mockResolvedValue("user@s-food.com");
    vi.mocked(findPersonalFolder).mockResolvedValue({ accountFolderId: "folder-1", spaceKey: "SF" });
    vi.mocked(createFolder).mockRejectedValue(new ValidationError("폴더 이름을 입력해주세요."));

    const response = await POST(postRequest({ name: "", parentId: null }));

    expect(response.status).toBe(400);
  });
});
