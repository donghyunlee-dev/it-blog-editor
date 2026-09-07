import { Extension, type Editor, type Range } from "@tiptap/core";
import Suggestion, { type SuggestionKeyDownProps, type SuggestionProps } from "@tiptap/suggestion";

// TipTap v3's `@tiptap/suggestion` (verified at the installed 3.30.2, matching
// the other @tiptap/* packages exactly) still ships as a standalone package
// with the same `Suggestion({ editor, char, items, render, ... })` plugin
// factory the brief's v2-era example uses — confirmed against
// node_modules/@tiptap/suggestion/dist/index.d.ts. `SuggestionOptions` and
// `SuggestionProps` are (mostly) unchanged in shape from what the brief
// assumes: `items`, `command`, `render` with `onStart`/`onUpdate`/`onExit`
// callbacks all still exist.
//
// One real difference from the brief: `SuggestionProps.clientRect` — the prop
// the brief's example feeds into `tippy(document.body, { getReferenceClientRect:
// props.clientRect, ... })` — is now typed optional, and the package ships a
// new, explicitly-recommended alternative: `SuggestionProps.mount(element)`.
// Per its doc comment in the .d.ts, `mount` "Mounts a floating element and
// takes over its positioning ... the recommended, default way to render a
// suggestion popup," built on `@floating-ui/dom` internally (confirmed in
// node_modules/@tiptap/suggestion/dist/index.js's `createMount`/`computePosition`
// call, and `@floating-ui/dom` is a real peer dependency of
// `@tiptap/suggestion` per its package.json). It auto-appends the element to
// `document.body`, keeps it anchored via `autoUpdate` (scroll/resize/layout
// changes), dismisses on outside click, and returns an `unmount` cleanup
// function — i.e. it already does everything the brief hand-rolls tippy.js
// for. Since this project's bubble toolbar (Task 8) already pulls in
// `@floating-ui/dom` transitively via `@tiptap/extension-bubble-menu`, using
// `props.mount()` here avoids adding an entirely separate positioning library
// (`tippy.js`) for equivalent behavior. Decision: use `props.mount()`,
// skip installing `tippy.js`.
//
// Escape-to-close is handled natively by the plugin (confirmed in
// index.js's `handleKeyDown`: it unconditionally dispatches an exit
// transaction on Escape before calling the renderer's own `onKeyDown`), so
// no explicit Escape handling is needed here. ArrowUp/ArrowDown/Enter
// keyboard navigation is not handled by the plugin itself, so this file adds
// minimal support for it via `render().onKeyDown`, which the brief's example
// omits entirely (mouse-only) — a small addition, not a deviation from any
// documented API.

export interface CommandItem {
  title: string;
  run: (editor: Editor, range: Range) => void;
}

