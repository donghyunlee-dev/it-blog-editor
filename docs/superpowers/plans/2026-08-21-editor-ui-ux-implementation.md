# 에디터 UI/UX 개편 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 편집 화면을 TipTap 기반 WYSIWYG 에디터(슬래시 메뉴·버블 툴바·표/색상/패널 지원)로 바꾸고, 좌측 사이드바 앱 셸·태그 칩·뷰어별 게시 카드·`@sfood/ui` 디자인 시스템을 도입한다.

**Architecture:** 문서 원본을 TipTap JSON(`sourceDocument` property)으로 저장하고, 자체 변환기(`tiptap-to-storage`)로 Confluence storage format을 생성한다. 화면은 `@sfood/ui` 컴포넌트로 구성하고, `/editor/**`는 공통 사이드바 레이아웃 하위에서 렌더링된다. 기존 계층 구조(`confluence/client.ts` → `editor/*.ts` → `app/api/editor/**` → `app/editor/**`/`components/editor/*`)를 그대로 따른다.

**Tech Stack:** TipTap(ProseMirror), `@sfood/ui` + Tailwind CSS, Vitest(기존 노드 테스트) + React Testing Library(신규, 컴포넌트 테스트), Next.js 16(App Router).

**Spec:** [docs/superpowers/specs/2026-08-21-editor-ui-ux-design.md](../specs/2026-08-21-editor-ui-ux-design.md)

## Global Constraints

- 1차 지원 서식만 구현한다: 제목(H1~H3), 굵게/기울임/취소선, 목록, 인용문, 코드블록, 링크, 이미지, 글자 색상, 하이라이트, 표(+셀 병합/분할), 정보/경고/노트 패널. 그 외 서식·매크로는 범위 밖이다.
- 저장은 수동 유지 — 자동저장을 추가하지 않는다. 기존 버전 기반 동시수정 충돌(409) 처리를 그대로 재사용한다.
- 화면은 직접 마크업하지 않고 `@sfood/ui` 컴포넌트/템플릿을 우선 사용한다(`docs/product/design.md` 매핑 표 참고). 커스텀 색상은 하드코딩하지 않고 CSS Variables/Tailwind 토큰 클래스로 참조한다.
- 한 화면에 `Button variant="primary"`는 1개만 둔다. 삭제 확인은 `window.confirm()` 대신 `Modal`, 저장 성공/실패 안내는 인라인 텍스트 대신 `Toast`를 쓴다.
- 댓글(footer comment) 관련 UI는 이 플랜의 범위 밖이다.
- 이 플랜은 이미 실행 완료된 `docs/superpowers/plans/2026-08-21-confluence-content-structure-implementation.md`(초안/게시 생명주기, 태그 저장, restriction)와 독립적으로 실행 가능하다 — 서로 다른 파일을 다루거나, 같은 파일(`documents.ts`, `publish.ts`)이라도 다른 필드를 다룬다.

---

## Task 1: Tailwind CSS + `@sfood/ui` 설치

**Files:**
- Modify: `package.json`
- Create: `tailwind.config.js`
- Modify: `src/app/layout.tsx`
- Modify: `src/app/globals.css`

**Interfaces:**
- Consumes: 없음
- Produces: Tailwind 유틸리티 클래스·`@sfood/ui` 컴포넌트를 어디서나 import할 수 있는 상태 — 이후 모든 화면 작업(Task 7 이후 UI 작업)이 이 설정에 의존한다.

- [ ] **Step 1: 패키지 설치**

```bash
npm install @sfood/ui
npm install --save-dev tailwindcss postcss autoprefixer
```

- [ ] **Step 2: `tailwind.config.js` 작성**

```js
import sfoodPreset from '@sfood/ui/tailwind.config.js'

export default {
  presets: [sfoodPreset],
  content: [
    './src/**/*.{ts,tsx}',
    './node_modules/@sfood/ui/dist/**/*.js',
  ],
}
```

- [ ] **Step 3: `postcss.config.js` 작성**

```js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

- [ ] **Step 4: 글로벌 CSS에 Tailwind·디자인 시스템 CSS 추가**

`src/app/globals.css` 최상단(기존 `:root { ... }` 위)에 추가:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

`src/app/layout.tsx`의 `import "./globals.css";` 아래에 추가:

```ts
import "@sfood/ui/global.css";
```

- [ ] **Step 5: 개발 서버로 확인**

```bash
npm run dev
```

`/login` 페이지가 에러 없이 뜨는지, 브라우저 개발자 도구에서 Tailwind 유틸리티 클래스(예: 임시로 `className="text-brand"`를 아무 엘리먼트에 붙여서)가 실제로 적용되는지 확인한다. 확인 후 임시로 붙인 클래스는 제거한다.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json tailwind.config.js postcss.config.js src/app/layout.tsx src/app/globals.css
git commit -m "chore: install Tailwind CSS and @sfood/ui"
```

---

## Task 2: TipTap 설치 + 에디터 뼈대(기본 서식)

**Files:**
- Create: `src/components/editor/RichTextEditor.tsx`
- Modify: `package.json`

**Interfaces:**
- Consumes: `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-link`
- Produces: `export interface RichTextEditorProps { content: JSONContent; onChange: (doc: JSONContent) => void }`, `export function RichTextEditor(props: RichTextEditorProps): JSX.Element` — Task 7·8·9·10·11·16이 이 컴포넌트를 확장한다.

- [ ] **Step 1: 패키지 설치**

```bash
npm install @tiptap/react @tiptap/core @tiptap/pm @tiptap/starter-kit @tiptap/extension-link
```

- [ ] **Step 2: `RichTextEditor.tsx` 작성**

```tsx
// src/components/editor/RichTextEditor.tsx
"use client";

import { EditorContent, useEditor, type JSONContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";

export interface RichTextEditorProps {
  content: JSONContent;
  onChange: (doc: JSONContent) => void;
}

export function RichTextEditor({ content, onChange }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Link.configure({ openOnClick: false }),
    ],
    content,
    onUpdate: ({ editor: currentEditor }) => {
      onChange(currentEditor.getJSON());
    },
    immediatelyRender: false,
  });

  return <EditorContent editor={editor} className="prose max-w-none" />;
}
```

- [ ] **Step 3: 개발 서버로 확인**

`RichTextEditor`를 아무 페이지(예: `/editor/new`)에 임시로 렌더링해 타이핑, 굵게(`Ctrl+B`), 제목, 목록, 인용, 코드블록, 링크가 정상 동작하는지 확인한다. 확인 후 임시 렌더링 코드는 제거한다(Task 6에서 실제로 연결한다).

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json src/components/editor/RichTextEditor.tsx
git commit -m "feat: add base TipTap rich text editor"
```

---

## Task 3: `tiptap-to-storage` 변환기 (1/3) — 기본 노드/마크

**Files:**
- Create: `src/lib/editor/tiptap-to-storage.ts`
- Test: `src/lib/editor/tiptap-to-storage.test.ts`

**Interfaces:**
- Consumes: 없음(순수 함수)
- Produces: `export function tiptapDocToStorageFormat(doc: JSONContent): string` — Task 4·5가 이 함수에 케이스를 추가하고, Task 6(`documents.ts`)이 이 함수를 사용한다.

- [ ] **Step 1: 실패하는 테스트 작성**

```ts
// src/lib/editor/tiptap-to-storage.test.ts
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
```

- [ ] **Step 2: 테스트 실행 → 실패 확인**

Run: `npm test -- tiptap-to-storage.test.ts`
Expected: FAIL (`./tiptap-to-storage` 모듈 없음)

- [ ] **Step 3: 구현**

```ts
// src/lib/editor/tiptap-to-storage.ts
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
};

function serializeText(node: JSONContent): string {
  let html = escapeHtml(node.text ?? "");
  for (const mark of node.marks ?? []) {
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
    default:
      return serializeChildren(node);
  }
}

