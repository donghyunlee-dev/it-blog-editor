import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth-guard", () => ({
  requireSessionEmail: vi.fn(),
}));

vi.mock("@/lib/editor/documents", () => ({
  requireDocumentOwner: vi.fn(),
}));

vi.mock("@/lib/editor/images", () => ({
  registerImage: vi.fn(),
}));

vi.mock("@/lib/rate-limit", () => ({
  enforceRateLimit: vi.fn(),
}));

import { requireSessionEmail } from "@/lib/auth-guard";
import { requireDocumentOwner } from "@/lib/editor/documents";
import { registerImage } from "@/lib/editor/images";
import { RateLimitError, UnauthorizedError, ValidationError } from "@/lib/editor/errors";
import { enforceRateLimit } from "@/lib/rate-limit";
import { POST } from "./route";

beforeEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
  vi.mocked(requireSessionEmail).mockResolvedValue("user@s-food.com");
  vi.mocked(requireDocumentOwner).mockResolvedValue(undefined);
});

function postRequest(formData: FormData) {
  return new Request("http://localhost/api/editor/documents/doc-1/images", {
    method: "POST",
    body: formData,
  });
}

describe("POST /api/editor/documents/[pageId]/images", () => {
  it("정상 요청이면 소유자를 확인하고 registerImage에 위임해 201을 반환한다", async () => {
    vi.mocked(registerImage).mockResolvedValue({
      attachmentId: "att-1",
      url: "https://example.com/photo.png",
    });

    const file = new File(["fake-bytes"], "photo.png", { type: "image/png" });
    const formData = new FormData();
    formData.append("file", file);

    const response = await POST(postRequest(formData), { params: Promise.resolve({ pageId: "doc-1" }) });
    const body = await response.json();

    expect(vi.mocked(requireDocumentOwner)).toHaveBeenCalledWith("doc-1", "user@s-food.com");
    expect(vi.mocked(registerImage)).toHaveBeenCalledWith("doc-1", file);
    expect(response.status).toBe(201);
    expect(body).toEqual({ attachmentId: "att-1", url: "https://example.com/photo.png" });
  });

  it("소유자가 아니면 401을 반환하고 registerImage를 호출하지 않는다", async () => {
    vi.mocked(requireDocumentOwner).mockRejectedValue(new UnauthorizedError("이 문서에 대한 권한이 없습니다."));

    const formData = new FormData();
    formData.append("file", new File(["x"], "photo.png", { type: "image/png" }));

    const response = await POST(postRequest(formData), { params: Promise.resolve({ pageId: "doc-1" }) });

    expect(response.status).toBe(401);
    expect(vi.mocked(registerImage)).not.toHaveBeenCalled();
  });

  it("formData에 file 필드가 없으면 registerImage를 null 파일로 호출한다", async () => {
    vi.mocked(registerImage).mockRejectedValue(new ValidationError("이미지 파일이 누락되었습니다."));

    const formData = new FormData();
    formData.append("title", "무관한 필드");

    const response = await POST(postRequest(formData), { params: Promise.resolve({ pageId: "doc-1" }) });

    expect(vi.mocked(registerImage)).toHaveBeenCalledWith("doc-1", null);
    expect(response.status).toBe(400);
  });

  it("registerImage가 ValidationError를 던지면 400을 반환한다", async () => {
    vi.mocked(registerImage).mockRejectedValue(new ValidationError("허용되지 않는 이미지 파일 형식입니다."));

    const formData = new FormData();
    formData.append("file", new File(["x"], "doc.pdf", { type: "application/pdf" }));

    const response = await POST(postRequest(formData), { params: Promise.resolve({ pageId: "doc-1" }) });

    expect(response.status).toBe(400);
  });

  it("레이트리밋을 초과하면 429를 반환하고 소유자 확인·registerImage를 호출하지 않는다", async () => {
    vi.mocked(enforceRateLimit).mockImplementation(() => {
      throw new RateLimitError(30);
    });

    const formData = new FormData();
    formData.append("file", new File(["x"], "photo.png", { type: "image/png" }));

    const response = await POST(postRequest(formData), { params: Promise.resolve({ pageId: "doc-1" }) });

    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("30");
    expect(vi.mocked(requireDocumentOwner)).not.toHaveBeenCalled();
    expect(vi.mocked(registerImage)).not.toHaveBeenCalled();
  });
});
