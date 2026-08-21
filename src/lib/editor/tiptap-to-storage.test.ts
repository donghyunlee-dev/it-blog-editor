import { describe, expect, it } from "vitest";
import { tiptapDocToStorageFormat } from "./tiptap-to-storage";

describe("tiptapDocToStorageFormat", () => {
  it("문단과 굵게/기울임/취소선을 변환한다", () => {
    const html = tiptapDocToStorageFormat({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "안녕", marks: [{ type: "bold" }] },
            { type: "text", text: " 세계", marks: [{ type: "italic" }, { type: "strike" }] },
          ],
        },
      ],
    });

    expect(html).toBe("<p><strong>안녕</strong><em><s> 세계</s></em></p>");
  });

  it("제목(H1~H3)을 변환한다", () => {
    const html = tiptapDocToStorageFormat({
      type: "doc",
      content: [{ type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "제목" }] }],
    });

    expect(html).toBe("<h2>제목</h2>");
  });

  it("목록/인용문/코드블록/링크를 변환한다", () => {
    const html = tiptapDocToStorageFormat({
      type: "doc",
      content: [
        {
          type: "bulletList",
          content: [
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "항목1" }] }] },
          ],
        },
        { type: "blockquote", content: [{ type: "paragraph", content: [{ type: "text", text: "인용" }] }] },
        { type: "codeBlock", content: [{ type: "text", text: "const a = 1;" }] },
        {
          type: "paragraph",
          content: [
            { type: "text", text: "링크", marks: [{ type: "link", attrs: { href: "https://example.com" } }] },
          ],
        },
      ],
    });

    expect(html).toBe(
      "<ul><li><p>항목1</p></li></ul>" +
        "<blockquote><p>인용</p></blockquote>" +
        "<pre><code>const a = 1;</code></pre>" +
        '<p><a href="https://example.com">링크</a></p>'
    );
  });
});