export function tiptapDocToStorageFormat(doc: JSONContent): string {
  return serializeChildren(doc);
}
```

- [ ] **Step 4: 테스트 실행 → 통과 확인**

Run: `npm test -- tiptap-to-storage.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/editor/tiptap-to-storage.ts src/lib/editor/tiptap-to-storage.test.ts
git commit -m "feat: add base tiptap-to-storage converter"
```

---

## Task 4: `tiptap-to-storage` 변환기 (2/3) — 이미지·글자색·하이라이트

**Files:**
- Modify: `src/lib/editor/tiptap-to-storage.ts`
- Test: `src/lib/editor/tiptap-to-storage.test.ts`

**Interfaces:**
- Consumes: `buildAttachmentImageReference`가 아니라, 이미지 노드의 `filename` 속성을 직접 `<ac:image>`로 변환한다(에디터가 이미지 노드에 `src`(미리보기용 실제 URL)와 `filename`(Confluence 첨부파일명)을 함께 저장하기 때문 — Task 11에서 이 두 속성을 채운다).
- Produces: `serializeNode`에 `image` 케이스, `MARK_TAGS`에 `textStyle` 케이스 추가.

- [ ] **Step 1: 실패하는 테스트 작성 (기존 파일에 추가)**

```ts
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
```

- [ ] **Step 2: 테스트 실행 → 실패 확인**

Run: `npm test -- tiptap-to-storage.test.ts`
Expected: FAIL

- [ ] **Step 3: 구현 추가**

`MARK_TAGS`에 두 항목 추가:

```ts
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
```

`serializeNode`의 `switch`에 케이스 추가:

```ts
    case "image":
      return `<ac:image><ri:attachment ri:filename="${escapeHtml(String(node.attrs?.filename ?? ""))}" /></ac:image>`;
```

- [ ] **Step 4: 테스트 실행 → 통과 확인**

Run: `npm test -- tiptap-to-storage.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/editor/tiptap-to-storage.ts src/lib/editor/tiptap-to-storage.test.ts
git commit -m "feat: convert image, text color, and highlight to storage format"
```

---

## Task 5: `tiptap-to-storage` 변환기 (3/3) — 표(+병합)·패널 매크로

**Files:**
- Modify: `src/lib/editor/tiptap-to-storage.ts`
- Test: `src/lib/editor/tiptap-to-storage.test.ts`

**Interfaces:**
- Consumes: 없음
- Produces: `serializeNode`에 `table`/`tableRow`/`tableCell`/`tableHeader`/`panel` 케이스 추가. 이 변환기는 이제 1차 지원 서식 전체를 처리한다 — Task 6이 이 완성된 함수를 사용한다.

- [ ] **Step 1: 실패하는 테스트 작성**

```ts
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
```

- [ ] **Step 2: 테스트 실행 → 실패 확인**

Run: `npm test -- tiptap-to-storage.test.ts`
Expected: FAIL

- [ ] **Step 3: 구현 추가**

`serializeNode`의 `switch`에 케이스 추가:

```ts
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
```

- [ ] **Step 4: 테스트 실행 → 통과 확인**

Run: `npm test -- tiptap-to-storage.test.ts`
Expected: PASS (Task 3~5 테스트 전체)

- [ ] **Step 5: Commit**

```bash
git add src/lib/editor/tiptap-to-storage.ts src/lib/editor/tiptap-to-storage.test.ts
git commit -m "feat: convert tables with merged cells and panel macros"
```

---

## Task 6: `documents.ts` + API 라우트 — `doc`(JSONContent) 기반 전환

**Files:**
- Modify: `src/lib/editor/documents.ts` (전체 재작성)
- Modify: `src/app/api/editor/documents/route.ts`
- Modify: `src/app/api/editor/documents/[pageId]/route.ts`
- Test: `src/lib/editor/documents.test.ts` (기존 테스트 갱신)

**Interfaces:**
- Consumes: `tiptapDocToStorageFormat`(Task 3~5), `hidePageFromOthers`(1차 플랜의 `access.ts`)
- Produces: `export interface CreateDocumentInput { folderId: string; title: string; doc: JSONContent; actualAuthorEmail: string }`, `export interface UpdateDocumentInput { pageId: string; title: string; doc: JSONContent; expectedVersion: number }`, `export interface DocumentDetail { pageId: string; title: string; doc: JSONContent; version: number }` — API 라우트와 Task 16(에디터 화면)이 이 타입을 사용한다.

- [ ] **Step 1: 실패하는 테스트 작성 (기존 `documents.test.ts`를 아래로 교체)**

```ts
// src/lib/editor/documents.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as client from "@/lib/confluence/client";
import * as access from "./access";
import { createDocument, getDocumentDetail, updateDocument } from "./documents";

const SAMPLE_DOC = { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "본문" }] }] };

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("createDocument", () => {
  it("doc을 storage format으로 변환해 페이지를 만들고 sourceDocument에 원본을 저장한다", async () => {
    vi.spyOn(client, "getConfiguredSpace").mockResolvedValue({
      id: "space-1",
      key: "SFOODIT",
      homepageId: "home-1",
    });
    vi.spyOn(client, "createPage").mockResolvedValue({
      id: "doc-1",
      status: "current",
      title: "제목",
      spaceId: "space-1",
      parentId: "folder-1",
      version: { number: 1, createdAt: "" },
    });
    const upsertSpy = vi.spyOn(client, "upsertPageProperty").mockResolvedValue({
      id: "prop-1",
      key: "authorMeta",
      value: {},
      version: { number: 1 },
    });
    vi.spyOn(access, "hidePageFromOthers").mockResolvedValue(undefined);

    const result = await createDocument({
      folderId: "folder-1",
      title: "제목",
      doc: SAMPLE_DOC,
      actualAuthorEmail: "user@s-food.com",
    });

    expect(client.createPage).toHaveBeenCalledWith({
      spaceId: "space-1",
      parentId: "folder-1",
      title: "제목",
      bodyValue: "<p>본문</p>",
    });
    expect(upsertSpy).toHaveBeenCalledWith("doc-1", "sourceDocument", { doc: SAMPLE_DOC });
    expect(result).toEqual({ pageId: "doc-1", version: 1 });
  });
});

describe("getDocumentDetail", () => {
  it("sourceDocument property에서 편집 원본을 읽어온다", async () => {
    vi.spyOn(client, "getPage").mockResolvedValue({
      id: "doc-1",
      status: "current",
      title: "제목",
      spaceId: "space-1",
      parentId: "folder-1",
      version: { number: 2, createdAt: "" },
    });
    vi.spyOn(client, "getPageProperty").mockResolvedValue({
      id: "prop-1",
      key: "sourceDocument",
      value: { doc: SAMPLE_DOC },
      version: { number: 1 },
    });

    const detail = await getDocumentDetail("doc-1");

    expect(detail).toEqual({ pageId: "doc-1", title: "제목", doc: SAMPLE_DOC, version: 2 });
  });
});

describe("updateDocument", () => {
  it("버전이 일치하면 doc을 갱신한다", async () => {
    vi.spyOn(client, "getPage").mockResolvedValue({
      id: "doc-1",
      status: "current",
      title: "제목",
      spaceId: "space-1",
      parentId: "folder-1",
      version: { number: 1, createdAt: "" },
    });
    vi.spyOn(client, "updatePage").mockResolvedValue({
      id: "doc-1",
      status: "current",
      title: "새 제목",
      spaceId: "space-1",
      parentId: "folder-1",
      version: { number: 2, createdAt: "" },
    });
    const upsertSpy = vi.spyOn(client, "upsertPageProperty").mockResolvedValue({
      id: "prop-1",
      key: "sourceDocument",
      value: {},
      version: { number: 1 },
    });

    const result = await updateDocument({
      pageId: "doc-1",
      title: "새 제목",
      doc: SAMPLE_DOC,
      expectedVersion: 1,
    });

    expect(upsertSpy).toHaveBeenCalledWith("doc-1", "sourceDocument", { doc: SAMPLE_DOC });
    expect(result).toEqual({ pageId: "doc-1", version: 2 });
  });
});
```

- [ ] **Step 2: 테스트 실행 → 실패 확인**

Run: `npm test -- documents.test.ts`
Expected: FAIL (기존 코드는 `markdown`/`sourceMarkdown` 기반)

- [ ] **Step 3: `documents.ts` 전체 교체**

```ts
// src/lib/editor/documents.ts
import {
  ConfluenceApiError,
  createPage,
  deletePage,
  getConfiguredSpace,
  getPage,
  getPageProperty,
  listChildPages,
  updatePage,
  upsertPageProperty,
} from "@/lib/confluence/client";
import { hidePageFromOthers } from "./access";
import { ConflictError, NotFoundError, ValidationError } from "./errors";
import { tiptapDocToStorageFormat, type JSONContent } from "./tiptap-to-storage";

