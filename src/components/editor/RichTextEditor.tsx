"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Node, type Editor } from "@tiptap/core";
import { EditorContent, useEditor, type JSONContent } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import type { EditorView } from "@tiptap/pm/view";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import StarterKit from "@tiptap/starter-kit";
import { Color, TextStyle } from "@tiptap/extension-text-style";
import Highlight from "@tiptap/extension-highlight";
import TiptapImage from "@tiptap/extension-image";
import { Table, TableCell, TableHeader, TableRow } from "@tiptap/extension-table";
import Placeholder from "@tiptap/extension-placeholder";
import { Button, Popover, useToast } from "@sfood/ui";
import { SlashCommandExtension, createSlashItems, type CommandItem } from "./SlashCommandExtension";
import { uploadImage } from "@/lib/editor/image-upload";
import { isSafeLinkHref } from "@/lib/editor/tiptap-to-storage";

// TipTap v3에서도 `editorProps.handleDrop`/`handlePaste`는 @tiptap/core의
// `EditorOptions.editorProps`가 그대로 감싸는 ProseMirror 자체 뷰 옵션이다
// (`@tiptap/pm/view`가 `prosemirror-view`를 재수출). 시그니처는
// `(view: EditorView, event: DragEvent, slice: Slice, moved: boolean) => boolean | void`
// (paste는 `slice`까지 3개)로 브리프의 예시보다 파라미터가 많지만, 이 파일처럼
// 뒤쪽 파라미터를 쓰지 않는 콜백은 TS 함수 타입 호환 규칙상 그대로 대입 가능하다.

/**
 * 문서 하나에 이미지가 통제 없이 계속 쌓이는 것을 막는 UX 가드레일(P0-4b) — 진짜
 * 보안/비용 경계인 파일 크기 상한(P0-4a, 값 결정 대기 중)과는 별개다. 서버에 다시
 * 저장하는 시점까지 강제하지는 않는다(task.md "범위 밖" 참고) — 세 업로드 진입점
 * (드래그앤드롭·붙여넣기·슬래시 메뉴)이 새 업로드를 시작하기 전에만 확인한다.
 */
const MAX_IMAGES_PER_DOCUMENT = 30;
const IMAGE_LIMIT_MESSAGE = `이미지는 문서당 최대 ${MAX_IMAGES_PER_DOCUMENT}장까지 첨부할 수 있습니다.`;

/** 현재 문서(ProseMirror doc)에 이미 삽입된 이미지 노드 수를 센다. */
function countImageNodes(doc: ProseMirrorNode): number {
  let count = 0;
  doc.descendants((node) => {
    if (node.type.name === "image") {
      count += 1;
    }
  });
  return count;
}

/** 드롭/붙여넣기로 받은 이미지를 업로드한 뒤, 해당 위치에 image 노드를 삽입한다. */
function insertUploadedImage(
  view: EditorView,
  pos: number,
  { url, filename }: { url: string; filename: string }
) {
  const { schema, doc } = view.state;
  const imageType = schema.nodes.image;
  if (!imageType) return;
  const insertPos = Math.min(pos, doc.content.size);
  const node = imageType.create({ src: url, filename });
  view.dispatch(view.state.tr.insert(insertPos, node));
}

/**
 * 슬래시 메뉴의 "이미지" 항목. pageId(저장된 문서)가 있어야 첨부 대상 페이지가 있으므로,
 * 드래그앤드롭/붙여넣기와 동일한 제약으로 pageId가 있을 때만 이 항목을 메뉴에 넣는다.
 * 파일 선택 다이얼로그는 숨긴 `<input type="file">`을 즉시 클릭해 띄운다.
 */
