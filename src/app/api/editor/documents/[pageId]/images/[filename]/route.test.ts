import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth-guard", () => ({
  requireSessionEmail: vi.fn(),
}));

vi.mock("@/lib/editor/documents", () => ({
  requireDocumentAccess: vi.fn(),
}));

vi.mock("@/lib/confluence/client", () => ({
  downloadAttachment: vi.fn(),
}));

import { requireSessionEmail } from "@/lib/auth-guard";
import { requireDocumentAccess } from "@/lib/editor/documents";
import { downloadAttachment } from "@/lib/confluence/client";
import { UnauthorizedError } from "@/lib/editor/errors";
import { GET } from "./route";

beforeEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
  vi.mocked(requireSessionEmail).mockResolvedValue("user@s-food.com");
  vi.mocked(requireDocumentAccess).mockResolvedValue(undefined);
});

function getRequest() {
  return new Request("http://localhost/api/editor/documents/doc-1/images/photo.png");
}

describe("GET /api/editor/documents/[pageId]/images/[filename]", () => {
  it("접근 권한을 확인한 뒤 Confluence에서 받아온 바이트를 그대로 응답 본문으로 돌려준다", async () => {
    const bytes = new Uint8Array([137, 80, 78, 71]).buffer;
    vi.mocked(downloadAttachment).mockResolvedValue({ data: bytes, contentType: "image/png" });

    const response = await GET(getRequest(), {
      params: Promise.resolve({ pageId: "doc-1", filename: "photo.png" }),
    });

    expect(vi.mocked(requireDocumentAccess)).toHaveBeenCalledWith("doc-1", "user@s-food.com");
    expect(vi.mocked(downloadAttachment)).toHaveBeenCalledWith("doc-1", "photo.png");
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("image/png");
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(new Uint8Array([137, 80, 78, 71]));
  });

  it("소유자도 공유받은 사람도 아니면 401을 반환하고 downloadAttachment를 호출하지 않는다", async () => {
    vi.mocked(requireDocumentAccess).mockRejectedValue(new UnauthorizedError("이 문서에 대한 권한이 없습니다."));

    const response = await GET(getRequest(), {
      params: Promise.resolve({ pageId: "doc-1", filename: "photo.png" }),
    });

    expect(response.status).toBe(401);
    expect(vi.mocked(downloadAttachment)).not.toHaveBeenCalled();
  });
});