const SOURCE_DOCUMENT_PROPERTY_KEY = "sourceDocument";

export interface DocumentSummary {
  pageId: string;
  title: string;
  updatedAt: string;
}

export interface DocumentDetail {
  pageId: string;
  title: string;
  doc: JSONContent;
  version: number;
}

async function getPageOrThrow(pageId: string) {
  try {
    return await getPage(pageId);
  } catch (error) {
    if (error instanceof ConfluenceApiError && error.status === 404) {
      throw new NotFoundError("문서를 찾을 수 없습니다.");
    }
    throw error;
  }
}

/** 개인 폴더 하위 문서 목록을 조회한다. */
export async function listDocuments(folderId: string): Promise<DocumentSummary[]> {
  const pages = await listChildPages(folderId);
  return pages.map((page) => ({
    pageId: page.id,
    title: page.title,
    updatedAt: page.version.createdAt,
  }));
}

/**
 * 편집 화면에 필요한 문서 상세를 조회한다. Confluence 페이지의 body(storage format)는
 * 렌더링용 산출물이므로, 편집 원본은 별도 content property(sourceDocument)에서 가져온다.
 */
export async function getDocumentDetail(pageId: string): Promise<DocumentDetail> {
  const page = await getPageOrThrow(pageId);
  const sourceProperty = await getPageProperty<{ doc: JSONContent }>(
    pageId,
    SOURCE_DOCUMENT_PROPERTY_KEY
  );

  return {
    pageId: page.id,
    title: page.title,
    doc: sourceProperty?.value.doc ?? { type: "doc", content: [] },
    version: page.version.number,
  };
}

export interface CreateDocumentInput {
  folderId: string;
  title: string;
  doc: JSONContent;
  actualAuthorEmail: string;
}

/** 개인 폴더 하위에 신규 문서(Confluence 페이지)를 생성한다. */
export async function createDocument(input: CreateDocumentInput) {
  if (!input.title.trim()) {
    throw new ValidationError("제목이 누락되었습니다.");
  }

  const space = await getConfiguredSpace();
  const page = await createPage({
    spaceId: space.id,
    parentId: input.folderId,
    title: input.title,
    bodyValue: tiptapDocToStorageFormat(input.doc),
  });

  await Promise.all([
    upsertPageProperty(page.id, "authorMeta", {
      actualAuthorEmail: input.actualAuthorEmail,
    }),
    upsertPageProperty(page.id, SOURCE_DOCUMENT_PROPERTY_KEY, { doc: input.doc }),
    hidePageFromOthers(page.id),
  ]);

  return { pageId: page.id, version: page.version.number };
}

export interface UpdateDocumentInput {
  pageId: string;
  title: string;
  doc: JSONContent;
  expectedVersion: number;
}

/** 기존 문서를 수정한다. 요청한 버전이 최신이 아니면 ConflictError(409)를 던진다. */
export async function updateDocument(input: UpdateDocumentInput) {
  if (!input.title.trim()) {
    throw new ValidationError("제목이 누락되었습니다.");
  }

  const current = await getPageOrThrow(input.pageId);
  if (current.version.number !== input.expectedVersion) {
    throw new ConflictError(
      `문서가 이미 최신 버전(${current.version.number})으로 변경되었습니다. 최신 내용을 확인한 뒤 다시 저장하세요.`
    );
  }

  const updated = await updatePage({
    pageId: input.pageId,
    title: input.title,
    bodyValue: tiptapDocToStorageFormat(input.doc),
    nextVersion: current.version.number + 1,
  });

  await upsertPageProperty(input.pageId, SOURCE_DOCUMENT_PROPERTY_KEY, { doc: input.doc });

  return { pageId: updated.id, version: updated.version.number };
}

/** 문서를 삭제한다(Confluence 휴지통으로 이동). */
export async function deleteDocument(pageId: string): Promise<void> {
  await getPageOrThrow(pageId);
  await deletePage(pageId);
}
```

- [ ] **Step 4: API 라우트 갱신**

`src/app/api/editor/documents/route.ts`의 `POST` 핸들러 중 payload 파싱 부분을 교체:

```ts
    const payload = (await request.json()) as {
      title?: string;
      doc?: unknown;
    };

    const result = await createDocument({
      folderId: folder.folderId,
      title: payload.title ?? "",
      doc: (payload.doc as never) ?? { type: "doc", content: [] },
      actualAuthorEmail: email,
    });
```

`src/app/api/editor/documents/[pageId]/route.ts`의 `PUT` 핸들러 중 payload 파싱 부분을 교체:

```ts
    const payload = (await request.json()) as {
      title?: string;
      doc?: unknown;
      version?: number;
    };

    if (typeof payload.version !== "number") {
      throw new ValidationError("version 값은 필수입니다.");
    }

    const result = await updateDocument({
      pageId,
      title: payload.title ?? "",
      doc: (payload.doc as never) ?? { type: "doc", content: [] },
      expectedVersion: payload.version,
    });
```

- [ ] **Step 5: 테스트 실행 → 통과 확인**

Run: `npm test -- documents.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/lib/editor/documents.ts src/lib/editor/documents.test.ts src/app/api/editor/documents/route.ts "src/app/api/editor/documents/[pageId]/route.ts"
git commit -m "feat: store document source as TipTap JSON instead of Markdown"
```

---

## Task 7: 에디터에 색상·하이라이트·표·패널 익스텐션 연결

**Files:**
- Modify: `src/components/editor/RichTextEditor.tsx`
- Modify: `package.json`

**Interfaces:**
- Consumes: 없음(패키지 추가)
- Produces: `RichTextEditor`가 1차 지원 서식 전체(색상/하이라이트/표/병합/패널)를 편집 가능하게 함 — Task 8·9·10이 이 위에 상호작용을 얹는다.

- [ ] **Step 1: 패키지 설치**

```bash
npm install @tiptap/extension-color @tiptap/extension-text-style @tiptap/extension-highlight @tiptap/extension-image @tiptap/extension-table @tiptap/extension-table-row @tiptap/extension-table-header @tiptap/extension-table-cell
```

- [ ] **Step 2: `Image` 확장 — 첨부파일명 속성 추가**

`RichTextEditor.tsx` 상단에 커스텀 이미지 확장을 추가한다:

```tsx
import TiptapImage from "@tiptap/extension-image";

const AttachmentImage = TiptapImage.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      filename: { default: null },
    };
  },
});
```

- [ ] **Step 3: `Panel` 커스텀 노드 추가**

```tsx
import { Node } from "@tiptap/core";

const Panel = Node.create({
  name: "panel",
  group: "block",
  content: "block+",
  addAttributes() {
    return { panelType: { default: "info" } };
  },
  parseHTML() {
    return [{ tag: "div[data-panel-type]", getAttrs: (el) => ({ panelType: (el as HTMLElement).getAttribute("data-panel-type") }) }];
  },
  renderHTML({ node }) {
    return ["div", { "data-panel-type": node.attrs.panelType, class: `panel panel-${node.attrs.panelType}` }, 0];
  },
});
```

- [ ] **Step 4: 익스텐션 목록에 추가**

```tsx
import Color from "@tiptap/extension-color";
import TextStyle from "@tiptap/extension-text-style";
import Highlight from "@tiptap/extension-highlight";
import Table from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableHeader from "@tiptap/extension-table-header";
import TableCell from "@tiptap/extension-table-cell";
```

`useEditor`의 `extensions` 배열에 추가:

```tsx
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      AttachmentImage,
      Panel,
      Table.configure({ resizable: false }),
      TableRow,
      TableHeader,
      TableCell,
