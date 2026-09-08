import { beforeEach, describe, expect, it, vi } from "vitest";
import * as client from "@/lib/confluence/client";
import { registerImage } from "./images";
import { ValidationError } from "./errors";

function makeFile(sizeBytes: number, type = "image/png", name = "photo.png"): File {
  return new File([new Uint8Array(sizeBytes)], name, { type });
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("registerImage", () => {
  it("파일이 없으면 ValidationError를 던진다", async () => {
    const uploadSpy = vi.spyOn(client, "uploadAttachment");

    await expect(registerImage("page-1", null)).rejects.toThrow(ValidationError);
    expect(uploadSpy).not.toHaveBeenCalled();
  });

  it("허용되지 않는 MIME 타입이면 ValidationError를 던진다", async () => {
    const uploadSpy = vi.spyOn(client, "uploadAttachment");
    const file = makeFile(1024, "application/pdf", "doc.pdf");

    await expect(registerImage("page-1", file)).rejects.toThrow(ValidationError);
    expect(uploadSpy).not.toHaveBeenCalled();
  });

  it("10MB를 초과하면 ValidationError를 던지고 Confluence에 업로드하지 않는다", async () => {
    const uploadSpy = vi.spyOn(client, "uploadAttachment");
    const file = makeFile(10 * 1024 * 1024 + 1);

    await expect(registerImage("page-1", file)).rejects.toThrow(
      "이미지 파일 크기는 10MB를 초과할 수 없습니다."
    );
    expect(uploadSpy).not.toHaveBeenCalled();
  });

  it("정확히 10MB(경계값)는 정상 업로드된다", async () => {
    const uploadSpy = vi
      .spyOn(client, "uploadAttachment")
      .mockResolvedValue({ attachmentId: "att-1", url: "https://example.com/att-1", filename: "photo.png" });
    const file = makeFile(10 * 1024 * 1024);

    const result = await registerImage("page-1", file);

    expect(result).toEqual({ attachmentId: "att-1", url: "https://example.com/att-1", filename: "photo.png" });
    expect(uploadSpy).toHaveBeenCalledWith("page-1", file);
  });

  it("10MB 이하의 일반 파일은 정상 업로드된다", async () => {
    const uploadSpy = vi
      .spyOn(client, "uploadAttachment")
      .mockResolvedValue({ attachmentId: "att-1", url: "https://example.com/att-1", filename: "photo.png" });
    const file = makeFile(1024);

    const result = await registerImage("page-1", file);

    expect(result).toEqual({ attachmentId: "att-1", url: "https://example.com/att-1", filename: "photo.png" });
    expect(uploadSpy).toHaveBeenCalledWith("page-1", file);
  });
});
