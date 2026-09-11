import { describe, expect, it } from "vitest";
import { isSafeLinkHref, tiptapDocToStorageFormat } from "./tiptap-to-storage";

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

  it("alt가 있는 이미지 노드는 ac:alt 속성을 포함해 변환한다(P1-8)", () => {
    const html = tiptapDocToStorageFormat({
      type: "doc",
      content: [{ type: "image", attrs: { filename: "photo.png", alt: "회의실 사진" } }],
    });

    expect(html).toBe('<ac:image ac:alt="회의실 사진"><ri:attachment ri:filename="photo.png" /></ac:image>');
  });

  it("alt 값의 특수문자를 이스케이프한다(P1-8)", () => {
    const html = tiptapDocToStorageFormat({
      type: "doc",
      content: [{ type: "image", attrs: { filename: "photo.png", alt: '"인용" & <태그>' }}],
    });

    expect(html).toBe(
      '<ac:image ac:alt="&quot;인용&quot; &amp; &lt;태그&gt;"><ri:attachment ri:filename="photo.png" /></ac:image>'
    );
  });

  it("alt가 빈 문자열/공백이면 ac:alt 속성을 넣지 않는다(P1-8)", () => {
    const html = tiptapDocToStorageFormat({
      type: "doc",
      content: [{ type: "image", attrs: { filename: "photo.png", alt: "   " } }],
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

  /**
   * P2-6: `fontSize`도 `color`와 같은 `textStyle` 마크의 속성이라(둘 다 `@tiptap/extension-text-style`이
   * 관리) 한 텍스트 조각에 동시에 붙을 수 있다 — 별도 `<span>`으로 나누지 않고 하나의 `style`
   * 속성에 합쳐야 한다.
   */
  it("글자 크기를 인라인 style로 변환한다", () => {
    const html = tiptapDocToStorageFormat({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "큰 텍스트",
              marks: [{ type: "textStyle", attrs: { fontSize: "24px" } }],
            },
          ],
        },
      ],
    });

    expect(html).toBe('<p><span style="font-size:24px">큰 텍스트</span></p>');
  });

  it("색상과 글자 크기가 함께 있으면 한 span의 style에 합쳐진다", () => {
    const html = tiptapDocToStorageFormat({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "색상+크기",
              marks: [{ type: "textStyle", attrs: { color: "#ff0000", fontSize: "24px" } }],
            },
          ],
        },
      ],
    });

    expect(html).toBe('<p><span style="color:#ff0000;font-size:24px">색상+크기</span></p>');
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
      '<ac:structured-macro ac:name="warning"><ac:parameter ac:name="icon">⚠️</ac:parameter><ac:rich-text-body><p>주의</p></ac:rich-text-body></ac:structured-macro>'
    );
  });

  it("패널의 icon attrs가 있으면 타입 기본값 대신 그대로 사용한다", () => {
    const html = tiptapDocToStorageFormat({
      type: "doc",
      content: [
        {
          type: "panel",
          attrs: { panelType: "note", icon: "🔥" },
          content: [{ type: "paragraph", content: [{ type: "text", text: "커스텀 아이콘" }] }],
        },
      ],
    });

    expect(html).toBe(
      '<ac:structured-macro ac:name="note"><ac:parameter ac:name="icon">🔥</ac:parameter><ac:rich-text-body><p>커스텀 아이콘</p></ac:rich-text-body></ac:structured-macro>'
    );
  });

  it("줄바꿈(hardBreak)을 <br/>로 변환한다", () => {
    const html = tiptapDocToStorageFormat({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "첫 줄" },
            { type: "hardBreak" },
            { type: "text", text: "둘째 줄" },
          ],
        },
      ],
    });

    expect(html).toBe("<p>첫 줄<br/>둘째 줄</p>");
  });

  it("구분선(horizontalRule)을 <hr/>로 변환한다", () => {
    const html = tiptapDocToStorageFormat({
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "위" }] }, { type: "horizontalRule" }],
    });

    expect(html).toBe("<p>위</p><hr/>");
  });

  it("인라인 code 마크를 <code>로 변환한다", () => {
    const html = tiptapDocToStorageFormat({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "const a = 1;", marks: [{ type: "code" }] }],
        },
      ],
    });

    expect(html).toBe("<p><code>const a = 1;</code></p>");
  });

  it("밑줄(underline) 마크를 <u>로 변환한다", () => {
    const html = tiptapDocToStorageFormat({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "밑줄", marks: [{ type: "underline" }] }],
        },
      ],
    });

    expect(html).toBe("<p><u>밑줄</u></p>");
  });

  it("패널 매크로의 panelType을 이스케이프 처리한다", () => {
    const html = tiptapDocToStorageFormat({
      type: "doc",
      content: [
        {
          type: "panel",
          attrs: { panelType: `info"><script>alert("xss")</script><div class="` },
          content: [{ type: "paragraph", content: [{ type: "text", text: "콘텐츠" }] }],
        },
      ],
    });

    expect(html).toBe(
      '<ac:structured-macro ac:name="info&quot;&gt;&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;&lt;div class=&quot;"><ac:parameter ac:name="icon">ℹ️</ac:parameter><ac:rich-text-body><p>콘텐츠</p></ac:rich-text-body></ac:structured-macro>'
    );
  });

  it("패널 매크로의 icon도 이스케이프 처리한다", () => {
    const html = tiptapDocToStorageFormat({
      type: "doc",
      content: [
        {
          type: "panel",
          attrs: { panelType: "info", icon: `"><script>alert(1)</script>` },
          content: [{ type: "paragraph", content: [{ type: "text", text: "콘텐츠" }] }],
        },
      ],
    });

    expect(html).toBe(
      '<ac:structured-macro ac:name="info"><ac:parameter ac:name="icon">&quot;&gt;&lt;script&gt;alert(1)&lt;/script&gt;</ac:parameter><ac:rich-text-body><p>콘텐츠</p></ac:rich-text-body></ac:structured-macro>'
    );
  });
});