```

- [ ] **Step 5: 개발 서버로 확인**

`npm run dev`로 편집 화면(임시 렌더링 유지)에서 글자색·하이라이트 적용, 표 삽입 후 셀 두 개를 선택해 `editor.commands.mergeCells()`를 콘솔에서 직접 호출해 병합되는지, 패널 노드가 `editor.commands.insertContent({ type: "panel", attrs: { panelType: "warning" }, content: [...] })`로 삽입되는지 확인한다(실제 UI 버튼은 Task 9·10에서 연결).

- [ ] **Step 6: Commit**

```bash
git add src/components/editor/RichTextEditor.tsx package.json package-lock.json
git commit -m "feat: enable color, highlight, table merge, and panel extensions"
```

---

## Task 8: 버블 툴바

**Files:**
- Modify: `src/components/editor/RichTextEditor.tsx`
- Modify: `package.json`

**Interfaces:**
- Consumes: `RichTextEditor`(Task 2, 7)
- Produces: 텍스트 선택 시 굵게/기울임/취소선/글자색/하이라이트/링크 버튼이 뜨는 버블 툴바.

- [ ] **Step 1: 패키지 설치**

```bash
npm install @tiptap/extension-bubble-menu
```

- [ ] **Step 2: 버블 툴바 컴포넌트 추가**

`RichTextEditor.tsx`에 추가:

```tsx
import { BubbleMenu } from "@tiptap/react";
import { Button } from "@sfood/ui";

function EditorBubbleMenu({ editor }: { editor: ReturnType<typeof useEditor> }) {
  if (!editor) return null;

  return (
    <BubbleMenu editor={editor} tippyOptions={{ duration: 100 }}>
      <div className="flex gap-1 rounded-md border border-border bg-surface p-1 shadow-md">
        <Button
          variant={editor.isActive("bold") ? "primary" : "secondary"}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          B
        </Button>
        <Button
          variant={editor.isActive("italic") ? "primary" : "secondary"}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          I
        </Button>
        <Button
          variant={editor.isActive("strike") ? "primary" : "secondary"}
          onClick={() => editor.chain().focus().toggleStrike().run()}
        >
          S
        </Button>
        <input
          type="color"
          aria-label="글자 색상"
          onChange={(event) => editor.chain().focus().setColor(event.target.value).run()}
        />
        <input
          type="color"
          aria-label="하이라이트"
          onChange={(event) => editor.chain().focus().toggleHighlight({ color: event.target.value }).run()}
        />
        <Button
          variant="secondary"
          onClick={() => {
            const href = window.prompt("링크 URL");
            if (href) editor.chain().focus().setLink({ href }).run();
          }}
        >
          링크
        </Button>
      </div>
    </BubbleMenu>
  );
}
```

`RichTextEditor`의 반환 JSX를 아래로 교체:

```tsx
  return (
    <>
      {editor && <EditorBubbleMenu editor={editor} />}
      <EditorContent editor={editor} className="prose max-w-none" />
    </>
  );
```

- [ ] **Step 3: 개발 서버로 확인**

텍스트를 드래그해서 선택하면 버블 툴바가 뜨는지, 각 버튼이 실제로 서식을 적용/해제하는지 확인한다.

- [ ] **Step 4: Commit**

```bash
git add src/components/editor/RichTextEditor.tsx package.json package-lock.json
git commit -m "feat: add bubble toolbar for inline formatting"
```

---

## Task 9: 슬래시 메뉴

**Files:**
- Create: `src/components/editor/SlashCommandExtension.ts`
- Modify: `src/components/editor/RichTextEditor.tsx`
- Modify: `package.json`

**Interfaces:**
- Consumes: `@tiptap/suggestion`, `tippy.js`
- Produces: `export const SlashCommandExtension: Extension` — `RichTextEditor`가 이 익스텐션을 사용한다. 새 줄에서 `/`를 입력하면 블록 삽입 메뉴가 뜬다.

- [ ] **Step 1: 패키지 설치**

```bash
npm install @tiptap/suggestion tippy.js
```

- [ ] **Step 2: 슬래시 메뉴 익스텐션 작성**

```ts
// src/components/editor/SlashCommandExtension.ts
import { Extension } from "@tiptap/core";
import Suggestion from "@tiptap/suggestion";
import tippy, { type Instance } from "tippy.js";

interface CommandItem {
  title: string;
  run: (editor: import("@tiptap/core").Editor, range: { from: number; to: number }) => void;
}

const ITEMS: CommandItem[] = [
  { title: "제목 1", run: (editor, range) => editor.chain().focus().deleteRange(range).setNode("heading", { level: 1 }).run() },
  { title: "제목 2", run: (editor, range) => editor.chain().focus().deleteRange(range).setNode("heading", { level: 2 }).run() },
  { title: "글머리 목록", run: (editor, range) => editor.chain().focus().deleteRange(range).toggleBulletList().run() },
  { title: "표", run: (editor, range) => editor.chain().focus().deleteRange(range).insertTable({ rows: 2, cols: 2 }).run() },
  { title: "코드블록", run: (editor, range) => editor.chain().focus().deleteRange(range).toggleCodeBlock().run() },
  {
    title: "정보 패널",
    run: (editor, range) =>
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .insertContent({ type: "panel", attrs: { panelType: "info" }, content: [{ type: "paragraph" }] })
        .run(),
  },
  {
    title: "경고 패널",
    run: (editor, range) =>
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .insertContent({ type: "panel", attrs: { panelType: "warning" }, content: [{ type: "paragraph" }] })
        .run(),
  },
  {
    title: "노트 패널",
    run: (editor, range) =>
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .insertContent({ type: "panel", attrs: { panelType: "note" }, content: [{ type: "paragraph" }] })
        .run(),
  },
];

export const SlashCommandExtension = Extension.create({
  name: "slashCommand",
  addOptions() {
    return {
      suggestion: {
        char: "/",
        items: ({ query }: { query: string }) =>
          ITEMS.filter((item) => item.title.toLowerCase().includes(query.toLowerCase())),
        render: () => {
          let popup: Instance;
          let menuEl: HTMLDivElement;

          return {
            onStart: (props: any) => {
              menuEl = document.createElement("div");
              menuEl.className = "rounded-md border border-border bg-surface shadow-md p-1";
              props.items.forEach((item: CommandItem) => {
                const button = document.createElement("button");
                button.textContent = item.title;
                button.className = "block w-full text-left px-2 py-1 hover:bg-surface-subtle";
                button.onclick = () => item.run(props.editor, props.range);
                menuEl.appendChild(button);
              });

              popup = tippy(document.body, {
                getReferenceClientRect: props.clientRect,
                appendTo: () => document.body,
                content: menuEl,
                showOnCreate: true,
                interactive: true,
                trigger: "manual",
                placement: "bottom-start",
              });
            },
            onUpdate: (props: any) => {
              popup.setProps({ getReferenceClientRect: props.clientRect });
            },
            onExit: () => {
              popup.destroy();
            },
          };
        },
      },
    };
  },
  addProseMirrorPlugins() {
    return [Suggestion({ editor: this.editor, ...this.options.suggestion })];
  },
});
```

- [ ] **Step 3: `RichTextEditor`에 연결**

```tsx
import { SlashCommandExtension } from "./SlashCommandExtension";
```

`extensions` 배열에 `SlashCommandExtension` 추가.

- [ ] **Step 4: 개발 서버로 확인**

새 줄에서 `/`를 입력하면 메뉴가 뜨는지, "표"를 클릭하면 2x2 표가 삽입되는지, "경고 패널"을 클릭하면 패널 블록이 삽입되는지 확인한다.

- [ ] **Step 5: Commit**

```bash
git add src/components/editor/SlashCommandExtension.ts src/components/editor/RichTextEditor.tsx package.json package-lock.json
git commit -m "feat: add slash command menu for block insertion"
```

---

## Task 10: 표 병합/분할 컨트롤

**Files:**
- Modify: `src/components/editor/RichTextEditor.tsx`

**Interfaces:**
- Consumes: `RichTextEditor`(Task 7의 Table 익스텐션)
- Produces: 커서가 표 안에 있을 때만 보이는 "셀 병합"/"셀 분할" 버튼.

- [ ] **Step 1: 표 컨트롤 바 추가**

`EditorBubbleMenu` 아래, `RichTextEditor`의 반환 JSX에 추가:

```tsx
function TableControls({ editor }: { editor: ReturnType<typeof useEditor> }) {
  if (!editor || !editor.isActive("table")) return null;

  return (
    <div className="flex gap-1 border border-border bg-surface p-1">
      <Button
        variant="secondary"
        disabled={!editor.can().mergeCells()}
        onClick={() => editor.chain().focus().mergeCells().run()}
      >
        셀 병합
      </Button>
      <Button
        variant="secondary"
        disabled={!editor.can().splitCell()}
        onClick={() => editor.chain().focus().splitCell().run()}
      >
        셀 분할
      </Button>
    </div>
  );
}
```

`RichTextEditor`의 반환 JSX를 아래로 교체:

```tsx
  return (
    <>
      {editor && <EditorBubbleMenu editor={editor} />}
      {editor && <TableControls editor={editor} />}
      <EditorContent editor={editor} className="prose max-w-none" />
    </>
  );