function createImageSlashItem(
  pageId: string,
  onError: (message: string) => void
): CommandItem {
  return {
    title: "이미지",
    run: (editor, range) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/png,image/jpeg,image/gif,image/webp";
      input.addEventListener("change", () => {
        const file = input.files?.[0];
        if (!file) return;

        if (countImageNodes(editor.state.doc) >= MAX_IMAGES_PER_DOCUMENT) {
          onError(IMAGE_LIMIT_MESSAGE);
          return;
        }

        editor.chain().focus().deleteRange(range).run();
        const pos = editor.state.selection.from;

        uploadImage(pageId, file)
          .then((uploaded) => insertUploadedImage(editor.view, pos, uploaded))
          .catch((error) => {
            onError(error instanceof Error ? error.message : "이미지 업로드에 실패했습니다.");
          });
      });
      input.click();
    },
  };
}

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

/*
 * 글자색/하이라이트는 원래 브라우저 기본 <input type="color">(OS 컬러 피커)를 그대로
 * 노출했다 — 브라우저마다 UI가 다르고, 브랜드 톤과 무관한 임의 색을 고를 수 있어 문서
 * 색감이 쉽게 무너지는 문제가 있었다(2026-08-26 UI 진단). Notion처럼 정해진 팔레트만
 * 고르게 하되, 값은 하드코딩 hex 대신 이 프로젝트의 CSS 변수 토큰을 그대로 참조해
 * 다크/라이트 테마가 바뀌어도 같은 팔레트가 자동으로 따라가게 한다.
 */
const TEXT_COLOR_SWATCHES: { name: string; value: string }[] = [
  { name: "기본", value: "var(--color-foreground)" },
  { name: "보조", value: "var(--color-secondary)" },
  { name: "브랜드", value: "var(--color-brand)" },
  { name: "위험", value: "var(--color-danger)" },
  { name: "경고", value: "var(--color-warning)" },
  { name: "성공", value: "var(--color-success)" },
  { name: "정보", value: "var(--color-info)" },
];

// 하이라이트는 배경색이라 텍스트 색과 달리 옅은 틴트여야 어느 테마에서든 글자를
// 가리지 않는다. color-mix로 각 상태색을 옅게 섞어 옅은 배경 톤을 만든다.
const HIGHLIGHT_SWATCHES: { name: string; value: string }[] = [
  { name: "브랜드", value: "color-mix(in srgb, var(--color-brand) 35%, transparent)" },
  { name: "경고", value: "color-mix(in srgb, var(--color-warning) 45%, transparent)" },
  { name: "성공", value: "color-mix(in srgb, var(--color-success) 40%, transparent)" },
  { name: "정보", value: "color-mix(in srgb, var(--color-info) 40%, transparent)" },
  { name: "위험", value: "color-mix(in srgb, var(--color-danger) 35%, transparent)" },
];

function SwatchGrid({
  swatches,
  onPick,
  onClear,
}: {
  swatches: { name: string; value: string }[];
  onPick: (value: string) => void;
  onClear: () => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-4 gap-1.5">
        {swatches.map((swatch) => (
          <button
            key={swatch.name}
            type="button"
            title={swatch.name}
            aria-label={swatch.name}
            className="h-7 w-7 rounded-full border border-border"
            style={{ backgroundColor: swatch.value }}
            onClick={() => onPick(swatch.value)}
          />
        ))}
      </div>
      <button
        type="button"
        className="rounded-btn px-2 py-1 text-left text-xs text-muted hover:bg-surface-raised"
        onClick={onClear}
      >
        색상 지우기
      </button>
    </div>
  );
}

