import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth-guard", () => ({
  requireSessionEmail: vi.fn(),
}));

vi.mock("@/lib/editor/folder", () => ({
  findPersonalFolder: vi.fn(),
}));

vi.mock("@/lib/editor/documents", () => ({
  createDocument: vi.fn(),
  listDocuments: vi.fn(),
}));

import { requireSessionEmail } from "@/lib/auth-guard";
import { findPersonalFolder } from "@/lib/editor/folder";
import { createDocument, listDocuments } from "@/lib/editor/documents";
import { UnauthorizedError, ValidationError } from "@/lib/editor/errors";
import { GET, POST } from "./route";

beforeEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

describe("GET /api/editor/documents", () => {
  it("개인 폴더가 없으면 빈 목록을 반환하고 listDocuments를 호출하지 않는다", async () => {
    vi.mocked(requireSessionEmail).mockResolvedValue("user@s-food.com");
    vi.mocked(findPersonalFolder).mockResolvedValue(null);

    const response = await GET();
    const body = await response.json();

    expect(body).toEqual({ documents: [] });
    expect(vi.mocked(listDocuments)).not.toHaveBeenCalled();
  });

  it("개인 폴더가 있으면 그 accountFolderId로 listDocuments를 호출해 문서 목록을 반환한다", async () => {
    vi.mocked(requireSessionEmail).mockResolvedValue("user@s-food.com");
    vi.mocked(findPersonalFolder).mockResolvedValue({ accountFolderId: "folder-1", spaceKey: "SF" });
    vi.mocked(listDocuments).mockResolvedValue([
      { pageId: "doc-1", title: "문서1", updatedAt: "2026-09-01T00:00:00.000Z", isPublished: false, tags: [] },
    ]);

    const response = await GET();
    const body = await response.json();

    expect(vi.mocked(listDocuments)).toHaveBeenCalledWith("folder-1");
    expect(body).toEqual({
      documents: [
        { pageId: "doc-1", title: "문서1", updatedAt: "2026-09-01T00:00:00.000Z", isPublished: false, tags: [] },
      ],
    });
  });

  it("세션이 없으면 401을 반환하고 폴더 조회·문서 목록 조회를 하지 않는다", async () => {
    vi.mocked(requireSessionEmail).mockRejectedValue(new UnauthorizedError());

    const response = await GET();

    expect(response.status).toBe(401);
    expect(vi.mocked(findPersonalFolder)).not.toHaveBeenCalled();
    expect(vi.mocked(listDocuments)).not.toHaveBeenCalled();
  });
});

describe("POST /api/editor/documents", () => {
  it("개인 폴더가 없으면 404를 반환하고 createDocument를 호출하지 않는다", async () => {
    vi.mocked(requireSessionEmail).mockResolvedValue("user@s-food.com");
    vi.mocked(findPersonalFolder).mockResolvedValue(null);

    const request = new Request("http://localhost/api/editor/documents", {
      method: "POST",
      body: JSON.stringify({ title: "제목", doc: { type: "doc", content: [] } }),
    });
    const response = await POST(request);

    expect(response.status).toBe(404);
    expect(vi.mocked(createDocument)).not.toHaveBeenCalled();
  });

  it("정상 요청이면 accountFolderId·title·doc·actualAuthorEmail을 그대로 전달하고 201을 반환한다", async () => {
    vi.mocked(requireSessionEmail).mockResolvedValue("user@s-food.com");
    vi.mocked(findPersonalFolder).mockResolvedValue({ accountFolderId: "folder-1", spaceKey: "SF" });
    vi.mocked(createDocument).mockResolvedValue({ pageId: "doc-1", version: 1 });

    const doc = { type: "doc", content: [{ type: "paragraph", content: [] }] };
    const request = new Request("http://localhost/api/editor/documents", {
      method: "POST",
      body: JSON.stringify({ title: "제목", doc }),
    });
    const response = await POST(request);
    const body = await response.json();

    expect(vi.mocked(createDocument)).toHaveBeenCalledWith({
      accountFolderId: "folder-1",
      title: "제목",
      doc,
      actualAuthorEmail: "user@s-food.com",
    });
    expect(response.status).toBe(201);
    expect(body).toEqual({ pageId: "doc-1", version: 1 });
  });

  it("title/doc이 없으면 빈 문자열·빈 문서로 기본값을 채워 createDocument를 호출한다", async () => {
    vi.mocked(requireSessionEmail).mockResolvedValue("user@s-food.com");
    vi.mocked(findPersonalFolder).mockResolvedValue({ accountFolderId: "folder-1", spaceKey: "SF" });
    vi.mocked(createDocument).mockResolvedValue({ pageId: "doc-1", version: 1 });

    const request = new Request("http://localhost/api/editor/documents", {
      method: "POST",
      body: JSON.stringify({}),
    });
    await POST(request);

    expect(vi.mocked(createDocument)).toHaveBeenCalledWith({
      accountFolderId: "folder-1",
      title: "",
      doc: { type: "doc", content: [] },
      actualAuthorEmail: "user@s-food.com",
    });
  });

  it("createDocument가 ValidationError를 던지면 400을 반환한다", async () => {
    vi.mocked(requireSessionEmail).mockResolvedValue("user@s-food.com");
    vi.mocked(findPersonalFolder).mockResolvedValue({ accountFolderId: "folder-1", spaceKey: "SF" });
    vi.mocked(createDocument).mockRejectedValue(new ValidationError("제목은 필수입니다."));

    const request = new Request("http://localhost/api/editor/documents", {
      method: "POST",
      body: JSON.stringify({ title: "", doc: { type: "doc", content: [] } }),
    });
    const response = await POST(request);

    expect(response.status).toBe(400);
  });
});
