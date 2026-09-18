import { describe, expect, it } from "vitest";
import { storageHtmlToTiptapDoc } from "./storage-to-tiptap";
import { tiptapDocToStorageFormat, type JSONContent } from "./tiptap-to-storage";

/**
 * P19-6: 복원 기능의 핵심 인프라(storage HTML → TipTap JSON)를 "저장 → 역변환" 라운드트립으로
 * 검증한다 — `tiptap-to-storage.ts`(이미 검증된 정방향 변환기)로 storage HTML을 만든 뒤,
 * 그 HTML을 다시 파싱해 원본과 의미상 같은 노드가 나오는지 확인한다. `generateJSON`이
 * 브라우저 `DOMParser`를 요구해 이 파일은 `.test.tsx`(happy-dom 환경)로 둔다(vitest.config.ts
 * 참고 — `.test.ts`는 node 환경이라 DOMParser가 없다).
 */
describe("storageHtmlToTiptapDoc", () => {
  it("문단·제목·목록·인용구·구분선을 왕복 복원한다", () => {
    const doc: JSONContent = {
      type: "doc",
      content: [
        { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "제목" }] },
        { type: "paragraph", content: [{ type: "text", text: "본문" }] },
        {
          type: "bulletList",
          content: [
            {
              type: "listItem",
              content: [{ type: "paragraph", content: [{ type: "text", text: "항목1" }] }],
            },
          ],
        },
        { type: "blockquote", content: [{ type: "paragraph", content: [{ type: "text", text: "인용" }] }] },
        { type: "horizontalRule" },
      ],
    };

    const restored = storageHtmlToTiptapDoc(tiptapDocToStorageFormat(doc), "doc-1");

    expect(restored.content?.[0]).toMatchObject({ type: "heading", attrs: { level: 2 } });
    expect(restored.content?.[1]).toMatchObject({ type: "paragraph" });
    expect(restored.content?.[2]).toMatchObject({ type: "bulletList" });
    expect(restored.content?.[3]).toMatchObject({ type: "blockquote" });
    expect(restored.content?.some((n: JSONContent) => n.type === "horizontalRule")).toBe(true);
  });

  it("서식(굵게·기울임·링크)이 있는 텍스트를 왕복 복원한다", () => {
    const doc: JSONContent = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "굵게", marks: [{ type: "bold" }] },
            { type: "text", text: " 링크", marks: [{ type: "link", attrs: { href: "https://example.com" } }] },
          ],
        },
      ],
    };

    const restored = storageHtmlToTiptapDoc(tiptapDocToStorageFormat(doc), "doc-1");
    const textNodes = restored.content?.[0]?.content ?? [];

    expect(textNodes[0]).toMatchObject({ text: "굵게", marks: [{ type: "bold" }] });
    expect(textNodes[1].marks?.[0]).toMatchObject({
      type: "link",
      attrs: expect.objectContaining({ href: "https://example.com" }),
    });
  });

  it("코드 블록을 왕복 복원한다(언어 표시는 유실 — task.md에 명시된 한계)", () => {
    const doc: JSONContent = {
      type: "doc",
      content: [
        {
          type: "codeBlock",
          attrs: { language: "javascript" },
          content: [{ type: "text", text: "const a = 1;" }],
        },
      ],
    };

    const restored = storageHtmlToTiptapDoc(tiptapDocToStorageFormat(doc), "doc-1");

    expect(restored.content?.[0]).toMatchObject({ type: "codeBlock" });
    expect(restored.content?.[0]?.content?.[0]?.text).toBe("const a = 1;");
  });

  it("표를 왕복 복원한다", () => {
    const doc: JSONContent = {
      type: "doc",
      content: [
        {
          type: "table",
          content: [
            {
              type: "tableRow",
              content: [
                { type: "tableCell", content: [{ type: "paragraph", content: [{ type: "text", text: "A1" }] }] },
                { type: "tableCell", content: [{ type: "paragraph", content: [{ type: "text", text: "B1" }] }] },
              ],
            },
          ],
        },
      ],
    };

    const restored = storageHtmlToTiptapDoc(tiptapDocToStorageFormat(doc), "doc-1");

    expect(restored.content?.[0]).toMatchObject({ type: "table" });
    expect(restored.content?.[0]?.content?.[0]).toMatchObject({ type: "tableRow" });
  });

  it("첨부 이미지를 왕복 복원한다(문서 서빙 경로로 src를 다시 구성)", () => {
    const doc: JSONContent = {
      type: "doc",
      content: [
        { type: "image", attrs: { filename: "photo.png", alt: "설명" } },
      ],
    };

    const restored = storageHtmlToTiptapDoc(tiptapDocToStorageFormat(doc), "doc-1");
    const image = restored.content?.find((n: JSONContent) => n.type === "image");

    expect(image?.attrs?.filename).toBe("photo.png");
    expect(image?.attrs?.src).toBe("/api/editor/documents/doc-1/images/photo.png");
    expect(image?.attrs?.alt).toBe("설명");
  });

  it("강조 박스(패널)를 왕복 복원한다", () => {
    const doc: JSONContent = {
      type: "doc",
      content: [
        {
          type: "panel",
          attrs: { panelType: "warning" },
          content: [{ type: "paragraph", content: [{ type: "text", text: "경고 내용" }] }],
        },
      ],
    };

    const restored = storageHtmlToTiptapDoc(tiptapDocToStorageFormat(doc), "doc-1");
    const panel = restored.content?.find((n: JSONContent) => n.type === "panel");

    expect(panel?.attrs?.panelType).toBe("warning");
    expect(panel?.content?.[0]).toMatchObject({ type: "paragraph" });
  });

  it("문서 링크 카드는 텍스트로만 복원된다(저장 형식 자체의 한계, 사용자 확인됨)", () => {
    const doc: JSONContent = {
      type: "doc",
      content: [{ type: "documentLink", attrs: { pageId: "other-doc", title: "다른 문서" } }],
    };

    const restored = storageHtmlToTiptapDoc(tiptapDocToStorageFormat(doc), "doc-1");

    expect(restored.content?.[0].type).not.toBe("documentLink");
    expect(JSON.stringify(restored)).toContain("다른 문서");
  });

  it("실제 Confluence가 붙이는 추가 속성(ac:schema-version·ac:macro-id·ri:version-at-save)이 있어도 이미지·패널을 인식한다(2026-09-18, 실제 문서로 발견한 회귀)", () => {
    // 이 앱의 tiptap-to-storage.ts는 이 속성들을 절대 만들지 않지만, 실제 Confluence
    // 인스턴스는 저장할 때마다 스스로 덧붙인다 — 합성 라운드트립 테스트(위)는 이 속성이
    // 없어 이 버그를 잡지 못했다. 실제 문서(233439235)의 원본 HTML을 그대로 옮겨왔다.
    const html =
      '<ac:image ac:alt="설명"><ri:attachment ri:filename="photo.png" ri:version-at-save="1" /></ac:image>' +
      '<ac:structured-macro ac:name="info" ac:schema-version="1" ac:macro-id="462818e0-baef-4c77-a59b-2923b3647f08">' +
      '<ac:parameter ac:name="icon">ℹ️</ac:parameter>' +
      "<ac:rich-text-body><p>정보입니다.</p></ac:rich-text-body>" +
      "</ac:structured-macro>";

    const restored = storageHtmlToTiptapDoc(html, "doc-1");

    const image = restored.content?.find((n: JSONContent) => n.type === "image");
    expect(image?.attrs?.filename).toBe("photo.png");
    const panel = restored.content?.find((n: JSONContent) => n.type === "panel");
    expect(panel?.attrs?.panelType).toBe("info");
  });
});
