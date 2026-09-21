import { Extension, type Editor, type Range } from "@tiptap/core";
import Suggestion, { type SuggestionKeyDownProps, type SuggestionProps } from "@tiptap/suggestion";
import { DEFAULT_PANEL_ICONS } from "@/lib/editor/panel-icons";

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
  /**
   * P17-6: 항목 앞에 그릴 장식용 아이콘 — SVG 마크업 또는 이모지 문자열. 렌더러
   * (`createSlashMenuRenderer`)가 `document.createElement`로 직접 DOM을 만드는
   * 순수 TS 모듈이라 React 컴포넌트가 아니라 문자열로 전달한다. optional이라 이
   * 필드가 없는 기존 `CommandItem`(테스트 픽스처 등)도 아이콘 없이 그대로 렌더링된다.
   */
  icon?: string;
  run: (editor: Editor, range: Range) => void;
}

/**
 * P17-6: 각 블록 타입을 나타내는 아이콘 — 버블 메뉴의 "B"/"I"/"</>" 글자 아이콘(인라인
 * 서식 마크를 나타냄)과는 별개로, 여기는 슬래시 메뉴가 삽입하는 블록 구조를 나타낸다.
 * 기존 `TableIcon`/`CodeCopyIcon`(RichTextEditor.tsx)과 같은 시각 스타일(viewBox
 * 0 0 24 24, stroke=currentColor, stroke-width=2, round cap/join, 24x24 기준
 * h-4 w-4 크기)로 직접 그린다 — 새 아이콘 라이브러리를 추가하지 않는다. 제목 1/2/3은
 * Notion·Coda 등 대부분의 문서 도구가 쓰는 관례대로 "H1"/"H2"/"H3" 텍스트 배지를
 * 쓴다 — 버블 메뉴의 B/I와 달리 이건 인라인 서식 마크가 아니라 헤딩 레벨 자체를
 * 나타내는 값이라 겹치지 않는다.
 */
const ICON = {
  heading1: '<span class="text-[11px] font-bold leading-none">H1</span>',
  heading2: '<span class="text-[11px] font-bold leading-none">H2</span>',
  heading3: '<span class="text-[11px] font-bold leading-none">H3</span>',
  bulletList:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" class="h-4 w-4"><circle cx="4" cy="6" r="1"/><circle cx="4" cy="12" r="1"/><circle cx="4" cy="18" r="1"/><line x1="9" y1="6" x2="20" y2="6"/><line x1="9" y1="12" x2="20" y2="12"/><line x1="9" y1="18" x2="20" y2="18"/></svg>',
  orderedList:
    '<svg viewBox="0 0 24 24" fill="currentColor" class="h-4 w-4"><text x="2" y="8.5" font-size="7" font-family="sans-serif" stroke="none">1</text><text x="2" y="14.5" font-size="7" font-family="sans-serif" stroke="none">2</text><text x="2" y="20.5" font-size="7" font-family="sans-serif" stroke="none">3</text><g stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="9" y1="6" x2="20" y2="6"/><line x1="9" y1="12" x2="20" y2="12"/><line x1="9" y1="18" x2="20" y2="18"/></g></svg>',
  quote:
    '<svg viewBox="0 0 24 24" fill="currentColor" class="h-4 w-4"><path d="M7 8c-2 0-3 1.5-3 4v4h4v-4H6c0-1.5.5-2 2-2V8Zm9 0c-2 0-3 1.5-3 4v4h4v-4h-2c0-1.5.5-2 2-2V8Z"/></svg>',
  horizontalRule:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" class="h-4 w-4"><line x1="4" y1="12" x2="20" y2="12"/></svg>',
  table:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-4 w-4"><rect x="3" y="4" width="18" height="16" rx="1"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="3" y1="16" x2="21" y2="16"/><line x1="9" y1="4" x2="9" y2="20"/><line x1="15" y1="4" x2="15" y2="20"/></svg>',
  codeBlock:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4"><path d="M9 4c-2 0-2 2-2 4s0 3-2 4c2 1 2 2 2 4s0 4 2 4"/><path d="M15 4c2 0 2 2 2 4s0 3 2 4c-2 1-2 2-2 4s0 4-2 4"/></svg>',
  inlineCode:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4"><polyline points="9 8 4 12 9 16"/><polyline points="15 8 20 12 15 16"/></svg>',
} as const;

