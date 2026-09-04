import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth-guard", () => ({
  requireSessionEmail: vi.fn(),
}));

vi.mock("@/lib/editor/documents", () => ({
  getDocumentDetail: vi.fn(),
  requireDocumentOwner: vi.fn(),
}));

vi.mock("@/lib/editor/folder", () => ({
  findPersonalFolder: vi.fn(),
}));

vi.mock("@/lib/editor/sharing", () => ({
  shareDocument: vi.fn(),
}));

import { requireSessionEmail } from "@/lib/auth-guard";
import { getDocumentDetail, requireDocumentOwner } from "@/lib/editor/documents";
import { findPersonalFolder } from "@/lib/editor/folder";
import { shareDocument } from "@/lib/editor/sharing";
import { UnauthorizedError } from "@/lib/editor/errors";
import { POST } from "./route";

beforeEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
  vi.mocked(requireSessionEmail).mockResolvedValue("owner@s-food.com");
  vi.mocked(requireDocumentOwner).mockResolvedValue(undefined);
  vi.mocked(findPersonalFolder).mockResolvedValue({ accountFolderId: "account-a", spaceKey: "SF" });
  vi.mocked(getDocumentDetail).mockResolvedValue({
    pageId: "doc-1",
    title: "회의록",
    doc: { type: "doc", content: [] },
    version: 1,
    updatedAt: "",
    ownerEmail: "owner@s-food.com",
    sharedWith: [],
  });
});

function postRequest(body: unknown) {
  return new Request("http://localhost/api/editor/documents/doc-1/share", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

describe("POST /api/editor/documents/[pageId]/share", () => {
  it("정상 요청이면 소유자를 확인하고 shareDocument를 호출해 sharedWith를 반환한다", async () => {
    vi.mocked(shareDocument).mockResolvedValue({ sharedWith: ["a@s-food.com"] });

    const response = await POST(postRequest({ email: "a@s-food.com" }), {
      params: Promise.resolve({ pageId: "doc-1" }),
    });
    const body = await response.json();

    expect(vi.mocked(requireDocumentOwner)).toHaveBeenCalledWith("doc-1", "owner@s-food.com");
    expect(vi.mocked(findPersonalFolder)).toHaveBeenCalledWith("a@s-food.com");
    expect(vi.mocked(shareDocument)).toHaveBeenCalledWith(
      "doc-1",
      { email: "a@s-food.com", accountFolderId: "account-a" },
      { ownerEmail: "owner@s-food.com", documentTitle: "회의록" }
    );
    expect(body).toEqual({ sharedWith: ["a@s-food.com"] });
  });

  it("소유자가 아니면 401을 반환하고 shareDocument를 호출하지 않는다", async () => {
    vi.mocked(requireDocumentOwner).mockRejectedValue(
      new UnauthorizedError("이 문서에 대한 권한이 없습니다.")
    );

    const response = await POST(postRequest({ email: "a@s-food.com" }), {
      params: Promise.resolve({ pageId: "doc-1" }),
    });

    expect(response.status).toBe(401);
    expect(vi.mocked(shareDocument)).not.toHaveBeenCalled();
  });

  it("email이 없으면 400을 반환한다", async () => {
    const response = await POST(postRequest({}), {
      params: Promise.resolve({ pageId: "doc-1" }),
    });

    expect(response.status).toBe(400);
    expect(vi.mocked(shareDocument)).not.toHaveBeenCalled();
  });

  it("자기 자신을 대상으로 지정하면 400을 반환한다", async () => {
    const response = await POST(postRequest({ email: "owner@s-food.com" }), {
      params: Promise.resolve({ pageId: "doc-1" }),
    });

    expect(response.status).toBe(400);
    expect(vi.mocked(shareDocument)).not.toHaveBeenCalled();
  });

  it("대상 계정 폴더가 없으면 404를 반환한다", async () => {
    vi.mocked(findPersonalFolder).mockResolvedValue(null);

    const response = await POST(postRequest({ email: "nobody@s-food.com" }), {
      params: Promise.resolve({ pageId: "doc-1" }),
    });

    expect(response.status).toBe(404);
    expect(vi.mocked(shareDocument)).not.toHaveBeenCalled();
  });
});