```

- [ ] **Step 2: 개발 서버로 확인**

표를 삽입하고 커서를 표 안에 두면 "셀 병합"/"셀 분할" 버튼이 나타나는지, 표 밖으로 커서를 옮기면 사라지는지, 셀 두 개를 선택한 상태에서 "셀 병합"을 누르면 실제로 병합되는지 확인한다.

- [ ] **Step 3: Commit**

```bash
git add src/components/editor/RichTextEditor.tsx
git commit -m "feat: add table cell merge/split controls"
```

---

## Task 11: 이미지 붙여넣기/드래그앤드롭 업로드

**Files:**
- Modify: `src/components/editor/RichTextEditor.tsx`

**Interfaces:**
- Consumes: `POST /api/editor/documents/{pageId}/images`(기존 API, 변경 없음)
- Produces: `RichTextEditorProps`에 `pageId?: string` 추가. `pageId`가 있을 때만 붙여넣기/드래그앤드롭 업로드가 활성화된다(새 문서는 저장 전이라 첨부 대상 페이지가 없음 — 기존 코드의 "문서를 먼저 저장해야 이미지 등록 가능" 제약과 동일하게 유지).

- [ ] **Step 1: 업로드 핸들러 추가**

`RichTextEditor.tsx`에 추가:

```tsx
export interface RichTextEditorProps {
  content: JSONContent;
  onChange: (doc: JSONContent) => void;
  pageId?: string;
}

async function uploadImage(pageId: string, file: File): Promise<{ url: string; filename: string }> {
  const form = new FormData();
  form.append("file", file);
  const response = await fetch(`/api/editor/documents/${pageId}/images`, {
    method: "POST",
    body: form,
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error?.message ?? "이미지 업로드에 실패했습니다.");
  }
  return { url: data.url, filename: file.name };
}
```

`RichTextEditor` 함수 본문에서 `useEditor` 호출에 `editorProps` 옵션을 추가:

```tsx
export function RichTextEditor({ content, onChange, pageId }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [/* 기존과 동일 */],
    content,
    onUpdate: ({ editor: currentEditor }) => onChange(currentEditor.getJSON()),
    immediatelyRender: false,
    editorProps: {
      handleDrop: (view, event) => {
        const file = event.dataTransfer?.files?.[0];
        if (!file || !pageId) return false;
        event.preventDefault();
        uploadImage(pageId, file).then(({ url, filename }) => {
          const { schema } = view.state;
          const node = schema.nodes.image.create({ src: url, filename });
          const transaction = view.state.tr.insert(view.state.selection.from, node);
          view.dispatch(transaction);
        });
        return true;
      },
      handlePaste: (view, event) => {
        const file = event.clipboardData?.files?.[0];
        if (!file || !file.type.startsWith("image/") || !pageId) return false;
        event.preventDefault();
        uploadImage(pageId, file).then(({ url, filename }) => {
          const { schema } = view.state;
          const node = schema.nodes.image.create({ src: url, filename });
          const transaction = view.state.tr.insert(view.state.selection.from, node);
          view.dispatch(transaction);
        });
        return true;
      },
    },
  });
  // ...
}
```

- [ ] **Step 2: 개발 서버로 확인**

저장된 문서(`pageId`가 있는 상태)에서 이미지 파일을 에디터 영역에 드래그하거나 클립보드에서 붙여넣었을 때 업로드 후 그 위치에 이미지가 삽입되는지 확인한다. 새 문서(저장 전, `pageId` 없음)에서는 드롭/붙여넣기가 무시되는지도 확인한다.

- [ ] **Step 3: Commit**

```bash
git add src/components/editor/RichTextEditor.tsx
git commit -m "feat: upload images via drag-and-drop and paste"
```

---

## Task 12: `listDocuments` 개편(`isPublished`/`tags`) + GET 라우트 갱신

**Files:**
- Modify: `src/lib/editor/documents.ts` (`listDocuments`)
- Modify: `src/app/api/editor/documents/route.ts` (`GET` 핸들러는 변경 없음 — 응답 필드만 늘어남)
- Test: `src/lib/editor/documents.test.ts`

**Interfaces:**
- Consumes: `getPublishState`(1차 플랜의 `publish.ts`), `getTags`(1차 플랜의 `tags.ts`)
- Produces: `DocumentSummary`에 `isPublished: boolean`, `tags: string[]` 필드 추가 — Task 14(사이드바)가 이 필드를 사용한다.

- [ ] **Step 1: 실패하는 테스트 작성 (기존 `documents.test.ts`에 추가)**

```ts
import * as publish from "./publish";
import * as tags from "./tags";
import { listDocuments } from "./documents";

describe("listDocuments", () => {
  it("각 문서의 게시 상태와 태그를 함께 반환한다", async () => {
    vi.spyOn(client, "listChildPages").mockResolvedValue([
      { id: "doc-1", status: "current", title: "문서1", spaceId: "space-1", parentId: "folder-1", version: { number: 1, createdAt: "2026-08-21T00:00:00.000Z" } },
    ]);
    vi.spyOn(publish, "getPublishState").mockResolvedValue({ isPublished: true, viewers: {} });
    vi.spyOn(tags, "getTags").mockResolvedValue(["React"]);

    const documents = await listDocuments("folder-1");

    expect(documents).toEqual([
      { pageId: "doc-1", title: "문서1", updatedAt: "2026-08-21T00:00:00.000Z", isPublished: true, tags: ["React"] },
    ]);
  });
});
```

- [ ] **Step 2: 테스트 실행 → 실패 확인**

Run: `npm test -- documents.test.ts`
Expected: FAIL

- [ ] **Step 3: 구현**

`documents.ts` 상단 import에 추가:

```ts
import { getPublishState } from "./publish";
import { getTags } from "./tags";
```

`DocumentSummary`와 `listDocuments`를 교체:

```ts
export interface DocumentSummary {
  pageId: string;
  title: string;
  updatedAt: string;
  isPublished: boolean;
  tags: string[];
}

/** 개인 폴더 하위 문서 목록을 조회한다. */
export async function listDocuments(folderId: string): Promise<DocumentSummary[]> {
  const pages = await listChildPages(folderId);

  return Promise.all(
    pages.map(async (page) => {
      const [publishState, tagList] = await Promise.all([
        getPublishState(page.id),
        getTags(page.id),
      ]);
      return {
        pageId: page.id,
        title: page.title,
        updatedAt: page.version.createdAt,
        isPublished: publishState.isPublished,
        tags: tagList,
      };
    })
  );
}
```

- [ ] **Step 4: 테스트 실행 → 통과 확인**

Run: `npm test -- documents.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/editor/documents.ts src/lib/editor/documents.test.ts
git commit -m "feat: include publish status and tags in document list"
```

---

## Task 13: React Testing Library 환경 추가 + 태그 칩 입력 컴포넌트

**Files:**
- Modify: `package.json`
- Create: `vitest.setup.ts`
- Modify: `vitest.config.ts`
- Create: `src/components/editor/TagInput.tsx`
- Test: `src/components/editor/TagInput.test.tsx`

**Interfaces:**
- Consumes: 없음
- Produces: `export interface TagInputProps { value: string[]; onChange: (tags: string[]) => void; suggestions: string[] }`, `export function TagInput(props: TagInputProps): JSX.Element` — Task 16(편집 화면)이 이 컴포넌트를 쓴다.

- [ ] **Step 1: 패키지 설치**

```bash
npm install --save-dev @testing-library/react @testing-library/jest-dom @testing-library/user-event happy-dom
```

- [ ] **Step 2: Vitest 설정에 jsdom 환경 추가**

```ts
// vitest.config.ts
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "node",
    setupFiles: ["./vitest.setup.ts"],
    environmentMatchGlobs: [["src/components/**/*.test.tsx", "happy-dom"]],
  },
});
```

```ts
// vitest.setup.ts
import "@testing-library/jest-dom/vitest";
```

- [ ] **Step 3: 실패하는 테스트 작성**

```tsx
// src/components/editor/TagInput.test.tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TagInput } from "./TagInput";