describe("isSafeLinkHref", () => {
  it("http/https/mailto 스킴을 허용한다", () => {
    expect(isSafeLinkHref("http://example.com")).toBe(true);
    expect(isSafeLinkHref("https://example.com/path?q=1")).toBe(true);
    expect(isSafeLinkHref("mailto:user@example.com")).toBe(true);
  });

  it("/ 또는 #로 시작하는 상대 경로를 허용한다", () => {
    expect(isSafeLinkHref("/docs/page")).toBe(true);
    expect(isSafeLinkHref("#section-1")).toBe(true);
  });

  it("javascript:/data:/vbscript: 스킴을 거부한다", () => {
    expect(isSafeLinkHref('javascript:alert(document.cookie)')).toBe(false);
    expect(isSafeLinkHref("data:text/html,<script>alert(1)</script>")).toBe(false);
    expect(isSafeLinkHref("vbscript:msgbox(1)")).toBe(false);
  });
});

describe("링크 href 스킴 검증(직렬화 단계)", () => {
  it("javascript: href를 가진 링크는 <a> 래핑 없이 텍스트만 남긴다", () => {
    const html = tiptapDocToStorageFormat({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "클릭",
              marks: [{ type: "link", attrs: { href: "javascript:alert(document.cookie)" } }],
            },
          ],
        },
      ],
    });

    expect(html).toBe("<p>클릭</p>");
  });

  it("안전한 href는 그대로 <a>로 변환한다", () => {
    const html = tiptapDocToStorageFormat({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "링크", marks: [{ type: "link", attrs: { href: "/editor/doc-1" } }] },
          ],
        },
      ],
    });

    expect(html).toBe('<p><a href="/editor/doc-1">링크</a></p>');
  });
});

describe("HTML로 붙여넣은 이미지(filename 없음)", () => {
  it("filename이 없고 src가 안전한 외부 URL이면 ri:url 참조로 변환한다", () => {
    const html = tiptapDocToStorageFormat({
      type: "doc",
      content: [{ type: "image", attrs: { src: "https://example.com/photo.png" } }],
    });

    expect(html).toBe('<ac:image><ri:url ri:value="https://example.com/photo.png" /></ac:image>');
  });

  it("alt가 있으면 ri:url 참조에도 ac:alt 속성을 포함한다(P1-8)", () => {
    const html = tiptapDocToStorageFormat({
      type: "doc",
      content: [{ type: "image", attrs: { src: "https://example.com/photo.png", alt: "외부 이미지" } }],
    });

    expect(html).toBe(
      '<ac:image ac:alt="외부 이미지"><ri:url ri:value="https://example.com/photo.png" /></ac:image>'
    );
  });

  it("filename도 src도 없으면 빈 문자열을 반환한다(깨진 참조를 만들지 않는다)", () => {
    const html = tiptapDocToStorageFormat({
      type: "doc",
      content: [{ type: "image", attrs: {} }],
    });

    expect(html).toBe("");
  });

  it("filename이 없고 src가 javascript: 스킴이면 빈 문자열을 반환한다", () => {
    const html = tiptapDocToStorageFormat({
      type: "doc",
      content: [{ type: "image", attrs: { src: "javascript:alert(1)" } }],
    });

    expect(html).toBe("");
  });
});