function LinkPopoverForm({ editor }: { editor: Editor }) {
  const { toast } = useToast();
  const [href, setHref] = useState(editor.getAttributes("link").href ?? "");
  const inputRef = useRef<HTMLInputElement>(null);

  // Popover는 열려 있을 때만 children을 마운트하므로, 마운트 시점에 포커스를 주면
  // 열릴 때마다 자연스럽게 입력에 커서가 놓인다(기존 window.prompt()가 주던 것과
  // 동일한 즉시 입력 가능 상태를 재현). Popover가 적용 후 자동으로 닫히지는 않지만
  // (외부에서 제어할 수 있는 API가 없음), 배경 문서에는 즉시 반영되고 바깥을 클릭하거나
  // Escape로 닫을 수 있다 — 색상/하이라이트 팔레트와 동일한 동작이다.
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function submit() {
    if (!href.trim()) {
      editor.chain().focus().unsetLink().run();
      return;
    }
    if (!isSafeLinkHref(href)) {
      toast("허용되지 않는 링크 형식입니다. http(s):// 또는 mailto: 링크만 사용할 수 있습니다.", "danger");
      return;
    }
    editor.chain().focus().setLink({ href }).run();
  }

  return (
    <form
      className="flex items-center gap-1.5"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <input
        ref={inputRef}
        type="url"
        inputMode="url"
        aria-label="링크 URL"
        placeholder="https://..."
        className="w-56 rounded-input border border-border bg-surface px-2 py-1 text-sm text-foreground outline-none placeholder:text-placeholder focus:border-brand focus:ring-2 focus:ring-brand"
        value={href}
        onChange={(event) => setHref(event.target.value)}
      />
      <Button type="submit" variant="primary" size="sm">
        적용
      </Button>
    </form>
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
        <Popover
          trigger={
            <ToggleButton active={!!editor.getAttributes("textStyle").color} label="글자 색상" onClick={() => {}}>
              A
            </ToggleButton>
          }
        >
          <SwatchGrid
            swatches={TEXT_COLOR_SWATCHES}
            onPick={(value) => editor.chain().focus().setColor(value).run()}
            onClear={() => editor.chain().focus().unsetColor().run()}
          />
        </Popover>
        <Popover
          trigger={
            <ToggleButton active={editor.isActive("highlight")} label="하이라이트" onClick={() => {}}>
              형광펜
            </ToggleButton>
          }
        >
          <SwatchGrid
            swatches={HIGHLIGHT_SWATCHES}
            onPick={(value) => editor.chain().focus().toggleHighlight({ color: value }).run()}
            onClear={() => editor.chain().focus().unsetHighlight().run()}
          />
        </Popover>
        <Popover
          trigger={
            <ToggleButton active={editor.isActive("link")} label="링크" onClick={() => {}}>
              링크
            </ToggleButton>
          }
        >
          <LinkPopoverForm editor={editor} />
        </Popover>
      </div>
    </BubbleMenu>
  );
}

/**
 * 원래는(P0~P1-6까지) 에디터 콘텐츠 위쪽에 고정된 정적 블록이었다 — 문서 맨 위에서만
 * 표를 다루는 짧은 문서에선 문제가 없었지만, 실사용 확인(2026-08-31) 결과 표가 문서
 * 중간·아래쪽에 있으면 컨트롤이 화면 상단에 그대로 남아 스크롤 밖으로 벗어나 "표를
 * 만들 수는 있는데 컨트롤이 안 보인다"는 문제가 있었다. `EditorBubbleMenu`와 같은
 * `BubbleMenu`(플로팅 UI, 선택 위치를 자동으로 따라다님)로 바꿔 커서가 표 안에 있을 때
 * 표 바로 위/아래에 뜨도록 고쳤다 — `shouldShow`로 "표 안에 커서가 있는가"만 직접
 * 판단하므로(텍스트 버블 메뉴의 기본 동작인 "선택 영역이 비어있지 않을 때만 표시"를
 * 따르지 않음), 텍스트를 선택하지 않고 커서만 놓아도 표시된다.
 */