describe("TagInput", () => {
  it("Enter를 누르면 태그가 추가된다", async () => {
    const onChange = vi.fn();
    render(<TagInput value={[]} onChange={onChange} suggestions={[]} />);

    const input = screen.getByPlaceholderText("태그 입력");
    await userEvent.type(input, "React{Enter}");

    expect(onChange).toHaveBeenCalledWith(["React"]);
  });

  it("칩의 삭제 버튼을 누르면 태그가 제거된다", async () => {
    const onChange = vi.fn();
    render(<TagInput value={["React", "Backend"]} onChange={onChange} suggestions={[]} />);

    await userEvent.click(screen.getByRole("button", { name: "React 삭제" }));

    expect(onChange).toHaveBeenCalledWith(["Backend"]);
  });
});
```

- [ ] **Step 4: 테스트 실행 → 실패 확인**

Run: `npm test -- TagInput.test.tsx`
Expected: FAIL (`./TagInput` 모듈 없음)

- [ ] **Step 5: 구현**

```tsx
// src/components/editor/TagInput.tsx
"use client";

import { useState, type KeyboardEvent } from "react";
import { Tag } from "@sfood/ui";

export interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  suggestions: string[];
}

export function TagInput({ value, onChange, suggestions }: TagInputProps) {
  const [draft, setDraft] = useState("");

  function commitDraft() {
    const tag = draft.trim();
    if (tag && !value.includes(tag)) {
      onChange([...value, tag]);
    }
    setDraft("");
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      commitDraft();
    }
  }

  function removeTag(tag: string) {
    onChange(value.filter((existing) => existing !== tag));
  }

  const candidates = suggestions.filter(
    (suggestion) => !value.includes(suggestion) && suggestion.toLowerCase().includes(draft.toLowerCase())
  );

  return (
    <div className="flex flex-wrap items-center gap-2">
      {value.map((tag) => (
        <Tag key={tag}>
          {tag}
          <button type="button" aria-label={`${tag} 삭제`} onClick={() => removeTag(tag)}>
            ×
          </button>
        </Tag>
      ))}
      <input
        placeholder="태그 입력"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={handleKeyDown}
        list="tag-suggestions"
      />
      <datalist id="tag-suggestions">
        {candidates.map((candidate) => (
          <option key={candidate} value={candidate} />
        ))}
      </datalist>
    </div>
  );
}
```

- [ ] **Step 6: 테스트 실행 → 통과 확인**

Run: `npm test -- TagInput.test.tsx`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json vitest.config.ts vitest.setup.ts src/components/editor/TagInput.tsx src/components/editor/TagInput.test.tsx
git commit -m "test: add React Testing Library and a chip-based tag input"
```

---

## Task 14: 사이드바 앱 셸 + 문서 목록/필터/빈 상태

**Files:**
- Create: `src/app/editor/layout.tsx`
- Create: `src/components/editor/EditorSidebar.tsx`
- Test: `src/components/editor/EditorSidebar.test.tsx`
- Modify: `src/app/editor/page.tsx`

**Interfaces:**
- Consumes: `DocumentSummary`(Task 12), `@sfood/ui`의 `Sidebar`/`StatusBadge`/`Tag`/`ChipGroup`/`EmptyState`
- Produces: `export interface EditorSidebarProps { documents: DocumentSummary[]; activePageId?: string }`, `export function EditorSidebar(props: EditorSidebarProps): JSX.Element` — `layout.tsx`가 이 컴포넌트를 렌더링한다.

- [ ] **Step 1: 실패하는 테스트 작성**

```tsx
// src/components/editor/EditorSidebar.test.tsx
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EditorSidebar } from "./EditorSidebar";

const DOCS = [
  { pageId: "1", title: "문서A", updatedAt: "2026-08-21T00:00:00.000Z", isPublished: true, tags: ["React"] },
  { pageId: "2", title: "문서B", updatedAt: "2026-08-21T00:00:00.000Z", isPublished: false, tags: ["Backend"] },
];

describe("EditorSidebar", () => {
  it("문서 목록과 상태 뱃지를 보여준다", () => {
    render(<EditorSidebar documents={DOCS} />);

    expect(screen.getByText("문서A")).toBeInTheDocument();
    expect(screen.getByText("게시됨")).toBeInTheDocument();
    expect(screen.getByText("초안")).toBeInTheDocument();
  });

  it("태그를 클릭하면 그 태그가 붙은 문서만 보여준다", async () => {
    render(<EditorSidebar documents={DOCS} />);

    await userEvent.click(screen.getByRole("button", { name: "React" }));

    expect(screen.getByText("문서A")).toBeInTheDocument();
    expect(screen.queryByText("문서B")).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: 테스트 실행 → 실패 확인**

Run: `npm test -- EditorSidebar.test.tsx`
Expected: FAIL (`./EditorSidebar` 모듈 없음)

- [ ] **Step 3: 구현**

```tsx
// src/components/editor/EditorSidebar.tsx
"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Sidebar, StatusBadge, Tag } from "@sfood/ui";
import type { DocumentSummary } from "@/lib/editor/documents";

export interface EditorSidebarProps {
  documents: DocumentSummary[];
  activePageId?: string;
}

export function EditorSidebar({ documents, activePageId }: EditorSidebarProps) {
  const [activeTag, setActiveTag] = useState<string | null>(null);

  const allTags = useMemo(
    () => Array.from(new Set(documents.flatMap((document) => document.tags))),
    [documents]
  );

  const visibleDocuments = activeTag
    ? documents.filter((document) => document.tags.includes(activeTag))
    : documents;

  return (
    <Sidebar>
      <Link href="/editor/new">새 문서</Link>

      <div>
        {allTags.map((tag) => (
          <button
            key={tag}
            type="button"
            aria-pressed={activeTag === tag}
            onClick={() => setActiveTag((current) => (current === tag ? null : tag))}
          >
            {tag}
          </button>
        ))}
      </div>

      <ul>
        {visibleDocuments.map((document) => (
          <li key={document.pageId} aria-current={document.pageId === activePageId}>
            <Link href={`/editor/${document.pageId}`}>
              {document.title}
              <StatusBadge>{document.isPublished ? "게시됨" : "초안"}</StatusBadge>
              {document.tags.map((tag) => (
                <Tag key={tag}>{tag}</Tag>
              ))}
            </Link>
          </li>
        ))}
      </ul>
    </Sidebar>
  );
}
```

- [ ] **Step 4: 테스트 실행 → 통과 확인**

Run: `npm test -- EditorSidebar.test.tsx`
Expected: PASS

- [ ] **Step 5: `layout.tsx` 작성**

```tsx
// src/app/editor/layout.tsx
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { createPersonalFolder, findPersonalFolder } from "@/lib/editor/folder";
import { listDocuments } from "@/lib/editor/documents";
import { ConflictError } from "@/lib/editor/errors";
import { EditorSidebar } from "@/components/editor/EditorSidebar";

export default async function EditorLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) {
    redirect("/login");
  }

  let folder = await findPersonalFolder(email);
  if (!folder) {
    try {
      folder = await createPersonalFolder(email);
    } catch (error) {
      if (error instanceof ConflictError) {
        folder = await findPersonalFolder(email);
      } else {
        throw error;
      }
    }
  }

  const documents = folder ? await listDocuments(folder.folderId) : [];

  return (
    <div className="flex">
      <EditorSidebar documents={documents} />
      <main className="flex-1">{children}</main>
    </div>
  );
}
```

- [ ] **Step 6: `/editor` 페이지를 빈 상태로 교체**

```tsx
// src/app/editor/page.tsx
import { EmptyState } from "@sfood/ui";

