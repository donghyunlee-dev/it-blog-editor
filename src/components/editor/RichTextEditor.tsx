"use client";

import type { ReactNode } from "react";
import { Node, type Editor } from "@tiptap/core";
import { EditorContent, useEditor, type JSONContent } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import { Color, TextStyle } from "@tiptap/extension-text-style";
import Highlight from "@tiptap/extension-highlight";
import TiptapImage from "@tiptap/extension-image";
import { Table, TableCell, TableHeader, TableRow } from "@tiptap/extension-table";
import { Button } from "@sfood/ui";
import { SlashCommandExtension } from "./SlashCommandExtension";

// TipTap v3 split BubbleMenu/FloatingMenu out of `@tiptap/react`'s main
// entrypoint into a `@tiptap/react/menus` subpath (backed by the
// `@tiptap/extension-bubble-menu` plugin + `@floating-ui/dom` for
// positioning), so that consumers who don't use menus aren't forced to pull
// in floating-ui. `@tiptap/extension-bubble-menu` ships as an
// `optionalDependency` of `@tiptap/react@3.30.2` (confirmed via its
// package.json), so it resolves without any extra install, but it's added
// as an explicit direct dependency in package.json here since our code
// relies on it being present regardless of @tiptap/react's own dependency
// choices in future versions.

// TipTap v3 restructured @tiptap/extension-color and the separate
// @tiptap/extension-table-row/-header/-cell packages into thin re-export
// shims: Color now lives in @tiptap/extension-text-style, and
// TableRow/TableHeader/TableCell are exported from @tiptap/extension-table
// itself. We import from the consolidated packages directly rather than
// installing the deprecated shim packages (same rationale as Task 2's
// @tiptap/extension-list consolidation).

const AttachmentImage = TiptapImage.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      filename: { default: null },
    };
  },
});

const Panel = Node.create({
  name: "panel",
  group: "block",
  content: "block+",
  addAttributes() {
    return { panelType: { default: "info" } };
  },
  parseHTML() {
    return [
      {
        tag: "div[data-panel-type]",
        getAttrs: (el) => ({ panelType: (el as HTMLElement).getAttribute("data-panel-type") }),
      },
    ];
  },
  renderHTML({ node }) {
    return ["div", { "data-panel-type": node.attrs.panelType, class: `panel panel-${node.attrs.panelType}` }, 0];
  },
});

// 굵게/기울임/취소선 토글 버튼은 동시에 여러 개가 활성 상태일 수 있으므로
// (예: 굵게+기울임 동시 선택), 활성 표시에 `variant="primary"`를 쓰지 않는다.
// "한 화면에 Button variant=primary는 1개만 둔다"는 디자인 시스템 규칙과
// 충돌하고, primary는 화면의 주요 액션을 뜻하는 의미이지 토글 상태 표시가
// 아니기 때문이다. 대신 기본 상태는 `variant="ghost"`로 두고, 활성 상태는
// CSS 변수 기반 유틸리티 클래스(`bg-brand-subtle text-brand`)로 표시한다.
function ToggleButton({
  active,
  onClick,
  label,
  children,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  children: ReactNode;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      aria-pressed={active}
      aria-label={label}
      className={active ? "bg-brand-subtle text-brand" : undefined}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}

function EditorBubbleMenu({ editor }: { editor: Editor | null }) {
  if (!editor) return null;

  return (
    <BubbleMenu editor={editor} options={{ placement: "top" }}>
      <div className="flex items-center gap-1 rounded-md border border-border bg-surface p-1 shadow-md">
        <ToggleButton
          active={editor.isActive("bold")}
          label="굵게"
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          B
        </ToggleButton>
        <ToggleButton
          active={editor.isActive("italic")}
          label="기울임"
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          I
        </ToggleButton>
        <ToggleButton
          active={editor.isActive("strike")}
          label="취소선"
          onClick={() => editor.chain().focus().toggleStrike().run()}
        >
          S
        </ToggleButton>
        <input
          type="color"
          aria-label="글자 색상"
          className="h-8 w-8 cursor-pointer rounded border border-border bg-surface p-0.5"
          onChange={(event) => editor.chain().focus().setColor(event.target.value).run()}
        />
        <input
          type="color"
          aria-label="하이라이트"
          className="h-8 w-8 cursor-pointer rounded border border-border bg-surface p-0.5"
          onChange={(event) => editor.chain().focus().toggleHighlight({ color: event.target.value }).run()}
        />
        <ToggleButton
          active={editor.isActive("link")}
          label="링크"
          onClick={() => {
            const href = window.prompt("링크 URL");
            if (href) editor.chain().focus().setLink({ href }).run();
          }}
        >
          링크
        </ToggleButton>
      </div>
    </BubbleMenu>
  );
}

function TableControls({ editor }: { editor: Editor | null }) {
  if (!editor || !editor.isActive("table")) return null;

  return (
    <div className="flex gap-1 border border-border bg-surface p-1">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={!editor.can().mergeCells()}
        onClick={() => editor.chain().focus().mergeCells().run()}
        aria-label="셀 병합"
      >
        셀 병합
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={!editor.can().splitCell()}
        onClick={() => editor.chain().focus().splitCell().run()}
        aria-label="셀 분할"
      >
        셀 분할
      </Button>
    </div>
  );
}

export interface RichTextEditorProps {
  content: JSONContent;
  onChange: (doc: JSONContent) => void;
}

export function RichTextEditor({ content, onChange }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Link.configure({ openOnClick: false }),
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      AttachmentImage,
      Panel,
      Table.configure({ resizable: false }),
      TableRow,
      TableHeader,
      TableCell,
      SlashCommandExtension,
    ],
    content,
    onUpdate: ({ editor: currentEditor }) => {
      onChange(currentEditor.getJSON());
    },
    immediatelyRender: false,
  });

  return (
    <>
      {editor && <EditorBubbleMenu editor={editor} />}
      {editor && <TableControls editor={editor} />}
      <EditorContent editor={editor} className="prose max-w-none" />
    </>
  );
}
