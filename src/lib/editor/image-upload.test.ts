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

  it("성공 시 서버가 반환한 url·filename을 그대로 반환한다(원본 File.name이 아니다)", async () => {
    // 서버가 동명 충돌을 피하려 고유 접미사를 붙인 실제 파일명을 응답에 함께 실어 보낸다
    // (2026-09-09) — 원본 File.name("스크린샷.png")과 다른 값이어도 그 응답값을 그대로
    // 써야 한다. 그렇지 않으면 저장 시 <ac:image ri:filename="...">가 실제 첨부파일이
    // 아닌 엉뚱한 파일을 가리키게 된다(실사용 확인으로 발견한 버그).
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              attachmentId: "att-1",
              url: "/api/editor/documents/page-123/images/스크린샷-ab12.png",
              filename: "스크린샷-ab12.png",
            }),
            { status: 201 }
          )
      )
    );

    const file = makeImageFile("스크린샷.png");
    const result = await uploadImage("page-123", file);

    expect(result).toEqual({
      url: "/api/editor/documents/page-123/images/스크린샷-ab12.png",
      filename: "스크린샷-ab12.png",
    });
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