export default function EditorHomePage() {
  return <EmptyState title="문서를 선택하거나 새로 작성하세요" />;
}
```

- [ ] **Step 7: 개발 서버로 확인**

`npm run dev`로 로그인 후 `/editor`에 접속해 사이드바가 뜨는지, 태그를 클릭하면 필터링되는지, 문서를 클릭하면 본문 영역만 바뀌는지(사이드바가 다시 그려지지 않는지) 확인한다.

- [ ] **Step 8: Commit**

```bash
git add src/app/editor/layout.tsx src/app/editor/page.tsx src/components/editor/EditorSidebar.tsx src/components/editor/EditorSidebar.test.tsx
git commit -m "feat: add persistent sidebar app shell for the editor"
```

---

## Task 15: 로그인 화면 — `LoginSimple` 템플릿 전환

**Files:**
- Modify: `src/app/login/page.tsx`

**Interfaces:**
- Consumes: `@sfood/ui`의 `LoginSimple`
- Produces: 없음(화면 교체)

- [ ] **Step 1: `login/page.tsx` 교체**

```tsx
// src/app/login/page.tsx
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getAxAuthLoginUrl } from "@/lib/ax-auth/client";
import { LoginSimple } from "@sfood/ui";

interface LoginPageProps {
  searchParams: Promise<{ error?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const session = await auth();
  if (session?.user) {
    redirect("/editor");
  }

  const { error } = await searchParams;

  let loginUrl: string | null = null;
  try {
    loginUrl = getAxAuthLoginUrl();
  } catch {
    loginUrl = null;
  }

  return (
    <LoginSimple
      logo={<span className="text-2xl font-bold text-brand">SFOOD IT Editor</span>}
      footer={
        <>
          {error && <p className="text-danger">로그인에 실패했습니다. 다시 시도해 주세요.</p>}
          {loginUrl ? (
            <a href={loginUrl} className="button-primary">
              MS 계정으로 로그인
            </a>
          ) : (
            <p className="text-danger">AX Auth 연동 환경변수가 설정되지 않아 로그인을 시작할 수 없습니다.</p>
          )}
        </>
      }
    />
  );
}
```

> `LoginSimple`이 `footer` 슬롯을 지원하지 않으면(Storybook에서 실제 prop 이름 확인 필요), 지원하는 슬롯 이름으로 이 부분만 맞춰 바꾼다 — 나머지 로직은 동일하다.

- [ ] **Step 2: 개발 서버로 확인**

`/login`에 접속해 로고와 "MS 계정으로 로그인" 버튼이 보이는지, `?error=1`을 붙였을 때 실패 안내가 보이는지 확인한다.

- [ ] **Step 3: Commit**

```bash
git add src/app/login/page.tsx
git commit -m "feat: switch login screen to the LoginSimple template"
```

---

## Task 16: 편집 화면 재구성 — `RichTextEditor`·`TagInput` 연결 + `Toast`/`Modal`

**Files:**
- Modify: `src/components/editor/DocumentEditor.tsx` (전체 재작성)
- Test: `src/components/editor/DocumentEditor.test.tsx`

**Interfaces:**
- Consumes: `RichTextEditor`(Task 2·7·8·9·10·11), `TagInput`(Task 13), `getTags`/`setTags`(1차 플랜의 `tags.ts`), `@sfood/ui`의 `Modal`/`useToast`/`Button`
- Produces: `DocumentEditor`가 제목·태그·본문(WYSIWYG)·저장·삭제(모달 확인)·게시 설정 이동을 처리 — `/editor/new`, `/editor/[pageId]` 페이지가 그대로 사용한다(props는 기존과 동일하게 `mode`/`pageId`/`initialTitle`/`initialVersion`을 유지하고, `initialMarkdown` 대신 `initialDoc`/`initialTags`를 받는다).

- [ ] **Step 1: 실패하는 테스트 작성**

```tsx
// src/components/editor/DocumentEditor.test.tsx
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DocumentEditor } from "./DocumentEditor";

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("DocumentEditor", () => {
  it("삭제 버튼을 누르면 확인 모달이 뜨고, 확인해야 실제 삭제 요청을 보낸다", async () => {
    const fetchMock = vi.fn(async () => new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);

    render(
      <DocumentEditor
        mode="edit"
        pageId="doc-1"
        initialTitle="제목"
        initialDoc={{ type: "doc", content: [] }}
        initialTags={[]}
        initialVersion={1}
      />
    );

    await userEvent.click(screen.getByRole("button", { name: "삭제" }));
    expect(fetchMock).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole("button", { name: "삭제 확인" }));
    expect(fetchMock).toHaveBeenCalledWith("/api/editor/documents/doc-1", { method: "DELETE" });
  });
});
```

- [ ] **Step 2: 테스트 실행 → 실패 확인**

Run: `npm test -- DocumentEditor.test.tsx`
Expected: FAIL (기존 컴포넌트는 `window.confirm` 기반이라 "삭제 확인" 버튼이 없음)

- [ ] **Step 3: `DocumentEditor.tsx` 전체 교체**

```tsx
// src/components/editor/DocumentEditor.tsx
"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Modal, useToast } from "@sfood/ui";
import type { JSONContent } from "@tiptap/react";
import { RichTextEditor } from "./RichTextEditor";
import { TagInput } from "./TagInput";

interface DocumentEditorProps {
  mode: "create" | "edit";
  pageId?: string;
  initialTitle?: string;
  initialDoc?: JSONContent;
  initialTags?: string[];
  initialVersion?: number;
  tagSuggestions?: string[];
}

const EMPTY_DOC: JSONContent = { type: "doc", content: [{ type: "paragraph" }] };

