import { Marked } from "marked";

const ATTACHMENT_SCHEME = "confluence-attachment://";

function escapeXmlAttribute(value: string) {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}

function renderImage(href: string, title: string | null | undefined, text: string) {
  if (href.startsWith(ATTACHMENT_SCHEME)) {
    const filename = href.slice(ATTACHMENT_SCHEME.length);
    return `<ac:image><ri:attachment ri:filename="${escapeXmlAttribute(filename)}" /></ac:image>`;
  }

  const titleAttr = title ? ` title="${escapeXmlAttribute(title)}"` : "";
  return `<img src="${escapeXmlAttribute(href)}" alt="${escapeXmlAttribute(text)}"${titleAttr} />`;
}

function createMarkdownConverter() {
  const marked = new Marked({ gfm: true, breaks: true });

  marked.use({
    renderer: {
      image({ href, title, text }) {
        return renderImage(href, title, text);
      },
    },
  });

  return marked;
}

const converter = createMarkdownConverter();

/**
 * 에디터에서 작성한 Markdown을 Confluence storage format(XHTML 기반)으로 변환한다.
 * 첨부 이미지는 `confluence-attachment://{filename}` 참조를 `<ac:image>` 매크로로 치환하고,
 * 그 외 표준 Markdown 요소(제목/목록/강조/코드블록/링크)는 표준 XHTML 태그로 변환한다.
 */
export function markdownToStorageFormat(markdown: string): string {
  return converter.parse(markdown, { async: false }) as string;
}

/**
 * 이미지 업로드 API가 반환한 attachmentId/filename을 편집기에 삽입할
 * Markdown 이미지 참조(`confluence-attachment://filename`)로 변환한다.
 */
export function buildAttachmentImageReference(filename: string): string {
  return `${ATTACHMENT_SCHEME}${filename}`;
}