function TableControls({ editor }: { editor: Editor | null }) {
  if (!editor) return null;

  return (
    <BubbleMenu
      editor={editor}
      shouldShow={({ editor: currentEditor }) => currentEditor.isActive("table")}
      options={{ placement: "top" }}
    >
      <div className="flex flex-wrap gap-1 rounded-md border border-border bg-surface p-1 shadow-md">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={!editor.can().addRowBefore()}
          onClick={() => editor.chain().focus().addRowBefore().run()}
          aria-label="행 추가(위)"
        >
          행 추가(위)
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={!editor.can().addRowAfter()}
          onClick={() => editor.chain().focus().addRowAfter().run()}
          aria-label="행 추가(아래)"
        >
          행 추가(아래)
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={!editor.can().deleteRow()}
          onClick={() => editor.chain().focus().deleteRow().run()}
          aria-label="행 삭제"
        >
          행 삭제
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={!editor.can().addColumnBefore()}
          onClick={() => editor.chain().focus().addColumnBefore().run()}
          aria-label="열 추가(왼쪽)"
        >
          열 추가(왼쪽)
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={!editor.can().addColumnAfter()}
          onClick={() => editor.chain().focus().addColumnAfter().run()}
          aria-label="열 추가(오른쪽)"
        >
          열 추가(오른쪽)
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={!editor.can().deleteColumn()}
          onClick={() => editor.chain().focus().deleteColumn().run()}
          aria-label="열 삭제"
        >
          열 삭제
        </Button>
        {/* 행/열 조작과 셀 병합/분할은 서로 다른 조작 그룹이라 구분선으로 나눈다. */}
        <div className="mx-0.5 my-0.5 w-px bg-border" aria-hidden="true" />
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
    </BubbleMenu>
  );
}

export interface RichTextEditorProps {
  content: JSONContent;
  onChange: (doc: JSONContent) => void;
  /**
   * 저장된 문서의 ID. 있을 때만 이미지 드래그앤드롭/붙여넣기 업로드가
   * 활성화된다 — 새 문서(저장 전)는 첨부파일을 등록할 대상 페이지가 없으므로
   * "문서를 먼저 저장해야 이미지 등록 가능"이라는 기존 제약과 동일하게
   * 비활성 상태로 둔다.
   */
  pageId?: string;
}

