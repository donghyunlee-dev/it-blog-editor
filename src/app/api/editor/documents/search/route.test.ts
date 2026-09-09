import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth-guard", () => ({
  requireSessionEmail: vi.fn(),
}));

vi.mock("@/lib/editor/folder", () => ({
  findPersonalFolder: vi.fn(),
}));

vi.mock("@/lib/editor/documents", () => ({
  searchDocuments: vi.fn(),
}));

import { requireSessionEmail } from "@/lib/auth-guard";
import { findPersonalFolder } from "@/lib/editor/folder";
import { searchDocuments } from "@/lib/editor/documents";
import { UnauthorizedError } from "@/lib/editor/errors";
import { GET } from "./route";

beforeEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

describe("GET /api/editor/documents/search", () => {
  it("개인 폴더가 없으면 빈 목록을 반환하고 searchDocuments를 호출하지 않는다", async () => {
    vi.mocked(requireSessionEmail).mockResolvedValue("user@s-food.com");
    vi.mocked(findPersonalFolder).mockResolvedValue(null);

    const request = new Request("http://localhost/api/editor/documents/search?q=react");
    const response = await GET(request);
    const body = await response.json();

    expect(body).toEqual({ documents: [] });
    expect(vi.mocked(searchDocuments)).not.toHaveBeenCalled();
  });

  it("쿼리 파라미터 q를 그대로 searchDocuments에 전달한다", async () => {
    vi.mocked(requireSessionEmail).mockResolvedValue("user@s-food.com");
    vi.mocked(findPersonalFolder).mockResolvedValue({ accountFolderId: "folder-1", spaceKey: "SF" });
    vi.mocked(searchDocuments).mockResolvedValue([
      {
        pageId: "doc-1",
        title: "React 19 정리",
        updatedAt: "2026-09-01T00:00:00.000Z",
        isPublished: false,
        tags: [],
        folderId: null,
        snippet: "본문 일부",
      },
    ]);

    const request = new Request("http://localhost/api/editor/documents/search?q=react%2019");
    const response = await GET(request);
    const body = await response.json();

    expect(vi.mocked(searchDocuments)).toHaveBeenCalledWith("folder-1", "react 19");
    expect(body).toEqual({
      documents: [
        {
          pageId: "doc-1",
          title: "React 19 정리",
          updatedAt: "2026-09-01T00:00:00.000Z",
          isPublished: false,
          tags: [],
          folderId: null,
          snippet: "본문 일부",
        },
      ],
    });
  });

  it("q 파라미터가 없으면 빈 문자열로 searchDocuments를 호출한다", async () => {
    vi.mocked(requireSessionEmail).mockResolvedValue("user@s-food.com");
    vi.mocked(findPersonalFolder).mockResolvedValue({ accountFolderId: "folder-1", spaceKey: "SF" });
    vi.mocked(searchDocuments).mockResolvedValue([]);

    const request = new Request("http://localhost/api/editor/documents/search");
    await GET(request);

    expect(vi.mocked(searchDocuments)).toHaveBeenCalledWith("folder-1", "");
  });

  it("세션이 없으면 401을 반환하고 폴더 조회·검색을 하지 않는다", async () => {
    vi.mocked(requireSessionEmail).mockRejectedValue(new UnauthorizedError());

    const request = new Request("http://localhost/api/editor/documents/search?q=react");
    const response = await GET(request);

    expect(response.status).toBe(401);
    expect(vi.mocked(findPersonalFolder)).not.toHaveBeenCalled();
    expect(vi.mocked(searchDocuments)).not.toHaveBeenCalled();
  });
});