export function DocumentEditor({
  mode,
  pageId,
  initialTitle = "",
  initialDoc = EMPTY_DOC,
  initialTags = [],
  initialVersion,
  tagSuggestions = [],
}: DocumentEditorProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [title, setTitle] = useState(initialTitle);
  const [doc, setDoc] = useState<JSONContent>(initialDoc);
  const [tags, setTags] = useState<string[]>(initialTags);
  const [version, setVersion] = useState(initialVersion);
  const [status, setStatus] = useState<"idle" | "saving" | "deleting">("idle");
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    setStatus("saving");

    try {
      let currentPageId = pageId;

      if (mode === "create") {
        const response = await fetch("/api/editor/documents", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, doc }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error?.message ?? "저장에 실패했습니다.");
        currentPageId = data.pageId;
      } else {
        const response = await fetch(`/api/editor/documents/${pageId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, doc, version }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error?.message ?? "저장에 실패했습니다.");
        setVersion(data.version);
      }

      if (currentPageId) {
        await fetch(`/api/editor/documents/${currentPageId}/tags`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tags }),
        });
      }

      toast("저장되었습니다.", "success");
      if (mode === "create" && currentPageId) {
        router.push(`/editor/${currentPageId}`);
      } else {
        router.refresh();
      }
    } catch (err) {
      toast(err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.", "danger");
    } finally {
      setStatus("idle");
    }
  }

  async function handleDelete() {
    if (!pageId) return;
    setStatus("deleting");

    try {
      const response = await fetch(`/api/editor/documents/${pageId}`, { method: "DELETE" });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error?.message ?? "삭제에 실패했습니다.");
      }
      router.push("/editor");
    } catch (err) {
      toast(err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.", "danger");
      setStatus("idle");
    }
  }

  return (
    <form className="stack" onSubmit={handleSave}>
      <input
        className="text-3xl font-bold border-none bg-transparent"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        placeholder="제목"
      />

      <TagInput value={tags} onChange={setTags} suggestions={tagSuggestions} />

      <RichTextEditor content={doc} onChange={setDoc} pageId={pageId} />

      <div className="toolbar">
        <div>
          {mode === "edit" && pageId && (
            <>
              <Button variant="danger" onClick={() => setDeleteModalOpen(true)} disabled={status !== "idle"}>
                삭제
              </Button>
              <Link href={`/editor/${pageId}/publish`} className="button-secondary">
                게시 설정
              </Link>
            </>
          )}
        </div>
        <Button type="submit" variant="primary" disabled={status !== "idle"}>
          {status === "saving" ? "저장 중..." : "저장"}
        </Button>
      </div>

      <Modal
        open={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="삭제 확인"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteModalOpen(false)}>
              취소
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                setDeleteModalOpen(false);
                handleDelete();
              }}
            >
              삭제 확인
            </Button>
          </>
        }
      >
        이 작업은 되돌릴 수 없습니다.
      </Modal>
    </form>
  );
}
```

- [ ] **Step 4: 호출부 갱신**

`src/app/editor/new/page.tsx`는 `<DocumentEditor mode="create" />`만 쓰고 있고, 새로 추가된 props(`initialDoc`/`initialTags`/`tagSuggestions`)는 모두 기본값이 있으므로 수정할 필요가 없다.

`src/app/editor/[pageId]/page.tsx`는 `initialMarkdown`을 쓰던 부분을 아래로 교체한다:

```tsx
// src/app/editor/[pageId]/page.tsx
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getDocumentDetail } from "@/lib/editor/documents";
import { getTags } from "@/lib/editor/tags";
import { NotFoundError } from "@/lib/editor/errors";
import { DocumentEditor } from "@/components/editor/DocumentEditor";

interface EditDocumentPageProps {
  params: Promise<{ pageId: string }>;
}

export default async function EditDocumentPage({ params }: EditDocumentPageProps) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const { pageId } = await params;

  let document;
  let tags: string[];
  try {
    [document, tags] = await Promise.all([getDocumentDetail(pageId), getTags(pageId)]);
  } catch (error) {
    if (error instanceof NotFoundError) {
      notFound();
    }
    throw error;
  }

  return (
    <main className="page">
      <div className="toolbar">
        <div>
          <h1 className="page-title">{document.title}</h1>
          <p className="page-subtitle">문서를 수정하고 저장하세요.</p>
        </div>
        <Link href="/editor" className="button-secondary">
          탐색기로
        </Link>
      </div>
      <div className="card">
        <DocumentEditor
          mode="edit"
          pageId={document.pageId}
          initialTitle={document.title}
          initialDoc={document.doc}
          initialTags={tags}
          initialVersion={document.version}
        />
      </div>
    </main>
  );
}
```

- [ ] **Step 5: 테스트 실행 → 통과 확인**

Run: `npm test -- DocumentEditor.test.tsx`
Expected: PASS

- [ ] **Step 6: 개발 서버로 확인**

문서 작성 → 저장 → Toast로 성공 안내가 뜨는지, 삭제 버튼 → 모달 → "삭제 확인"을 눌러야 실제로 삭제되는지 확인한다.

- [ ] **Step 7: Commit**

```bash
git add src/components/editor/DocumentEditor.tsx src/components/editor/DocumentEditor.test.tsx src/app/editor/new/page.tsx "src/app/editor/[pageId]/page.tsx"
git commit -m "feat: rebuild the editor screen with WYSIWYG, tags, toast, and modal"
```

---

## Task 17: 게시 설정 화면 — 뷰어별 카드 UI

**Files:**
- Modify: `src/components/editor/PublishForm.tsx` (전체 재작성)
- Test: `src/components/editor/PublishForm.test.tsx`

**Interfaces:**
- Consumes: `PublishViewerMetadata`/`PublishMetadata`(1차 플랜의 `publish.ts`), `@sfood/ui`의 `Card`/`Switch`/`FormField`/`Input`/`Textarea`/`Button`/`useToast`
- Produces: 없음(화면 교체). `PublishFormProps`는 1차 플랜에서 이미 `{isPublished, viewers}`로 정리돼 있으므로 이 Task는 그 props를 그대로 쓰되 마크업만 카드 UI로 바꾼다.

- [ ] **Step 1: 실패하는 테스트 작성**

```tsx
// src/components/editor/PublishForm.test.tsx
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PublishForm } from "./PublishForm";

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("PublishForm", () => {
  it("뷰어 카드마다 slug/메타 설명을 입력할 수 있고, 저장 시 viewers 구조로 전송한다", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ isPublished: true }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    render(
      <PublishForm
        pageId="doc-1"
        initial={{ isPublished: false, viewers: {} }}
      />
    );

    await userEvent.type(screen.getByLabelText("Tech Blog 공개 경로(slug)"), "my-post");
    await userEvent.type(screen.getByLabelText("Tech Blog 메타 설명"), "설명");
    await userEvent.click(screen.getByRole("button", { name: "게시 설정 저장" }));

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/editor/documents/doc-1/publish",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({
          isPublished: false,
          viewers: { "tech-blog": { slug: "my-post", metaDescription: "설명" } },
        }),
      })
    );
  });
});
```

- [ ] **Step 2: 테스트 실행 → 실패 확인**

Run: `npm test -- PublishForm.test.tsx`
Expected: FAIL (기존 컴포넌트는 라벨이 "공개 경로(slug)"이고 뷰어 이름이 붙어있지 않음)

- [ ] **Step 3: 구현**

```tsx
// src/components/editor/PublishForm.tsx
"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, FormField, Input, Switch, Textarea, useToast } from "@sfood/ui";

interface ViewerMetadata {
  slug: string;
  metaDescription: string;
}

interface PublishFormProps {
  pageId: string;
  initial: {
    isPublished: boolean;
    viewers: Record<string, ViewerMetadata>;
  };
}

const VIEWERS = [{ id: "tech-blog", label: "Tech Blog" }];

export function PublishForm({ pageId, initial }: PublishFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPublished, setIsPublished] = useState(initial.isPublished);
  const [viewerFields, setViewerFields] = useState<Record<string, ViewerMetadata>>(
    VIEWERS.reduce(
      (acc, viewer) => ({
        ...acc,
        [viewer.id]: initial.viewers[viewer.id] ?? { slug: "", metaDescription: "" },
      }),
      {} as Record<string, ViewerMetadata>
    )
  );
  const [status, setStatus] = useState<"idle" | "saving">("idle");

  function updateViewerField(viewerId: string, field: keyof ViewerMetadata, value: string) {
    setViewerFields((prev) => ({ ...prev, [viewerId]: { ...prev[viewerId], [field]: value } }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setStatus("saving");

    const viewers = isPublished ? viewerFields : {};

    try {
      const response = await fetch(`/api/editor/documents/${pageId}/publish`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublished, viewers }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message ?? "게시 설정 저장에 실패했습니다.");
      toast("게시 설정이 저장되었습니다.", "success");
      router.refresh();
    } catch (err) {
      toast(err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.", "danger");
    } finally {
      setStatus("idle");
    }
  }

  return (
    <form className="stack" onSubmit={handleSubmit}>
      <Switch checked={isPublished} onChange={(event) => setIsPublished(event.target.checked)} label="게시함" />

      {VIEWERS.map((viewer) => (
        <Card key={viewer.id}>
          <h3>{viewer.label}</h3>
          <FormField label={`${viewer.label} 공개 경로(slug)`}>
            <Input
              value={viewerFields[viewer.id].slug}
              onChange={(event) => updateViewerField(viewer.id, "slug", event.target.value)}
              placeholder="예: my-first-post"
            />
          </FormField>
          <FormField label={`${viewer.label} 메타 설명`}>
            <Textarea
              value={viewerFields[viewer.id].metaDescription}
              onChange={(event) => updateViewerField(viewer.id, "metaDescription", event.target.value)}
            />
          </FormField>
        </Card>
      ))}

      <Button type="submit" variant="primary" disabled={status === "saving"}>
        {status === "saving" ? "저장 중..." : "게시 설정 저장"}
      </Button>
    </form>
  );
}
```

- [ ] **Step 4: 테스트 실행 → 통과 확인**

Run: `npm test -- PublishForm.test.tsx`
Expected: PASS

- [ ] **Step 5: 개발 서버로 확인**

게시 설정 화면에서 "Tech Blog" 카드에 slug/메타 설명을 입력하고 저장하면 성공 Toast가 뜨는지 확인한다.

- [ ] **Step 6: Commit**

```bash
git add src/components/editor/PublishForm.tsx src/components/editor/PublishForm.test.tsx
git commit -m "feat: rebuild publish settings screen with per-viewer cards"
```