const ITEMS: CommandItem[] = [
  {
    title: "제목 1",
    icon: ICON.heading1,
    run: (editor, range) => editor.chain().focus().deleteRange(range).setNode("heading", { level: 1 }).run(),
  },
  {
    title: "제목 2",
    icon: ICON.heading2,
    run: (editor, range) => editor.chain().focus().deleteRange(range).setNode("heading", { level: 2 }).run(),
  },
  {
    // P2-8: heading의 level:3은 StarterKit 설정(`RichTextEditor.tsx`의 `heading: { levels: [1,2,3] }`)에
    // 스키마상 이미 켜져 있었지만, "제목 1"/"제목 2"와 달리 슬래시 메뉴 항목이 없어 발견이
    // 불가능했다 — 그 둘과 완전히 같은 패턴으로 추가한다.
    title: "제목 3",
    icon: ICON.heading3,
    run: (editor, range) => editor.chain().focus().deleteRange(range).setNode("heading", { level: 3 }).run(),
  },
  {
    title: "글머리 목록",
    icon: ICON.bulletList,
    run: (editor, range) => editor.chain().focus().deleteRange(range).toggleBulletList().run(),
  },
  {
    title: "번호 목록",
    icon: ICON.orderedList,
    run: (editor, range) => editor.chain().focus().deleteRange(range).toggleOrderedList().run(),
  },
  {
    // P2-8: blockquote도 StarterKit 기본값으로 이미 켜져 있었다. "글머리 목록"/"번호 목록"과
    // 같은 블록 레벨 토글이라(선택 텍스트를 서식화하는 마크가 아니라 블록 구조 자체를
    // 바꾸는 명령) 버블 툴바가 아니라 슬래시 메뉴 항목으로 추가한다.
    title: "인용구",
    icon: ICON.quote,
    run: (editor, range) => editor.chain().focus().deleteRange(range).toggleBlockquote().run(),
  },
  {
    // P2-8: horizontalRule도 StarterKit 기본값으로 이미 켜져 있었다. "표"/"코드블록"과 같은
    // "삽입형" 명령이라(선택 영역을 서식화하는 게 아니라 새 블록을 끼워 넣음) 버블 툴바에는
    // 애초에 맞지 않아 슬래시 메뉴 항목으로만 추가한다.
    title: "구분선",
    icon: ICON.horizontalRule,
    run: (editor, range) => editor.chain().focus().deleteRange(range).setHorizontalRule().run(),
  },
  {
    title: "표",
    icon: ICON.table,
    run: (editor, range) => editor.chain().focus().deleteRange(range).insertTable({ rows: 2, cols: 2 }).run(),
  },
  {
    title: "코드블록",
    icon: ICON.codeBlock,
    run: (editor, range) => editor.chain().focus().deleteRange(range).toggleCodeBlock().run(),
  },
  {
    title: "인라인 코드",
    icon: ICON.inlineCode,
    run: (editor, range) => editor.chain().focus().deleteRange(range).toggleCode().run(),
  },
  {
    title: "정보 패널",
    icon: DEFAULT_PANEL_ICONS.info,
    run: (editor, range) =>
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .insertContent({
          type: "panel",
          attrs: { panelType: "info", icon: DEFAULT_PANEL_ICONS.info },
          content: [{ type: "paragraph" }],
        })
        .run(),
  },
  {
    title: "경고 패널",
    icon: DEFAULT_PANEL_ICONS.warning,
    run: (editor, range) =>
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .insertContent({
          type: "panel",
          attrs: { panelType: "warning", icon: DEFAULT_PANEL_ICONS.warning },
          content: [{ type: "paragraph" }],
        })
        .run(),
  },
  {
    title: "노트 패널",
    icon: DEFAULT_PANEL_ICONS.note,
    run: (editor, range) =>
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .insertContent({
          type: "panel",
          attrs: { panelType: "note", icon: DEFAULT_PANEL_ICONS.note },
          content: [{ type: "paragraph" }],
        })
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
      button.className = [
        "flex w-full items-center gap-2 rounded px-2 py-1 text-left text-sm",
        index === selectedIndex ? "bg-brand-subtle text-brand" : "hover:bg-surface-subtle",
      ].join(" ");
      // P17-6: 아이콘은 장식용이라 aria-hidden으로 감싼다 — 버튼의 접근성 이름은
      // title 텍스트 노드만으로 계속 결정된다. icon이 없는 CommandItem(하위 호환)은
      // 아이콘 span 자체를 만들지 않는다.
      if (item.icon) {
        const icon = document.createElement("span");
        icon.className = "flex h-4 w-4 shrink-0 items-center justify-center";
        icon.setAttribute("aria-hidden", "true");
        icon.innerHTML = item.icon;
        button.appendChild(icon);
      }
      const label = document.createElement("span");
      label.textContent = item.title;
      button.appendChild(label);
      button.addEventListener("mouseenter", () => {
        selectedIndex = index;
        renderItems();
      });
      // P17-12(표 툴바)와 같은 원인: 버튼 mousedown의 기본 동작을 막지 않으면 브라우저가
      // 에디터의 선택을 바꾸고, 그게 selectionchange로 ProseMirror에 전파되어 이 메뉴를
      // 활성화 중인 Suggestion 플러그인 상태가 "range 밖으로 벗어난 선택"으로 보고 즉시
      // onExit(메뉴 DOM 제거)을 실행해 버린다 — mousedown~click 사이에 버튼 자체가 DOM에서
      // 사라지면 click 이벤트가 아예 발생하지 않아 "항목을 선택해도 아무 반응이 없다"로 보인다.
      // 표 툴바와 동일한 표준 패턴(mousedown에서 preventDefault)으로 막는다.
      button.addEventListener("mousedown", (event) => {
        event.preventDefault();
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
