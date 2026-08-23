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

const MARK_TAGS: Record<string, (attrs: Record<string, unknown> | undefined) => [string, string]> = {
  bold: () => ["<strong>", "</strong>"],
  italic: () => ["<em>", "</em>"],
  strike: () => ["<s>", "</s>"],
  link: (attrs) => [`<a href="${escapeHtml(String(attrs?.href ?? ""))}">`, "</a>"],
  textStyle: (attrs) =>
    attrs?.color
      ? [`<span style="color:${escapeHtml(String(attrs.color))}">`, "</span>"]
      : ["", ""],
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
    case "image":
      return `<ac:image><ri:attachment ri:filename="${escapeHtml(String(node.attrs?.filename ?? ""))}" /></ac:image>`;
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
      const panelType = String(node.attrs?.panelType ?? "info");
      return `<ac:structured-macro ac:name="${panelType}"><ac:rich-text-body>${serializeChildren(node)}</ac:rich-text-body></ac:structured-macro>`;
    }
    default:
      return serializeChildren(node);
  }
}

export function tiptapDocToStorageFormat(doc: JSONContent): string {
  return serializeChildren(doc);
}