const ITEMS: CommandItem[] = [
  {
    title: "제목 1",
    run: (editor, range) => editor.chain().focus().deleteRange(range).setNode("heading", { level: 1 }).run(),
  },
  {
    title: "제목 2",
    run: (editor, range) => editor.chain().focus().deleteRange(range).setNode("heading", { level: 2 }).run(),
  },
  {
    title: "글머리 목록",
    run: (editor, range) => editor.chain().focus().deleteRange(range).toggleBulletList().run(),
  },
  {
    title: "번호 목록",
    run: (editor, range) => editor.chain().focus().deleteRange(range).toggleOrderedList().run(),
  },
  {
    title: "표",
    run: (editor, range) => editor.chain().focus().deleteRange(range).insertTable({ rows: 2, cols: 2 }).run(),
  },
  {
    title: "코드블록",
    run: (editor, range) => editor.chain().focus().deleteRange(range).toggleCodeBlock().run(),
  },
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

/**
 * 기본 항목 목록에 호출부가 넘긴 추가 항목(예: pageId가 있어야 하는 "이미지" 삽입)을 덧붙이고
 * 쿼리로 필터링한다. 이미지 항목은 pageId/toast 등 컴포넌트 쪽 컨텍스트가 필요해 이 모듈의
 * 정적 ITEMS 배열에 넣을 수 없으므로, RichTextEditor가 `SlashCommandExtension.configure()`로
 * items 함수 자체를 이걸로 교체해 주입한다.
 */
export function createSlashItems(query: string, extraItems: CommandItem[] = []): CommandItem[] {
  return [...ITEMS, ...extraItems].filter((item) =>
    item.title.toLowerCase().includes(query.toLowerCase())
  );
}

// `render()` is invoked exactly once per editor instance (confirmed in
// index.js: `const renderer = render == null ? void 0 : render();` runs once
// inside the `Suggestion()` factory call), and the returned
// onStart/onUpdate/onExit/onKeyDown callbacks are reused across every "/"
// session for that editor's lifetime. So the closures below (menuEl, items,
// selectedIndex, unmount) persist across sessions by design, matching the
// brief's single-`popup`-instance pattern.
function createSlashMenuRenderer() {
  let items: CommandItem[] = [];
  let selectedIndex = 0;
  let currentEditor: Editor | null = null;
  let currentRange: Range | null = null;
  let unmount: (() => void) | null = null;

  const menuEl = document.createElement("div");
  menuEl.className = "flex min-w-40 flex-col gap-0.5 rounded-md border border-border bg-surface p-1 shadow-md";
  menuEl.setAttribute("role", "listbox");
  menuEl.setAttribute("aria-label", "슬래시 명령어 목록");

  function optionId(index: number) {
    return `slash-menu-option-${index}`;
  }

  // 실제 포커스는 계속 에디터의 contenteditable에 남아있고 이 메뉴는 포커스를 받지 않으므로,
  // 표준 리스트박스 패턴대로 에디터 DOM에 aria-activedescendant를 걸어 스크린 리더가 "지금
  // 뭐가 선택됐는지" 알 수 있게 한다. 테스트에서는 `editor.view`가 없는 목 객체가 들어올 수
  // 있어 옵셔널 체이닝으로 방어한다.
  function syncActiveDescendant() {
    const dom = currentEditor?.view?.dom;
    if (!dom) return;
    if (items.length === 0) {
      dom.removeAttribute("aria-activedescendant");
      return;
    }
    dom.setAttribute("aria-activedescendant", optionId(selectedIndex));
  }

  function renderItems() {
    menuEl.innerHTML = "";
    if (items.length === 0) {
      const empty = document.createElement("div");
      empty.className = "px-2 py-1 text-left text-sm opacity-60";
      empty.setAttribute("role", "status");
      empty.setAttribute("aria-live", "polite");
      empty.textContent = "일치하는 항목이 없습니다";
      menuEl.appendChild(empty);
      syncActiveDescendant();
      return;
    }
    items.forEach((item, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.id = optionId(index);
      button.setAttribute("role", "option");
      button.setAttribute("aria-selected", index === selectedIndex ? "true" : "false");
      button.textContent = item.title;
      button.className = [
        "block w-full rounded px-2 py-1 text-left text-sm",
        index === selectedIndex ? "bg-brand-subtle text-brand" : "hover:bg-surface-subtle",
      ].join(" ");
      button.addEventListener("mouseenter", () => {
        selectedIndex = index;
        renderItems();
      });
      button.addEventListener("click", () => {
        if (currentEditor && currentRange) item.run(currentEditor, currentRange);
      });
      menuEl.appendChild(button);
    });
    syncActiveDescendant();
  }

  function syncFromProps(props: SuggestionProps<CommandItem>) {
    items = props.items;
    currentEditor = props.editor;
    currentRange = props.range;
    if (selectedIndex >= items.length) selectedIndex = 0;
    renderItems();
  }

  return {
    onStart: (props: SuggestionProps<CommandItem>) => {
      selectedIndex = 0;
      syncFromProps(props);
      unmount = props.mount(menuEl);
    },
    onUpdate: (props: SuggestionProps<CommandItem>) => {
      syncFromProps(props);
    },
    onKeyDown: ({ event }: SuggestionKeyDownProps) => {
      if (items.length === 0) return false;
      if (event.key === "ArrowDown") {
        selectedIndex = (selectedIndex + 1) % items.length;
        renderItems();
        return true;
      }
      if (event.key === "ArrowUp") {
        selectedIndex = (selectedIndex - 1 + items.length) % items.length;
        renderItems();
        return true;
      }
      if (event.key === "Enter") {
        const item = items[selectedIndex];
        if (item && currentEditor && currentRange) item.run(currentEditor, currentRange);
        return true;
      }
      return false;
    },
    onExit: () => {
      currentEditor?.view?.dom.removeAttribute("aria-activedescendant");
      unmount?.();
      unmount = null;
    },
  };
}

export const SlashCommandExtension = Extension.create({
  name: "slashCommand",
  addOptions() {
    return {
      suggestion: {
        char: "/",
        items: ({ query }: { query: string }) => createSlashItems(query),
        render: createSlashMenuRenderer,
      },
    };
  },
  addProseMirrorPlugins() {
    return [
      Suggestion<CommandItem>({
        editor: this.editor,
        ...this.options.suggestion,
      }),
    ];
  },
});
