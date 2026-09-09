export interface JSONContent {
  type: string;
  attrs?: Record<string, unknown>;
  content?: JSONContent[];
  text?: string;
  marks?: Array<{ type: string; attrs?: Record<string, unknown> }>;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const ALLOWED_LINK_SCHEMES = ["http:", "https:", "mailto:"];

/**
 * 링크 href가 안전한지 확인한다: `http:`/`https:`/`mailto:` 스킴이거나 `/`·`#`로 시작하는
 * 상대 경로만 허용한다. `javascript:`/`data:`/`vbscript:` 등은 거부한다.
 *
 * 발행된 문서는 다른 직원(sfood 기술 블로그 독자)이 읽으므로, `<a href>`에 그대로 들어가는
 * 저장형 XSS 벡터다 — Confluence의 렌더링 단계가 이를 걸러줄 것이라 가정하지 않고, 이 앱의
 * 직렬화 단계에서 직접 검증한다.
 */
export function isSafeLinkHref(href: string): boolean {
  const trimmed = href.trim();
  if (trimmed.startsWith("/") || trimmed.startsWith("#")) {
    return true;
  }
  try {
    const url = new URL(trimmed);
    return ALLOWED_LINK_SCHEMES.includes(url.protocol);
  } catch {
    return false;
  }
}

/**
 * 붙여넣기로 들어온 외부 이미지 src가 안전한지 확인한다(`http:`/`https:`만 허용). 이미지
 * src는 링크와 달리 상대 경로·mailto가 의미 없으므로 더 좁게 허용한다.
 */
function isSafeImageSrc(src: string): boolean {
  try {
    const url = new URL(src.trim());
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

const MARK_TAGS: Record<string, (attrs: Record<string, unknown> | undefined) => [string, string]> = {
  bold: () => ["<strong>", "</strong>"],
  italic: () => ["<em>", "</em>"],
  strike: () => ["<s>", "</s>"],
  link: (attrs) => {
    const href = String(attrs?.href ?? "");
    if (!isSafeLinkHref(href)) {
      return ["", ""];
    }
    return [`<a href="${escapeHtml(href)}">`, "</a>"];
  },
  code: () => ["<code>", "</code>"],
  underline: () => ["<u>", "</u>"],
  textStyle: (attrs) => {
    const styles: string[] = [];
    if (attrs?.color) styles.push(`color:${escapeHtml(String(attrs.color))}`);
    if (attrs?.fontSize) styles.push(`font-size:${escapeHtml(String(attrs.fontSize))}`);
    return styles.length > 0 ? [`<span style="${styles.join(";")}">`, "</span>"] : ["", ""];
  },
  highlight: (attrs) => [
    `<span style="background-color:${escapeHtml(String(attrs?.color ?? "#ffff00"))}">`,
    "</span>",
  ],
};

function serializeText(node: JSONContent): string {
  let html = escapeHtml(node.text ?? "");
  const marks = node.marks ?? [];
  for (let i = marks.length - 1; i >= 0; i--) {
    const mark = marks[i];
    const tags = MARK_TAGS[mark.type];
    if (tags) {
      const [open, close] = tags(mark.attrs);
      html = `${open}${html}${close}`;
    }
  }
  return html;
}

function serializeChildren(node: JSONContent): string {
  return (node.content ?? []).map(serializeNode).join("");
}

function serializeNode(node: JSONContent): string {
  switch (node.type) {
    case "text":
      return serializeText(node);
    case "paragraph":
      return `<p>${serializeChildren(node)}</p>`;
    case "heading": {
      const level = Number(node.attrs?.level ?? 1);
      return `<h${level}>${serializeChildren(node)}</h${level}>`;
    }
    case "bulletList":
      return `<ul>${serializeChildren(node)}</ul>`;
    case "orderedList":
      return `<ol>${serializeChildren(node)}</ol>`;
    case "listItem":
      return `<li>${serializeChildren(node)}</li>`;
    case "blockquote":
      return `<blockquote>${serializeChildren(node)}</blockquote>`;
    case "codeBlock":
      return `<pre><code>${serializeChildren(node)}</code></pre>`;
    case "hardBreak":
      return "<br/>";
    case "horizontalRule":
      return "<hr/>";
    case "image": {
      // Confluence storage format의 `ac:image`는 대체 텍스트를 별도 ac:parameter가
      // 아니라 `ac:alt` 속성으로 직접 받는다(Atlassian 공식 문서 확인). 값이 없으면
      // 기존과 동일하게 속성 자체를 넣지 않는다.
      const alt = String(node.attrs?.alt ?? "").trim();
      const altAttr = alt ? ` ac:alt="${escapeHtml(alt)}"` : "";

      const filename = String(node.attrs?.filename ?? "").trim();
      if (filename) {
        return `<ac:image${altAttr}><ri:attachment ri:filename="${escapeHtml(filename)}" /></ac:image>`;
      }
      // HTML로 붙여넣은 이미지(파일이 아니라 `<img src>` 조각)는 AttachmentImage 노드에
      // filename 없이 src만 채워진다. filename이 없다고 그대로 두면 직렬화 시
      // `ri:filename=""`인 깨진 첨부 참조가 되므로, src가 유효한 외부 URL이면 대신
      // 외부 이미지 참조(`ri:url`)로 내보낸다(Confluence storage format에서 유효한 형태).
      const src = String(node.attrs?.src ?? "").trim();
      if (src && isSafeImageSrc(src)) {
        return `<ac:image${altAttr}><ri:url ri:value="${escapeHtml(src)}" /></ac:image>`;
      }
      return "";
    }
    case "table":
      return `<table>${serializeChildren(node)}</table>`;
    case "tableRow":
      return `<tr>${serializeChildren(node)}</tr>`;
    case "tableCell":
      return `<td${node.attrs?.colspan ? ` colspan="${node.attrs.colspan}"` : ""}${
        node.attrs?.rowspan ? ` rowspan="${node.attrs.rowspan}"` : ""
      }>${serializeChildren(node)}</td>`;
    case "tableHeader":
      return `<th${node.attrs?.colspan ? ` colspan="${node.attrs.colspan}"` : ""}${
        node.attrs?.rowspan ? ` rowspan="${node.attrs.rowspan}"` : ""
      }>${serializeChildren(node)}</th>`;
    case "panel": {
      const panelType = escapeHtml(String(node.attrs?.panelType ?? "info"));
      return `<ac:structured-macro ac:name="${panelType}"><ac:rich-text-body>${serializeChildren(node)}</ac:rich-text-body></ac:structured-macro>`;
    }
    default:
      return serializeChildren(node);
  }
}

export function tiptapDocToStorageFormat(doc: JSONContent): string {
  return serializeChildren(doc);
}
