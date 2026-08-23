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

describe("이미지·글자색·하이라이트", () => {
  it("이미지 노드를 ac:image 매크로로 변환한다", () => {
    const html = tiptapDocToStorageFormat({
      type: "doc",
      content: [{ type: "image", attrs: { filename: "photo.png" } }],
    });

    expect(html).toBe('<ac:image><ri:attachment ri:filename="photo.png" /></ac:image>');
  });

  it("글자 색상과 하이라이트를 인라인 style로 변환한다", () => {
    const html = tiptapDocToStorageFormat({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "색상 텍스트",
              marks: [{ type: "textStyle", attrs: { color: "#ff0000" } }],
            },
            {
              type: "text",
              text: "하이라이트",
              marks: [{ type: "highlight", attrs: { color: "#fff3b0" } }],
            },
          ],
        },
      ],
    });

    expect(html).toBe(
      '<p><span style="color:#ff0000">색상 텍스트</span>' +
        '<span style="background-color:#fff3b0">하이라이트</span></p>'
    );
  });
});

describe("표·패널 매크로", () => {
  it("표(셀 병합 포함)를 변환한다", () => {
    const html = tiptapDocToStorageFormat({
      type: "doc",
      content: [
        {
          type: "table",
          content: [
            {
              type: "tableRow",
              content: [
                { type: "tableHeader", attrs: { colspan: 2 }, content: [{ type: "paragraph", content: [{ type: "text", text: "제목" }] }] },
              ],
            },
            {
              type: "tableRow",
              content: [
                { type: "tableCell", content: [{ type: "paragraph", content: [{ type: "text", text: "A" }] }] },
                { type: "tableCell", content: [{ type: "paragraph", content: [{ type: "text", text: "B" }] }] },
              ],
            },
          ],
        },
      ],
    });

    expect(html).toBe(
      "<table>" +
        '<tr><th colspan="2"><p>제목</p></th></tr>' +
        "<tr><td><p>A</p></td><td><p>B</p></td></tr>" +
        "</table>"
    );
  });

  it("패널 매크로(정보/경고/노트)를 변환한다", () => {
    const html = tiptapDocToStorageFormat({
      type: "doc",
      content: [
        {
          type: "panel",
          attrs: { panelType: "warning" },
          content: [{ type: "paragraph", content: [{ type: "text", text: "주의" }] }],
        },
      ],
    });

    expect(html).toBe(
      '<ac:structured-macro ac:name="warning"><ac:rich-text-body><p>주의</p></ac:rich-text-body></ac:structured-macro>'
    );
  });
});
