import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth-guard", () => ({
  requireSessionEmail: vi.fn(),
}));

vi.mock("@/lib/editor/documents", () => ({
  requireDocumentOwner: vi.fn(),
}));

vi.mock("@/lib/editor/folder", () => ({
  findPersonalFolder: vi.fn(),
}));

vi.mock("@/lib/editor/sharing", () => ({
  unshareDocument: vi.fn(),
}));

import { requireSessionEmail } from "@/lib/auth-guard";
import { requireDocumentOwner } from "@/lib/editor/documents";
import { findPersonalFolder } from "@/lib/editor/folder";
import { unshareDocument } from "@/lib/editor/sharing";
import { UnauthorizedError } from "@/lib/editor/errors";
import { DELETE } from "./route";

beforeEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
  vi.mocked(requireSessionEmail).mockResolvedValue("owner@s-food.com");
  vi.mocked(requireDocumentOwner).mockResolvedValue(undefined);
  vi.mocked(findPersonalFolder).mockResolvedValue({ accountFolderId: "account-a", spaceKey: "SF" });
});

function deleteRequest() {
  return new Request("http://localhost/api/editor/documents/doc-1/share/a%40s-food.com", {
    method: "DELETE",
  });
}

describe("DELETE /api/editor/documents/[pageId]/share/[email]", () => {
  it("정상 요청이면 소유자를 확인하고 unshareDocument를 호출해 sharedWith를 반환한다", async () => {
    vi.mocked(unshareDocument).mockResolvedValue({ sharedWith: [] });

    const response = await DELETE(deleteRequest(), {
      params: Promise.resolve({ pageId: "doc-1", email: "a@s-food.com" }),
    });
    const body = await response.json();

    expect(vi.mocked(requireDocumentOwner)).toHaveBeenCalledWith("doc-1", "owner@s-food.com");
    expect(vi.mocked(findPersonalFolder)).toHaveBeenCalledWith("a@s-food.com");
    expect(vi.mocked(unshareDocument)).toHaveBeenCalledWith("doc-1", {
      email: "a@s-food.com",
      accountFolderId: "account-a",
    });
    expect(body).toEqual({ sharedWith: [] });
  });

  it("소유자가 아니면 401을 반환하고 unshareDocument를 호출하지 않는다", async () => {
    vi.mocked(requireDocumentOwner).mockRejectedValue(
      new UnauthorizedError("이 문서에 대한 권한이 없습니다.")
    );

    const response = await DELETE(deleteRequest(), {
      params: Promise.resolve({ pageId: "doc-1", email: "a@s-food.com" }),
    });

    expect(response.status).toBe(401);
    expect(vi.mocked(unshareDocument)).not.toHaveBeenCalled();
  });

  it("대상 계정 폴더가 없으면 404를 반환한다", async () => {
    vi.mocked(findPersonalFolder).mockResolvedValue(null);

    const response = await DELETE(deleteRequest(), {
      params: Promise.resolve({ pageId: "doc-1", email: "nobody@s-food.com" }),
    });

    expect(response.status).toBe(404);
    expect(vi.mocked(unshareDocument)).not.toHaveBeenCalled();
  });
});