export function RichTextEditor({ content, onChange, pageId }: RichTextEditorProps) {
  const { toast } = useToast();

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        link: { openOnClick: false },
      }),
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      AttachmentImage,
      Panel,
      Table.configure({ resizable: false }),
      TableRow,
      TableHeader,
      TableCell,
      // 박스(Card) 없이 페이지 전체가 캔버스로 보이는 구조로 바뀌면서(2026-08-25),
      // 문서가 비어 있을 때 아무 테두리도 없어 "쓰는 자리 자체가 없다"고 느껴지는
      // 문제가 생겼다(사용자 피드백 — 실제로는 24px짜리 빈 <p>가 있어 편집기 자체는
      // 정상 동작하지만 시각적으로 보이지 않았다). 빈 문서에 안내 문구를 띄워 캔버스가
      // 눈에 보이게 한다 — 실제 스타일은 globals.css의 `.ProseMirror p.is-editor-empty`.
      Placeholder.configure({
        placeholder: "내용을 입력하세요. '/'를 입력하면 서식을 빠르게 넣을 수 있어요.",
      }),
      pageId
        ? SlashCommandExtension.configure({
            suggestion: {
              items: ({ query }: { query: string }) =>
                createSlashItems(query, [
                  createImageSlashItem(pageId, (message) => toast(message, "danger")),
                ]),
            },
          })
        : SlashCommandExtension,
    ],
    content,
    onUpdate: ({ editor: currentEditor }) => {
      onChange(currentEditor.getJSON());
    },
    immediatelyRender: false,
    editorProps: {
      // 브라우저 기본 맞춤법 검사가 한글 문장 곳곳에 빨간 물결 밑줄을 그려 Notion/Confluence
      // 캡쳐와 나란히 비교했을 때 유독 지저분해 보였다(2026-08-26, 사용자 피드백).
      attributes: { spellcheck: "false" },
      handleDrop: (view, event) => {
        const file = event.dataTransfer?.files?.[0];
        if (!file || !file.type.startsWith("image/")) return false;
        event.preventDefault();

        // 문서를 저장하기 전(pageId 없음)에는 첨부 대상 페이지가 없어 업로드할 수 없다.
        // 예전에는 아무 안내 없이 조용히 무시해서 "이미지가 안 된다"로만 보였다
        // (2026-08-26 실사용 확인) — 이유를 토스트로 알린다.
        if (!pageId) {
          toast("문서를 먼저 저장한 뒤에 이미지를 추가할 수 있습니다.", "info");
          return true;
        }
        if (countImageNodes(view.state.doc) >= MAX_IMAGES_PER_DOCUMENT) {
          toast(IMAGE_LIMIT_MESSAGE, "info");
          return true;
        }

        const coords = view.posAtCoords({ left: event.clientX, top: event.clientY });
        const pos = coords?.pos ?? view.state.selection.from;

        uploadImage(pageId, file)
          .then((uploaded) => insertUploadedImage(view, pos, uploaded))
          .catch((error) => {
            toast(error instanceof Error ? error.message : "이미지 업로드에 실패했습니다.", "danger");
          });
        return true;
      },
      handlePaste: (view, event) => {
        const file = event.clipboardData?.files?.[0];
        if (!file || !file.type.startsWith("image/")) return false;
        event.preventDefault();

        if (!pageId) {
          toast("문서를 먼저 저장한 뒤에 이미지를 추가할 수 있습니다.", "info");
          return true;
        }
        if (countImageNodes(view.state.doc) >= MAX_IMAGES_PER_DOCUMENT) {
          toast(IMAGE_LIMIT_MESSAGE, "info");
          return true;
        }

        const pos = view.state.selection.from;

        uploadImage(pageId, file)
          .then((uploaded) => insertUploadedImage(view, pos, uploaded))
          .catch((error) => {
            toast(error instanceof Error ? error.message : "이미지 업로드에 실패했습니다.", "danger");
          });
        return true;
      },
    },
  });

  return (
    <>
      {editor && <EditorBubbleMenu editor={editor} />}
      {editor && <TableControls editor={editor} />}
      {/*
        2026-08-25에는 prose-sm(본문 14px)으로 낮췄었다 — 그런데 그 저해상도 노트북
        문제의 실제 원인은 헤더의 버튼/링크/태그류(px 낭비가 큰 UI 크롬)였지 본문
        읽기 영역이 아니었다. 그 UI 크롬은 여전히 text-sm으로 압축된 채 유지하고,
        본문만 사내 문서 뷰어(SF-Note) 캡쳐와 비교해 표준 prose 스케일(본문 16px,
        H1 36px/H2 24px/H3 20px)로 되돌렸다(2026-08-26, 실측 비교 — SF-Note의 실제
        본문 폭이 약 819px로 이 프로젝트의 max-w-[820px]와 사실상 동일했고, 다른 건
        본문·헤딩 글자 크기뿐이었다).
        본문 글자색은 `dark:prose-invert`가 아니라 globals.css에서 --tw-prose-* 변수를
        이 프로젝트 토큰에 직접 매핑해 해결한다 — Tailwind의 dark: variant는
        prefers-color-scheme 미디어 쿼리만 따르는데, 이 앱은 ThemeToggle이 다는
        [data-theme] 속성으로 테마를 정하기 때문에 "OS는 다크, 앱은 라이트로 명시
        선택"한 상태에서 dark:prose-invert가 여전히 발동해 흰 배경 위에 거의 안 보이는
        밝은 글자가 남는 심각한 문제가 있었다(2026-08-26 실사용 확인, globals.css의
        해당 주석 참고). --tw-prose-* 직접 매핑은 이 앱이 실제로 테마를 정하는 방식과
        항상 일치하므로 이 문제 자체가 생기지 않는다.
      */}
      <EditorContent editor={editor} className="prose max-w-none" />
    </>
  );
}
