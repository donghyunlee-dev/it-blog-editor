import { beforeEach, describe, expect, it, vi } from "vitest";
import { uploadImage } from "./image-upload";

beforeEach(() => {
  vi.restoreAllMocks();
});

function makeImageFile(name = "photo.png"): File {
  return new File(["fake-image-bytes"], name, { type: "image/png" });
}

describe("uploadImage", () => {
  it("파일을 FormData로 담아 문서의 이미지 업로드 API에 POST 요청을 보낸다", async () => {
    const fetchMock = vi.fn(
      async (_url: string, _init?: RequestInit) =>
        new Response(JSON.stringify({ attachmentId: "att-1", url: "https://example.com/att-1" }), { status: 201 })
    );
    vi.stubGlobal("fetch", fetchMock);

    const file = makeImageFile("diagram.png");
    await uploadImage("page-123", file);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/editor/documents/page-123/images");
    expect(init?.method).toBe("POST");
    expect(init?.body).toBeInstanceOf(FormData);
    expect((init?.body as FormData).get("file")).toBe(file);
  });

  it("성공 시 서버가 반환한 url과 원본 File.name을 filename으로 반환한다", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(JSON.stringify({ attachmentId: "att-1", url: "https://example.com/attachments/att-1" }), {
            status: 201,
          })
      )
    );

    const file = makeImageFile("스크린샷.png");
    const result = await uploadImage("page-123", file);

    expect(result).toEqual({ url: "https://example.com/attachments/att-1", filename: "스크린샷.png" });
  });

  it("응답이 실패(2xx 아님)면 서버 에러 메시지로 에러를 던진다", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(JSON.stringify({ error: { code: "INVALID_REQUEST", message: "허용되지 않는 이미지 파일 형식입니다." } }), {
            status: 400,
          })
      )
    );

    await expect(uploadImage("page-123", makeImageFile())).rejects.toThrow("허용되지 않는 이미지 파일 형식입니다.");
  });

  it("서버 에러 응답에 message가 없으면 기본 에러 메시지를 사용한다", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({}), { status: 502 })));

    await expect(uploadImage("page-123", makeImageFile())).rejects.toThrow("이미지 업로드에 실패했습니다.");
  });
});
