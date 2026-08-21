import { describe, expect, it } from "vitest";
import { buildAttachmentImageReference, markdownToStorageFormat } from "./markdown";

describe("markdown", () => {
  it("buildAttachmentImageReference는 confluence-attachment:// 스킴을 만든다", () => {
    expect(buildAttachmentImageReference("photo.png")).toBe(
      "confluence-attachment://photo.png"
    );
  });

  it("markdownToStorageFormat은 첨부 이미지 참조를 ac:image 매크로로 변환한다", () => {
    const html = markdownToStorageFormat(
      `![photo](${buildAttachmentImageReference("photo.png")})`
    );
    expect(html).toContain('<ac:image><ri:attachment ri:filename="photo.png" /></ac:image>');
  });
});
