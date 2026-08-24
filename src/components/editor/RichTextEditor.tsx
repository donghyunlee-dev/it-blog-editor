"use client";

import { Node } from "@tiptap/core";
import { EditorContent, useEditor, type JSONContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import { Color, TextStyle } from "@tiptap/extension-text-style";
import Highlight from "@tiptap/extension-highlight";
import TiptapImage from "@tiptap/extension-image";
import { Table, TableCell, TableHeader, TableRow } from "@tiptap/extension-table";

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
    ],
    content,
    onUpdate: ({ editor: currentEditor }) => {
      onChange(currentEditor.getJSON());
    },
    immediatelyRender: false,
  });

  return <EditorContent editor={editor} className="prose max-w-none" />;
}
