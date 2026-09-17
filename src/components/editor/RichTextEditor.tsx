"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { findParentNodeClosestToPos, mergeAttributes, Node, type Editor, type Range } from "@tiptap/core";

import {
  EditorContent,
  NodeViewContent,
  NodeViewWrapper,
  ReactNodeViewRenderer,
  ReactRenderer,
  useEditor,
  useEditorState,
  type JSONContent,
  type NodeViewProps,
} from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import type { EditorView } from "@tiptap/pm/view";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { columnResizing, tableEditing } from "@tiptap/pm/tables";
import StarterKit from "@tiptap/starter-kit";
import { Color, FontSize, TextStyle } from "@tiptap/extension-text-style";
import Highlight from "@tiptap/extension-highlight";
import TiptapImage from "@tiptap/extension-image";
import { Link } from "@tiptap/extension-link";
import { CodeBlockLowlight } from "@tiptap/extension-code-block-lowlight";
import { common, createLowlight } from "lowlight";
import { Table, TableCell, TableHeader, TableRow, TableView } from "@tiptap/extension-table";
import Placeholder from "@tiptap/extension-placeholder";
import { Button, Modal, Popover, Select, Spinner, Tooltip, useToast } from "@sfood/ui";
import { SlashCommandExtension, createSlashItems, type CommandItem } from "./SlashCommandExtension";
import { uploadImage } from "@/lib/editor/image-upload";
import { isSafeLinkHref } from "@/lib/editor/tiptap-to-storage";
import { CURATED_PANEL_ICONS, resolvePanelIcon } from "@/lib/editor/panel-icons";
import { DocumentLinkPickerModal } from "./DocumentLinkPickerModal";


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

// P17-1/P17-2: 신규 문서(저장 전, pageId 없음)에서 이미지·문서 링크를 시도했을 때 보여줄
// 안내 문구. 드래그앤드롭/붙여넣기 경로가 이미 이 문구(이미지 쪽)로 안내하고 있어 그대로
// 재사용하고, 문서 링크도 같은 문구 패턴으로 맞춘다.
const NOT_SAVED_IMAGE_MESSAGE = "문서를 먼저 저장한 뒤에 이미지를 추가할 수 있습니다.";
const NOT_SAVED_IMAGE_REUPLOAD_MESSAGE = "문서를 먼저 저장한 뒤에 이미지를 다시 업로드할 수 있습니다.";
const NOT_SAVED_DOCUMENT_LINK_MESSAGE = "문서를 먼저 저장한 뒤에 문서 링크를 추가할 수 있습니다.";

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

/**
 * P1-7d(Word/Google Docs 붙여넣기 서식 정제): Word·Google Docs는 텍스트 조각마다
 * `<span style="color:...; font-family:...; mso-...">`처럼 인라인 스타일을 촘촘히
 * 붙여서 내보낸다. 이 프로젝트의 `TextStyle`/`Color` 마크는 `style` 속성이 있는 `<span>`을
 * 만나면 그 안의 `color`를 그대로 읽어들이도록 되어 있다(`@tiptap/extension-text-style`
 * 확인) — 즉 붙여넣기를 그대로 두면, 글자색 팔레트를 정해진 스와치로만 고르게 제한한
 * 기존 결정(2026-08-26, "임의 색을 못 고르게 했다")이 붙여넣기 경로로는 그냥 우회된다.
 * 원본 출처가 Word인지 Google Docs인지 감지해서 다르게 처리하지 않는다 — 이 스키마가
 * 애초에 임의의 인라인 스타일을 지원하지 않으므로, 어느 외부 출처에서 오든 `style` 속성은
 * 전부 걷어내는 것이 같은 문제(색상·폰트·크기 등 브랜드 톤과 무관한 서식이 새어 들어옴)의
 * 근본 해결이다. 같은 세션 안에서 이 에디터 자신이 만든 텍스트를 복사해 다시 붙여넣는
 * 경우는 ProseMirror가 그 붙여넣기를 브라우저 클립보드 HTML 재파싱 없이 원본 슬라이스를
 * 그대로 재사용하는 내부 최적화 경로를 타므로(같은 탭·같은 세션 한정) 이 변환을 거치지
 * 않아 서식이 그대로 유지된다 — 영향받는 것은 외부 출처에서 오는 붙여넣기뿐이다.
 */
function stripPastedInlineStyles(html: string): string {
  const parsed = new DOMParser().parseFromString(html, "text/html");
  parsed.body.querySelectorAll("[style]").forEach((element) => {
    element.removeAttribute("style");
  });
  return parsed.body.innerHTML;
}

/**
 * P17-9: 업로드가 끝날 때까지(드래그앤드롭·붙여넣기·슬래시 메뉴 세 경로 공통) 업로드 중임을
 * 보여주는 자리표시자(placeholder) image 노드를 그 자리에 바로 심는다 — 이전에는 업로드가
 * 끝난 뒤에야 노드를 삽입해서, 그 사이(특히 느린 네트워크)에는 아무 반응이 없어 "진행 중인지
 * 알 수 없다"는 지적을 받았다. `uploadId`로 나중에 같은 노드를 다시 찾아 결과를 반영한다
 * (transaction을 넘나드는 위치 추적 대신, 완료 시점의 현재 문서에서 다시 스캔하는 방식 —
 * 그 사이 사용자가 다른 곳을 편집해 위치가 밀려도 안전하다).
 */
function insertUploadPlaceholder(
  view: EditorView,
  pos: number,
  { uploadId, filename }: { uploadId: string; filename: string }
) {
  const { schema, doc } = view.state;
  const imageType = schema.nodes.image;
  if (!imageType) return;
  const insertPos = Math.min(pos, doc.content.size);
  const node = imageType.create({ uploadId, filename, uploading: true });
  view.dispatch(view.state.tr.insert(insertPos, node));
}

/** 현재 문서에서 `uploadId`가 일치하는 업로드 자리표시자 image 노드를 찾는다. */
function findUploadPlaceholder(
  doc: ProseMirrorNode,
  uploadId: string
): { pos: number; node: ProseMirrorNode } | null {
  let found: { pos: number; node: ProseMirrorNode } | null = null;
  doc.descendants((node, pos) => {
    if (found) return false;
    if (node.type.name === "image" && node.attrs.uploadId === uploadId) {
      found = { pos, node };
      return false;
    }
  });
  return found;
}

/** 업로드 성공: 자리표시자를 실제 이미지(첨부 URL)로 바꾼다. 이미 지워졌으면(사용자가 업로드 중 삭제) 아무 일도 하지 않는다. */
function resolveUploadPlaceholder(
  view: EditorView,
  uploadId: string,
  { url, filename }: { url: string; filename: string }
) {
  const match = findUploadPlaceholder(view.state.doc, uploadId);
  if (!match) return;
  view.dispatch(
    view.state.tr.setNodeMarkup(match.pos, undefined, {
      ...match.node.attrs,
      src: url,
      filename,
      uploading: false,
      uploadId: null,
    })
  );
}

/** 업로드 실패: 자리표시자를 지운다. 이미 지워졌으면 아무 일도 하지 않는다. */
function removeUploadPlaceholder(view: EditorView, uploadId: string) {
  const match = findUploadPlaceholder(view.state.doc, uploadId);
  if (!match) return;
  view.dispatch(view.state.tr.delete(match.pos, match.pos + match.node.nodeSize));
}

/**
 * P17-8: "다시 업로드" 실패 시 쓴다 — 이번엔 새로 삽입된 자리표시자가 아니라 이미
 * 있던 이미지를 잠시 업로드 중 상태로 바꿔둔 것이므로, 실패했다고 `removeUploadPlaceholder`
 * 처럼 노드를 지워버리면 사용자의 기존 이미지가 통째로 사라진다. 재업로드 시작 전
 * attrs를 그대로 복원해 원래 이미지로 되돌린다.
 */
function revertUploadPlaceholder(view: EditorView, uploadId: string, previousAttrs: Record<string, unknown>) {
  const match = findUploadPlaceholder(view.state.doc, uploadId);
  if (!match) return;
  view.dispatch(view.state.tr.setNodeMarkup(match.pos, undefined, previousAttrs));
}

/**
 * 슬래시 메뉴의 "이미지" 항목. pageId(저장된 문서)가 있어야 첨부 대상 페이지가 있다 —
 * P17-1 이전에는 pageId가 없으면 이 항목 자체를 메뉴에서 뺐는데, 사용자에게는 "/이미지"를
 * 쳐도 항목이 안 보이거나 "일치하는 항목 없음"만 떠서 "아무 반응 없음"으로 보였다. 이제는
 * 메뉴에 항상 넣어두고, 클릭 시점에 pageId가 없으면 드래그앤드롭/붙여넣기와 같은 안내
 * 토스트를 띄운다. 파일 선택 다이얼로그는 숨긴 `<input type="file">`을 즉시 클릭해 띄운다.
 */
// P17-6: 슬래시 메뉴 항목 아이콘 — 기존 `TableIcon`/`CodeCopyIcon`과 같은 시각
// 스타일(viewBox 0 0 24 24, stroke=currentColor, stroke-width=2, h-4 w-4)이지만,
// `CommandItem.icon`은 문자열(SVG 마크업)이라 여기서는 JSX가 아니라 템플릿 문자열로
// 정의한다(`SlashCommandExtension.ts`의 순수 DOM 렌더러가 그대로 innerHTML로 꽂는다).
const IMAGE_SLASH_ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9.5" r="1.5"/><polyline points="21 15 15 9 5 19"/></svg>';
const DOCUMENT_LINK_SLASH_ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4"><path d="M9 15l6-6"/><path d="M11 6l1-1a3 3 0 0 1 4 4l-1 1"/><path d="M13 18l-1 1a3 3 0 0 1-4-4l1-1"/></svg>';

export function createImageSlashItem(
  pageId: string | undefined,
  notify: (message: string, variant?: "info" | "danger") => void
): CommandItem {
  return {
    title: "이미지",
    icon: IMAGE_SLASH_ICON,
    run: (editor, range) => {
      if (!pageId) {
        notify(NOT_SAVED_IMAGE_MESSAGE, "info");
        return;
      }
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/png,image/jpeg,image/gif,image/webp";
      input.addEventListener("change", () => {
        const file = input.files?.[0];
        if (!file) return;

        if (countImageNodes(editor.state.doc) >= MAX_IMAGES_PER_DOCUMENT) {
          notify(IMAGE_LIMIT_MESSAGE);
          return;
        }

        editor.chain().focus().deleteRange(range).run();
        const pos = editor.state.selection.from;
        const uploadId = crypto.randomUUID();
        insertUploadPlaceholder(editor.view, pos, { uploadId, filename: file.name });

        uploadImage(pageId, file)
          .then((uploaded) => resolveUploadPlaceholder(editor.view, uploadId, uploaded))
          .catch((error) => {
            removeUploadPlaceholder(editor.view, uploadId);
            notify(error instanceof Error ? error.message : "이미지 업로드에 실패했습니다.");
          });
      });
      input.click();
    },
  };
}

/**
 * 슬래시 메뉴의 "문서 링크" 항목(P10-1). "이미지"와 달리 이 자리에서 바로 편집기를
 * 조작하지 않는다 — 어떤 문서를 링크할지 검색해서 골라야 하므로, 실제 삭제·삽입은
 * `onOpen`이 연 검색 피커 모달에서 문서를 고른 뒤(`RichTextEditor` 컴포넌트 안) 이뤄진다.
 * P17-2 이전에는 "이미지"와 같은 이유로 pageId가 있을 때만 메뉴에 노출했는데, 그러면
 * 저장 전 문서에서는 항목 자체가 안 보여 "아무 반응 없음"으로 느껴졌다 — 이제는 항상
 * 노출하고, pageId가 없으면 피커를 열지 않고 안내 토스트만 띄운다.
 */
export function createDocumentLinkSlashItem(
  pageId: string | undefined,
  onOpen: (range: Range) => void,
  notify: (message: string, variant?: "info" | "danger") => void
): CommandItem {
  return {
    title: "문서 링크",
    icon: DOCUMENT_LINK_SLASH_ICON,
    run: (_editor, range) => {
      if (!pageId) {
        notify(NOT_SAVED_DOCUMENT_LINK_MESSAGE, "info");
        return;
      }
      onOpen(range);
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
// shims: Color (and, since 3.30.3, FontSize — confirmed via
// node_modules/@tiptap/extension-text-style/dist/index.cjs, no separate
// @tiptap/extension-font-size package needed) now live in
// @tiptap/extension-text-style, and TableRow/TableHeader/TableCell are
// exported from @tiptap/extension-table itself. We import from the
// consolidated packages directly rather than installing the deprecated
// shim packages (same rationale as Task 2's @tiptap/extension-list
// consolidation).

/**
 * P17-9: 업로드 중에는 `uploading: true`(+ 되찾기용 `uploadId`) 상태로 심어둔 자리표시자를
 * `ImageView`가 스피너로 렌더링한다 — 업로드가 끝나면(성공/실패) 이 attrs를 다시 갱신/삭제
 * 하므로 최종 저장 데이터(`tiptap-to-storage.ts`)에는 절대 남지 않는다(그쪽은 src/filename만
 * 읽는다). `uploading`/`uploadId`는 rendered:false로 둬 HTML(및 Confluence storage
 * 변환용 JSON parseHTML 왕복)에도 노출되지 않게 한다.
 */
const AttachmentImage = TiptapImage.extend({
  // P18-2: 기본 Image 확장은 draggable: true라 ProseMirror가 mousedown 시점에
  // 노드를 드래그 가능하게 만든다 — 새로 추가한 우측 경계 크기 조절 핸들을
  // 드래그하면 크기 조절이 아니라 "노드 이동/복제"로 처리돼버려(실사용 확인:
  // 핸들을 드래그하니 이미지가 복제됨) 크기 조절 기능과 충돌한다. 이 앱은 이미지
  // 드래그 재정렬 UI가 없으므로 draggable을 꺼서 크기 조절 핸들만 동작하게 한다.
  draggable: false,
  addAttributes() {
    return {
      ...this.parent?.(),
      filename: { default: null },
      uploadId: { default: null, rendered: false },
      uploading: { default: false, rendered: false },
    };
  },
  addNodeView() {
    return ReactNodeViewRenderer(ImageView);
  },
});

/**
 * P17-8: `ImageView`/`ImageBubbleMenu`(재업로드)는 `pageId`가 있어야 업로드 대상
 * 페이지를 알 수 있는데, 이 둘은 `RichTextEditor` 컴포넌트 밖(NodeView·BubbleMenu로
 * 별도 렌더링)이라 props로 직접 못 받는다. `CodeBlockView`가 `useToast()`를 직접
 * 호출하는 것과 같은 이유(포털로 렌더져도 같은 React 트리라 컨텍스트가 정상 동작)로,
 * Context를 하나 두고 `RichTextEditor`가 `<EditorContent>`를 감싸며 값을 제공한다.
 */
const ImagePageIdContext = createContext<string | undefined>(undefined);

/**
 * P18-2: 이미지·문서 링크 카드 크기 조절 — 사용자 지적 "resize에 대한 기능이 없어
 * ... 무조건 editor의 가로 full 사이즈로 설정이 돼"에 대응한다. 두 노드뷰가 똑같이
 * "우측 경계를 드래그하면 너비가 바뀐다"는 동작이 필요해 계산(clamp)과 드래그
 * 수명주기(mousedown→mousemove→mouseup)를 공용으로 뺀다 — "너비가 바뀔 때 높이를
 * 어떻게 할지"(이미지는 종횡비 유지, 카드는 안 바꿈)만 호출부가 정한다.
 */
const RESIZE_MIN_WIDTH = 100;

/** 너비를 [최소값, 최대값] 범위로 자른다 — 최대값은 보통 부모 컨테이너의 현재 폭. */
export function clampResizeWidth(width: number, maxWidth: number, minWidth = RESIZE_MIN_WIDTH): number {
  return Math.round(Math.min(Math.max(width, minWidth), Math.max(maxWidth, minWidth)));
}

/**
 * P18-2 후속(사용자 지적 — "사이즈 조절은 되는데 랜덤하게 또 보이네"): 핸들을
 * 드래그하면 그때마다 이미지가 `ImageBubbleMenu`(캡션 입력·다시 업로드·삭제
 * 버튼)와 함께 선택된 상태로 남는 버그가 있었다.
 *
 * 원인: 이미지처럼 `contentEditable=false`인 원자적 노드 위에서 mousedown 후
 * 누른 채로 움직이면(mousemove), 브라우저는 기본 동작으로 그 원자적 블록 전체를
 * 네이티브 선택 영역으로 잡는다(개발자 도구로 `window.getSelection()`을 찍어
 * 직접 확인 — 드래그 도중 이미 `Range`가 `.ProseMirror` 컨테이너를 앵커로 잡고
 * 있었다). ProseMirror는 `selectionchange`를 구독해 이 네이티브 선택을 자신의
 * `NodeSelection`으로 그대로 반영하므로, 우리가 만든 리사이즈 로직과 전혀
 * 무관하게 이미지가 선택돼버린다. `mousedown`에서만 `preventDefault`를 부르는
 * 걸로는 부족하다 — 이 "선택 영역 확장" 기본 동작은 각 `mousemove`/`mouseup`
 * 이벤트 자체의 기본 동작이라, 그 이벤트들에도 각각 `preventDefault`를 불러야
 * 막을 수 있다(처음엔 ProseMirror의 클릭 감지 자체가 원인이라고 잘못 짚어
 * NodeView `stopEvent` 콜백으로 막으려 했으나, 실제로 그 경로는 전혀 호출되지
 * 않았다 — 계측으로 확인 후 걷어냈다).
 *
 * 드래그 시작 시 콜백을 등록하는 순수 이벤트 배선 훅 — "지금 몇 px 움직였는지"만
 * 계산해 호출부에 넘긴다. `phase: "preview"`는 마우스가 움직이는 동안(매번), `phase:
 * "commit"`은 마우스를 뗀 시점(한 번)에 호출된다 — 실제 attrs 반영은 commit에서만
 * 하여(P17-9 자리표시자 패턴과 같은 이유) 드래그 중 히스토리가 매 픽셀마다 쌓이지
 * 않게 한다.
 */
function useDragResize(onDelta: (deltaX: number, phase: "preview" | "commit") => void) {
  return function handleMouseDown(event: ReactMouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    const startX = event.clientX;
    function handleMouseMove(moveEvent: MouseEvent) {
      moveEvent.preventDefault();
      onDelta(moveEvent.clientX - startX, "preview");
    }
    function handleMouseUp(upEvent: MouseEvent) {
      upEvent.preventDefault();
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      onDelta(upEvent.clientX - startX, "commit");
    }
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };
}

/**
 * 공용 크기 조절 핸들 — 이미지·문서 링크 카드 둘 다 같은 시각 스타일(우측 경계,
 * 호버 시에만 보임)을 쓴다. `role="slider"`는 시각적으로 드래그 가능한 요소임을
 * 스크린리더에도 알리지만, 실제 키보드 조작은 지원하지 않는다(task.md "범위 밖" —
 * 대부분의 에디터가 마우스 드래그만 지원하는 것과 같은 범위).
 */
function ResizeHandle({
  label,
  widthPx,
  onMouseDown,
}: {
  label: string;
  /** 현재 너비(px) — `role="slider"`의 필수 접근성 속성(`aria-valuenow`)에 그대로 쓴다. */
  widthPx: number;
  onMouseDown: (event: ReactMouseEvent) => void;
}) {
  return (
    <span
      role="slider"
      aria-label={label}
      aria-orientation="horizontal"
      aria-valuenow={widthPx}
      aria-valuemin={RESIZE_MIN_WIDTH}
      tabIndex={-1}
      className="node-resize-handle"
      onMouseDown={onMouseDown}
      // 문서 링크 카드는 핸들이 <button> 안에 있다 — 드래그 없이 핸들만 살짝
      // 클릭해도 그 click이 버튼까지 올라가 문서로 이동해버리는 걸 막는다.
      onClick={(event) => event.stopPropagation()}
    />
  );
}

/** 업로드 중인 이미지 자리표시자 — 스피너 + 안내 문구로 "진행 중"임을 보여준다(P17-9). */
function ImageView({ node, updateAttributes }: Pick<NodeViewProps, "node" | "updateAttributes">) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [previewSize, setPreviewSize] = useState<{ width: number; height: number } | null>(null);
  const dragStateRef = useRef<{ startWidth: number; maxWidth: number; aspectRatio: number } | null>(null);

  // P18-2: 우측 경계 드래그로 너비를 조절한다 — 이미지는 원본 종횡비를 유지하며
  // 높이도 함께 바뀐다(드래그 시작 시점의 렌더 크기로 비율을 계산 — `naturalWidth`/
  // `naturalHeight`가 있으면 그걸 우선한다. 둘 다 원본 이미지 자체의 가로세로
  // 비율이라 같은 값이어야 정상이지만, 아주 드물게 이미지가 아직 완전히 로드되지
  // 않은 시점에 드래그를 시작하면 `natural*`이 0일 수 있어 그럴 때만 현재 렌더
  // 크기로 대체한다).
  const handleResizeMouseDown = useDragResize((deltaX, phase) => {
    const state = dragStateRef.current;
    if (!state) return;
    const width = clampResizeWidth(state.startWidth + deltaX, state.maxWidth);
    const height = Math.round(width * state.aspectRatio);
    if (phase === "preview") {
      setPreviewSize({ width, height });
    } else {
      updateAttributes({ width, height });
      setPreviewSize(null);
      dragStateRef.current = null;
    }
  });

  function startResize(event: ReactMouseEvent) {
    const img = imgRef.current;
    const wrapper = img?.parentElement;
    if (!img || !wrapper) return;
    const rect = img.getBoundingClientRect();
    const maxWidth = wrapper.parentElement?.getBoundingClientRect().width ?? rect.width;
    const aspectRatio =
      img.naturalWidth && img.naturalHeight ? img.naturalHeight / img.naturalWidth : (rect.height || 1) / (rect.width || 1);
    dragStateRef.current = { startWidth: rect.width, maxWidth, aspectRatio };
    handleResizeMouseDown(event);
  }

  if (node.attrs.uploading) {
    return (
      <NodeViewWrapper
        contentEditable={false}
        className="flex min-h-[120px] items-center justify-center gap-2 rounded-md border border-border bg-surface-subtle text-sm text-muted"
      >
        <Spinner size="sm" />
        <span>{node.attrs.filename ? `${node.attrs.filename} 업로드 중…` : "이미지 업로드 중…"}</span>
      </NodeViewWrapper>
    );
  }

  const savedWidth = typeof node.attrs.width === "number" ? node.attrs.width : null;
  const savedHeight = typeof node.attrs.height === "number" ? node.attrs.height : null;
  const sizeStyle = previewSize ?? (savedWidth ? { width: savedWidth, height: savedHeight ?? undefined } : undefined);

  return (
    <NodeViewWrapper contentEditable={false}>
      <span className="resizable-node">
        {/* Confluence 첨부파일 URL은 사전에 알 수 없는 임의 외부 호스트라 next/image의
            remotePatterns 설정 대상이 될 수 없다 — 에디터 본문 이미지는 기존에도(NodeView
            도입 전, TipTap의 renderHTML을 통해) 평범한 <img>였다. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={imgRef}
          src={node.attrs.src ?? undefined}
          alt={node.attrs.alt ?? ""}
          title={node.attrs.title ?? undefined}
          style={sizeStyle}
        />
        <ResizeHandle label="이미지 너비 조절" widthPx={sizeStyle?.width ?? 0} onMouseDown={startResize} />
      </span>
    </NodeViewWrapper>
  );
}

/**
 * 콜아웃 아이콘 트리거(P9-2) — 클릭하면 큐레이션된 이모지 그리드가 담긴 `Popover`가
 * 열린다(글자색/하이라이트 스와치 팝오버와 같은 패턴, 아래 `SwatchGrid` 참고).
 * `contentEditable={false}`로 감싸 ProseMirror가 이 버튼 자체를 텍스트로 취급하지
 * 않게 한다(이미지 등 다른 커스텀 노드와 동일한 관례).
 */
function PanelIconPicker({ node, updateAttributes }: Pick<NodeViewProps, "node" | "updateAttributes">) {
  const icon = resolvePanelIcon(node.attrs.panelType, node.attrs.icon);
  return (
    <span contentEditable={false} className="inline-flex">
      <Popover
        trigger={
          <button type="button" className="panel-icon" aria-label="콜아웃 아이콘 바꾸기">
            {icon}
          </button>
        }
      >
        <div className="grid grid-cols-6 gap-1">
          {CURATED_PANEL_ICONS.map((candidate) => (
            <button
              key={candidate}
              type="button"
              aria-label={candidate}
              className="flex h-8 w-8 items-center justify-center rounded-md text-lg hover:bg-surface-subtle"
              onClick={() => updateAttributes({ icon: candidate })}
            >
              {candidate}
            </button>
          ))}
        </div>
      </Popover>
    </span>
  );
}

function PanelView({ node, updateAttributes }: NodeViewProps) {
  return (
    <NodeViewWrapper className={`panel panel-${node.attrs.panelType}`} data-panel-type={node.attrs.panelType}>
      <PanelIconPicker node={node} updateAttributes={updateAttributes} />
      <NodeViewContent className="panel-content" />
    </NodeViewWrapper>
  );
}

const Panel = Node.create({
  name: "panel",
  group: "block",
  content: "block+",
  addAttributes() {
    return { panelType: { default: "info" }, icon: { default: null } };
  },
  parseHTML() {
    return [
      {
        tag: "div[data-panel-type]",
        contentElement: ".panel-content",
        getAttrs: (el) => ({
          panelType: (el as HTMLElement).getAttribute("data-panel-type"),
          icon: (el as HTMLElement).getAttribute("data-panel-icon"),
        }),
      },
    ];
  },
  renderHTML({ node }) {
    const icon = resolvePanelIcon(node.attrs.panelType, node.attrs.icon);
    return [
      "div",
      {
        "data-panel-type": node.attrs.panelType,
        "data-panel-icon": icon,
        class: `panel panel-${node.attrs.panelType}`,
      },
      ["span", { class: "panel-icon", "aria-hidden": "true" }, icon],
      ["div", { class: "panel-content" }, 0],
    ];
  },
  addNodeView() {
    return ReactNodeViewRenderer(PanelView);
  },
});

/**
 * 문서 링크 카드(P10-1) — 노션의 "하위 페이지 링크" 블록에 대응한다. `panel`과 달리
 * 내부에 편집 가능한 콘텐츠가 없는 atom 노드다: 삽입 시점에 고른 문서의 `pageId`·제목을
 * attrs로 캐시해 두고 그대로 보여준다(실시간 재조회 없음 — task.md "결정이 필요한 사항"
 * 참고). 아이콘은 문서 데이터 모델에 아이콘 필드가 없어 모든 카드가 고정 이모지(📄)를 쓴다.
 */
function DocumentLinkView({ node, updateAttributes }: Pick<NodeViewProps, "node" | "updateAttributes">) {
  const router = useRouter();
  const cardRef = useRef<HTMLButtonElement>(null);
  const [previewWidth, setPreviewWidth] = useState<number | null>(null);
  const dragStateRef = useRef<{ startWidth: number; maxWidth: number } | null>(null);
  const pageId = String(node.attrs.pageId ?? "");
  const title = String(node.attrs.title ?? "").trim() || "(제목 없음)";

  // P18-2: 이미지와 같은 우측 경계 드래그 — 카드는 이미지와 달리 높이가 내용
  // (제목 길이)에 따라 자연스럽게 정해지는 요소라 너비만 조절한다.
  const handleResizeMouseDown = useDragResize((deltaX, phase) => {
    const state = dragStateRef.current;
    if (!state) return;
    const width = clampResizeWidth(state.startWidth + deltaX, state.maxWidth);
    if (phase === "preview") {
      setPreviewWidth(width);
    } else {
      updateAttributes({ width });
      setPreviewWidth(null);
      dragStateRef.current = null;
    }
  });

  function startResize(event: ReactMouseEvent) {
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const maxWidth = card.parentElement?.getBoundingClientRect().width ?? rect.width;
    dragStateRef.current = { startWidth: rect.width, maxWidth };
    handleResizeMouseDown(event);
  }

  const savedWidth = typeof node.attrs.width === "number" ? node.attrs.width : null;
  const width = previewWidth ?? savedWidth ?? undefined;

  return (
    <NodeViewWrapper contentEditable={false}>
      <button
        ref={cardRef}
        type="button"
        className="document-link-card"
        style={width ? { width, maxWidth: "100%" } : undefined}
        onClick={() => {
          if (pageId) router.push(`/editor/${pageId}`);
        }}
      >
        <span aria-hidden="true">📄</span>
        <span className="document-link-title">{title}</span>
        <span aria-hidden="true">→</span>
        <ResizeHandle label="문서 링크 카드 너비 조절" widthPx={width ?? 0} onMouseDown={startResize} />
      </button>
    </NodeViewWrapper>
  );
}

const DocumentLink = Node.create({
  name: "documentLink",
  group: "block",
  atom: true,
  selectable: true,
  addAttributes() {
    // P18-2: width는 사용자가 우측 경계를 드래그해 조절한 카드 너비(px)를 저장한다
    // — 지정하지 않으면(null) 기존과 같은 100% 폭 카드로 보인다(하위 호환).
    return { pageId: { default: null }, title: { default: "" }, width: { default: null } };
  },
  parseHTML() {
    return [
      {
        tag: "a[data-document-link]",
        getAttrs: (el) => ({
          pageId: (el as HTMLElement).getAttribute("data-page-id"),
          title: (el as HTMLElement).getAttribute("data-title"),
          width: (el as HTMLElement).getAttribute("data-width")
            ? Number((el as HTMLElement).getAttribute("data-width"))
            : null,
        }),
      },
    ];
  },
  renderHTML({ node }) {
    return [
      "a",
      {
        "data-document-link": "true",
        "data-page-id": node.attrs.pageId,
        "data-title": node.attrs.title,
        ...(node.attrs.width ? { "data-width": node.attrs.width } : {}),
        href: `/editor/${node.attrs.pageId}`,
        class: "document-link-card",
      },
      String(node.attrs.title ?? "") || "(제목 없음)",
    ];
  },
  addNodeView() {
    return ReactNodeViewRenderer(DocumentLinkView);
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

/*
 * P2-6: 글자 크기는 색상과 달리 연속값(px)이라 스와치(원)가 아니라 라벨 목록으로 고른다.
 * Issue #69에서 "글자 크기는 색상 팔레트와 동일하게 3~4단계 고정값"이 추천안으로 채택돼,
 * `docs/product/design.md`의 기존 "사이즈" 표에 이미 있는 값(14px/16px/20px/24px)을 그대로
 * 재사용한다 — 새 임의 값을 도입하지 않는다. "보통"은 본문 기본 크기(16px)로, 새 값을
 * 지정하는 대신 `unsetFontSize()`로 크기 지정 자체를 해제한다(색상의 "색상 지우기"와 같은
 * 원리 — 본문 스타일이 바뀌어도 자동으로 따라간다).
 */
const FONT_SIZE_OPTIONS: { label: string; value: string | null }[] = [
  { label: "작게", value: "14px" },
  { label: "보통", value: null },
  { label: "크게", value: "20px" },
  { label: "아주 크게", value: "24px" },
];

function FontSizeMenu({
  activeSize,
  onPick,
}: {
  activeSize: string | null;
  onPick: (value: string | null) => void;
}) {
  return (
    <div className="flex min-w-[112px] flex-col gap-0.5">
      {FONT_SIZE_OPTIONS.map((option) => (
        <button
          key={option.label}
          type="button"
          aria-pressed={activeSize === option.value}
          className={`rounded-btn px-2 py-1 text-left text-sm hover:bg-surface-raised ${
            activeSize === option.value ? "bg-brand-subtle text-brand" : "text-foreground"
          }`}
          onClick={() => onPick(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function LinkPopoverForm({ editor }: { editor: Editor }) {
  const { toast } = useToast();
  const [href, setHref] = useState(editor.getAttributes("link").href ?? "");
  const inputRef = useRef<HTMLInputElement>(null);
  // P18-1: 편집 중 실수로 페이지가 이동되는 걸 막으려고 `link: { openOnClick: false }`로
  // 꺼뒀는데(RichTextEditor.tsx의 useEditor 설정), 그러면서 링크를 열 수 있는 다른
  // 방법이 아예 없어 "링크가 안 열린다"는 지적을 받았다. 지금 이미 적용된 링크가 있을
  // 때만(마운트 시점의 href로 판단 — 새로 만드는 중이면 아직 열 대상이 없다) "열기"
  // 버튼을 보여준다.
  const hasExistingLink = href.trim().length > 0;

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

  function openLink() {
    const url = editor.getAttributes("link").href;
    if (url) window.open(url, "_blank", "noopener,noreferrer");
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
      {hasExistingLink && (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onMouseDown={(event) => event.preventDefault()}
          onClick={openLink}
        >
          열기
        </Button>
      )}
    </form>
  );
}

function EditorBubbleMenu({ editor }: { editor: Editor | null }) {
  // 이미지가 선택된 동안은 텍스트 서식 메뉴 대신 `ImageBubbleMenu`가 뜬다(두 메뉴가 겹치지
  // 않도록 마운트 자체를 나눈다). `shouldShow`를 오버라이드하는 대신 조건부 렌더링으로
  // 나눈 이유: 이 확장의 기본 `shouldShow`는 포커스가 메뉴 안(예: 링크 팝오버의 입력창)으로
  // 옮겨가도 메뉴가 숨겨지지 않게 하는 로직(`isChildOfMenu`)을 함께 갖고 있는데, `shouldShow`를
  // 통째로 대체하면 그 로직까지 사라져 기존 링크 편집 UX가 깨진다(소스로 확인). `isActive`를
  // 렌더 시점에 그냥 읽으면 순수 선택 변경에 리렌더가 안 될 수 있다는 것을 P1-7a에서 이미
  // 확인했으므로, 여기서도 `useEditorState`로 구독한다.
  const isImageActive = useEditorState({
    editor,
    selector: ({ editor: currentEditor }) => !!currentEditor?.isActive("image"),
  });

  if (!editor || isImageActive) return null;

  return (
    // P18-1 후속(사용자 지적 — 이미지 버블 메뉴에서 재현된 것과 같은 문제, P17-8
    // 참고): `@tiptap/extension-bubble-menu`의 기본 `updateDelay`(250ms)가 짧은
    // 시간 안에 여러 번 바뀌는 선택 변화를 디바운스하며 서로 경합해, 서식 버블
    // 메뉴도 뜰 때·안 뜰 때가 갈릴 수 있다. 디바운스를 꺼서 선택이 바뀔 때마다
    // 즉시 다시 계산하게 한다.
    <BubbleMenu editor={editor} updateDelay={0} options={{ placement: "top" }}>
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
        {/*
          P2-8: underline은 StarterKit 기본값으로 이미 켜져 있었지만(스키마상 활성) 굵게·
          기울임·취소선과 달리 버블 툴바에 진입점이 없어 Ctrl+U를 우연히 아는 경우에만
          접근 가능했다 — 나머지 인라인 마크와 완전히 같은 방식(선택 텍스트에 토글)으로 추가한다.
        */}
        <ToggleButton
          active={editor.isActive("underline")}
          label="밑줄"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        >
          U
        </ToggleButton>
        <ToggleButton
          active={editor.isActive("code")}
          label="코드"
          onClick={() => editor.chain().focus().toggleCode().run()}
        >
          {"</>"}
        </ToggleButton>
        <Popover
          trigger={
            <ToggleButton active={!!editor.getAttributes("textStyle").fontSize} label="글자 크기" onClick={() => {}}>
              가
            </ToggleButton>
          }
        >
          <FontSizeMenu
            activeSize={editor.getAttributes("textStyle").fontSize ?? null}
            onPick={(value) =>
              value
                ? editor.chain().focus().setFontSize(value).run()
                : editor.chain().focus().unsetFontSize().run()
            }
          />
        </Popover>
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

const IMAGE_ALT_MAX_LENGTH = 300;

/**
 * 이미지의 alt 텍스트를 입력하는 폼. `LinkPopoverForm`과 동일한 패턴(마운트 시 포커스,
 * 제출 시 노드/마크 속성 갱신)을 그대로 재사용한다 — 다만 링크는 마크(`setLink`/`unsetLink`)를
 * 다루고 이미지는 노드 속성이라 `updateAttributes("image", { alt })`를 쓴다는 차이만 있다.
 * alt는 선택 사항이므로 빈 값 제출도 그대로 허용한다(에러 없이 alt를 비운다).
 */
function ImageAltPopoverForm({ editor }: { editor: Editor }) {
  const [alt, setAlt] = useState(String(editor.getAttributes("image").alt ?? ""));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function submit() {
    editor
      .chain()
      .focus()
      .updateAttributes("image", { alt: alt.trim() || null })
      .run();
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
        type="text"
        aria-label="이미지 대체 텍스트(alt)"
        placeholder="이미지 설명을 입력하세요"
        maxLength={IMAGE_ALT_MAX_LENGTH}
        className="w-56 rounded-input border border-border bg-surface px-2 py-1 text-sm text-foreground outline-none placeholder:text-placeholder focus:border-brand focus:ring-2 focus:ring-brand"
        value={alt}
        onChange={(event) => setAlt(event.target.value)}
      />
      <Button type="submit" variant="primary" size="sm">
        적용
      </Button>
    </form>
  );
}

/**
 * 이미지가 선택돼 있을 때만 뜨는, alt 텍스트 입력 전용 버블 메뉴. 업로드 중인 자리표시자
 * (P17-9)는 alt를 편집할 실제 이미지가 아직 없으므로 제외한다.
 */
function ImageBubbleMenu({ editor }: { editor: Editor | null }) {
  const isImageActive = useEditorState({
    editor,
    selector: ({ editor: currentEditor }) =>
      !!currentEditor?.isActive("image") && !currentEditor.getAttributes("image").uploading,
  });
  const { toast } = useToast();
  const pageId = useContext(ImagePageIdContext);

  if (!editor || !isImageActive) return null;

  // P17-8: 이미지 노드에는 alt 텍스트 입력 외에 삭제·다시 업로드 동작이 없었다 —
  // 잘못 올린 이미지를 지우거나 바꾸려면 alt 팝오버 옆에 아무 버튼도 없어 커서를
  // 옮겨 Backspace를 누르는 것 말고는 방법이 없었다(발견하기 어려움). 같은 alt
  // 팝오버 옆에 나란히 둔다 — 사용자가 이미 "이미지를 클릭하면 뜨는 메뉴"로 학습한
  // 자리다.
  function handleDelete() {
    if (!editor) return;
    editor.chain().focus().deleteSelection().run();
  }

  function handleReupload() {
    if (!editor) return;
    if (!pageId) {
      toast(NOT_SAVED_IMAGE_REUPLOAD_MESSAGE, "info");
      return;
    }
    // 실패 시 되돌릴 수 있도록, 새 파일을 고르기 전 지금 이미지의 attrs를 미리 잡아둔다.
    const previousAttrs = editor.getAttributes("image");
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/png,image/jpeg,image/gif,image/webp";
    input.addEventListener("change", () => {
      const file = input.files?.[0];
      if (!file) return;

      const uploadId = crypto.randomUUID();
      // P17-9와 같은 자리표시자 패턴을 재사용한다 — 다만 새로 삽입하는 대신 지금
      // 선택된 이미지 노드 자체를 "업로드 중"으로 바꿔 같은 자리에서 스피너가 뜨게
      // 한다(updateAttributes는 지정한 키만 덮어써 기존 src/alt는 그대로 남는다).
      editor.chain().focus().updateAttributes("image", { uploading: true, uploadId, filename: file.name }).run();

      uploadImage(pageId, file)
        .then((uploaded) => resolveUploadPlaceholder(editor.view, uploadId, uploaded))
        .catch((error) => {
          revertUploadPlaceholder(editor.view, uploadId, previousAttrs);
          toast(error instanceof Error ? error.message : "이미지 업로드에 실패했습니다.", "danger");
        });
    });
    input.click();
  }

  return (
    // P17-8 후속(사용자 지적 — "이미지 캡션 저장은 누를때마다 랜덤하게 컴포넌트가
    // 나오고"): 이미지를 선택했다 해제했다 반복하면 버블 메뉴가 보였다 안 보였다
    // 하는 걸 실제로 재현했다 — `@tiptap/extension-bubble-menu`의 기본
    // `updateDelay`(250ms)가 선택 변화를 디바운스하는데, "선택 해제 → 곧바로 다시
    // 선택"처럼 250ms 안에 선택이 여러 번 바뀌면 이 디바운스 타이머들이 서로
    // 경합해 마지막 표시 여부가 일관되지 않았다(node_modules 확인 — 여러 차례
    // 반복 클릭으로 직접 재현·측정). `updateDelay={0}`으로 디바운스를 꺼서 선택이
    // 바뀔 때마다 즉시 다시 계산하게 한다.
    <BubbleMenu editor={editor} updateDelay={0} options={{ placement: "bottom" }}>
      <div className="flex items-center gap-1 rounded-md border border-border bg-surface p-1 shadow-md">
        <ImageAltPopoverForm editor={editor} />
        <div className="mx-1 h-5 w-px bg-border" aria-hidden="true" />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-label="이미지 다시 업로드"
          onMouseDown={(event) => event.preventDefault()}
          onClick={handleReupload}
        >
          <ImageReuploadIcon />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-label="이미지 삭제"
          onMouseDown={(event) => event.preventDefault()}
          onClick={handleDelete}
        >
          <TrashIcon />
        </Button>
      </div>
    </BubbleMenu>
  );
}

/** P17-8: 다시 업로드 버튼 아이콘 — 기존 `TrashIcon`(표 삭제)과 같은 시각 스타일. */
function ImageReuploadIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
      <path d="M3 21v-5h5" />
    </svg>
  );
}

/**
 * `@sfood/ui`의 `Icon` 컴포넌트는 `search`/`comment` 두 개만 제공해 표 조작에 쓸 아이콘이
 * 없다(node_modules/@sfood/ui/dist/index.d.ts 확인) — design.md 선례(로그인 화면의 자체
 * 제작 SVG `BrandPanelArt`)를 따라, `@sfood/ui`의 `Icon`이 실제로 쓰는 것과 똑같은 스타일
 * (`viewBox 0 0 24 24`, `stroke="currentColor"`, `strokeWidth={2}`, round cap/join, 크기
 * `h-4 w-4` = `@sfood/ui`의 `sm`)로 직접 그려 시각적으로 통일감 있게 맞춘다. 새 아이콘
 * 라이브러리를 추가하지 않는다.
 */
function TableIcon({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

// 4개의 "삽입" 아이콘은 모두 같은 문법(화살표가 새로 생길 선을 향해 뻗는다)을 공유해,
// 하나를 이해하면 나머지 방향도 바로 유추할 수 있게 했다. 병합/분할은 칸이 모였다/갈라진다는
// 느낌을 안쪽/바깥쪽 화살표로 대비시켰다.
//
// P17-3: 예전엔 "행 삭제"·"열 삭제"·"표 삭제" 셋 다 같은 범용 휴지통 아이콘(`TrashIcon`)을
// 재사용해 Tooltip/aria-label(마우스 오버·스크린리더)로만 구분됐다 — 사용자가 "휴지통
// 아이콘이 여러 개 있어서 인식 불가"라고 지적했다. 삽입 아이콘의 "가로줄=행 / 세로줄=열"
// 문법을 그대로 가져와, 행/열 삭제는 그 축을 나타내는 굵은 띠에 X를 그어 표시한다
// (스프레드시트류 도구에서 흔한 "지울 행/열에 줄을 긋는" 표현). 표 전체 삭제만 기존
// 범용 휴지통 모양을 유지한다 — 확인 Modal을 거치는 유일한 항목이라 "표 전체가 없어진다"는
// 느낌의 아이콘이 그대로 더 적절하다.
const RowInsertBeforeIcon = () => (
  <TableIcon>
    <line x1="4" y1="6" x2="20" y2="6" />
    <line x1="12" y1="10" x2="12" y2="18" />
    <polyline points="8 14 12 10 16 14" />
  </TableIcon>
);
const RowInsertAfterIcon = () => (
  <TableIcon>
    <line x1="4" y1="18" x2="20" y2="18" />
    <line x1="12" y1="6" x2="12" y2="14" />
    <polyline points="8 10 12 14 16 10" />
  </TableIcon>
);
const ColumnInsertBeforeIcon = () => (
  <TableIcon>
    <line x1="6" y1="4" x2="6" y2="20" />
    <line x1="10" y1="12" x2="18" y2="12" />
    <polyline points="14 8 10 12 14 16" />
  </TableIcon>
);
const ColumnInsertAfterIcon = () => (
  <TableIcon>
    <line x1="18" y1="4" x2="18" y2="20" />
    <line x1="6" y1="12" x2="14" y2="12" />
    <polyline points="10 8 14 12 10 16" />
  </TableIcon>
);
const TrashIcon = () => (
  <TableIcon>
    <polyline points="4 7 20 7" />
    <path d="M6 7V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v2" />
    <path d="M19 7l-1 13a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 7" />
  </TableIcon>
);
/** "행 삭제" 전용 — 삽입 아이콘과 같은 가로줄=행 문법에, 지울 대상임을 나타내는 X를 더한다. */
const RowDeleteIcon = () => (
  <TableIcon>
    <line x1="4" y1="9" x2="20" y2="9" />
    <line x1="4" y1="15" x2="20" y2="15" />
    <line x1="8" y1="8" x2="16" y2="16" />
    <line x1="16" y1="8" x2="8" y2="16" />
  </TableIcon>
);
/** "열 삭제" 전용 — 삽입 아이콘과 같은 세로줄=열 문법에, 지울 대상임을 나타내는 X를 더한다. */
const ColumnDeleteIcon = () => (
  <TableIcon>
    <line x1="9" y1="4" x2="9" y2="20" />
    <line x1="15" y1="4" x2="15" y2="20" />
    <line x1="8" y1="8" x2="16" y2="16" />
    <line x1="16" y1="8" x2="8" y2="16" />
  </TableIcon>
);
const MergeCellsIcon = () => (
  <TableIcon>
    <rect x="3" y="5" width="7" height="14" rx="1" />
    <rect x="14" y="5" width="7" height="14" rx="1" />
    <polyline points="9 9 12 12 9 15" />
    <polyline points="15 9 12 12 15 15" />
  </TableIcon>
);
const SplitCellsIcon = () => (
  <TableIcon>
    <rect x="3" y="5" width="18" height="14" rx="1" />
    <line x1="12" y1="5" x2="12" y2="19" />
    <polyline points="9 9 6 12 9 15" />
    <polyline points="15 9 18 12 15 15" />
  </TableIcon>
);

function TableToolbarButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    // P17-10: 이 툴바는 `sticky top-14`라 표를 스크롤하면 EditorShell의 본문 스크롤
    // 컨테이너(`overflow-y-auto` — overflow-x/y가 둘 다 CSS 스펙상 auto로 강제됨,
    // P14-3와 같은 클리핑 원인) 맨 위에 붙는다. 그 상태에서 기본값(side="top")인
    // 툴팁은 버튼 위로 렌더링되는데, 위쪽 공간이 그 스크롤 컨테이너 경계 밖이라
    // 대부분 잘려서 둥근 모서리도 글자도 없이 얇은 띠만 보였다(사용자 실사용 확인).
    // 아래(side="bottom")는 표가 있어 항상 공간이 있으므로 구조적으로 이 클리핑이
    // 생기지 않는다.
    //
    // P17-7 이후 버그 수정(사용자 실사용 확인 — "행이 무조건 첫 번째 행 기준으로
    // 생긴다"): 이 버튼은 `contentDOM`(tbody) 밖, `<table>` 바로 앞에 꽂히는 툴바
    // 슬롯 안에 있다(TableToolbar, 위 주석 참고) — 즉 에디터의 contenteditable
    // 영역이 아니다. `onMouseDown`에서 `preventDefault()`를 안 하면, 버튼을
    // mousedown하는 순간 브라우저가 "지금 에디터에 있던 선택을 그대로 둘지"를
    // 자체적으로 처리하는데, 이 버튼이 DOM상 표 바로 앞에 있어서 브라우저가 선택을
    // 표의 첫 번째 셀(=1행)로 되돌려 버렸다 — 그 뒤에 실행되는 `onClick`의
    // `addRowBefore`/`addRowAfter` 등은 이미 망가진(1행으로 재설정된) 선택을 기준으로
    // 동작하니 항상 1행 기준으로 삽입되는 것처럼 보였다. 리치 텍스트 에디터 툴바의
    // 잘 알려진 패턴대로 `mousedown`에서 기본 동작을 막아, 버튼을 눌러도 에디터의
    // 실제 선택(커서 위치)이 전혀 바뀌지 않게 한다 — `onClick`은 그대로 발생하므로
    // 버튼 자체의 동작에는 영향이 없다.
    <Tooltip content={label} side="bottom">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={disabled}
        onMouseDown={(event) => event.preventDefault()}
        onClick={onClick}
        aria-label={label}
      >
        {children}
      </Button>
    </Tooltip>
  );
}

/**
 * P1-7a 3차 재설계(2026-09-01, 표 자체의 상단에 고정): 2차 버전(`sticky top-14`)은
 * "문서 헤더 바로 아래"에 고정될 뿐 표 자체와는 무관한 위치였다 — 표가 스크롤로 한참
 * 내려가면 툴바는 화면 맨 위에 그대로 남아 표와 시각적으로 분리돼 보인다는 지적을
 * 받았다. "표 자체의 상단에" 고정하려면 sticky의 고정 범위(constraint)가 그 표를 감싸는
 * 컨테이너여야 하는데, 일반 React 트리에서는 표 하나하나를 감싸는 지점에 손댈 수 없다
 * (TipTap이 `table` 노드를 스키마 기반으로 직접 렌더링하기 때문) — 그래서 표 노드
 * 렌더링 자체를 커스터마이즈하는 TipTap NodeView가 필요하다.
 *
 * 표의 실제 DOM 구조(`.tableWrapper > table > colgroup + tbody`)와 셀 선택·컬럼 너비
 * 관리는 prosemirror-tables가 아주 세밀하게 의존하는 부분이라(`ignoreMutation`,
 * `updateColumns` 등) 직접 재구현하지 않는다 — TipTap이 기본 제공하는 `TableView`
 * 클래스(`Table`의 `resizable: false`일 때 실제로 쓰이는 바로 그 클래스, 이 프로젝트
 * 설정과 일치함)를 그대로 상속해 딱 필요한 것만 더한다: `.tableWrapper`의 `<table>` 앞에
 * 툴바 슬롯 하나를 끼워 넣고, `ReactRenderer`(TipTap이 NodeView 밖에서 React UI를
 * 마운트할 때 쓰라고 공식 제공하는 저수준 API — 내부적으로 `EditorContent`가 관리하는
 * React 트리에 포털로 얹혀, 별도 React 루트를 만들지 않는다)로 `TableToolbar`를 그
 * 슬롯에 마운트한다. 이 슬롯은 `contentDOM`(=tbody) 밖에 있어 `TableView`가 이미
 * 구현해 둔 `ignoreMutation`("wrapper 안·content 밖 변경은 무시")이 그대로 보호해
 * 준다 — 별도 방어 코드가 필요 없다.
 *
 * "지금 커서가 이 표 안에 있는가"는 선택 범위가 이 표 노드의 [pos, pos+nodeSize) 안에
 * 완전히 들어있는지로 직접 계산한다 — `editor.isActive("table")`은 문서에 표가 여러 개일
 * 때 "어떤" 표인지 구분하지 못해 쓸 수 없다(한 문서에 표가 하나뿐이던 이전 버전에서는
 * 문제가 안 됐다). `editor`의 `selectionUpdate`/`transaction` 이벤트마다 다시 계산해,
 * 값이 실제로 바뀔 때만 `ReactRenderer.updateProps`를 호출한다(모든 키 입력마다 불필요한
 * 리렌더를 피한다 — 문서에 표가 여러 개면 그 개수만큼 리스너가 따로 붙기 때문에 더 중요).
 */
function TableToolbar({ editor, active }: { editor: Editor; active: boolean }) {
  const tableState = useEditorState({
    editor,
    selector: ({ editor: currentEditor }) =>
      currentEditor
        ? {
            canAddRowBefore: currentEditor.can().addRowBefore(),
            canAddRowAfter: currentEditor.can().addRowAfter(),
            canDeleteRow: currentEditor.can().deleteRow(),
            canAddColumnBefore: currentEditor.can().addColumnBefore(),
            canAddColumnAfter: currentEditor.can().addColumnAfter(),
            canDeleteColumn: currentEditor.can().deleteColumn(),
            canMergeCells: currentEditor.can().mergeCells(),
            canSplitCell: currentEditor.can().splitCell(),
            canDeleteTable: currentEditor.can().deleteTable(),
          }
        : null,
  });
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  if (!active || !tableState) return null;

  return (
    <div className="sticky top-14 z-10 flex flex-wrap items-center gap-0.5 border-b border-border bg-surface px-2 py-1.5 shadow-sm">
      <TableToolbarButton
        label="행 추가(위)"
        disabled={!tableState.canAddRowBefore}
        onClick={() => editor.chain().focus().addRowBefore().run()}
      >
        <RowInsertBeforeIcon />
      </TableToolbarButton>
      <TableToolbarButton
        label="행 추가(아래)"
        disabled={!tableState.canAddRowAfter}
        onClick={() => editor.chain().focus().addRowAfter().run()}
      >
        <RowInsertAfterIcon />
      </TableToolbarButton>
      <TableToolbarButton
        label="행 삭제"
        disabled={!tableState.canDeleteRow}
        onClick={() => editor.chain().focus().deleteRow().run()}
      >
        <RowDeleteIcon />
      </TableToolbarButton>
      {/* 행/열 조작과 셀 병합/분할은 서로 다른 조작 그룹이라 구분선으로 나눈다. */}
      <div className="mx-1 h-5 w-px bg-border" aria-hidden="true" />
      <TableToolbarButton
        label="열 추가(왼쪽)"
        disabled={!tableState.canAddColumnBefore}
        onClick={() => editor.chain().focus().addColumnBefore().run()}
      >
        <ColumnInsertBeforeIcon />
      </TableToolbarButton>
      <TableToolbarButton
        label="열 추가(오른쪽)"
        disabled={!tableState.canAddColumnAfter}
        onClick={() => editor.chain().focus().addColumnAfter().run()}
      >
        <ColumnInsertAfterIcon />
      </TableToolbarButton>
      <TableToolbarButton
        label="열 삭제"
        disabled={!tableState.canDeleteColumn}
        onClick={() => editor.chain().focus().deleteColumn().run()}
      >
        <ColumnDeleteIcon />
      </TableToolbarButton>
      <div className="mx-1 h-5 w-px bg-border" aria-hidden="true" />
      <TableToolbarButton
        label="셀 병합"
        disabled={!tableState.canMergeCells}
        onClick={() => editor.chain().focus().mergeCells().run()}
      >
        <MergeCellsIcon />
      </TableToolbarButton>
      <TableToolbarButton
        label="셀 분할"
        disabled={!tableState.canSplitCell}
        onClick={() => editor.chain().focus().splitCell().run()}
      >
        <SplitCellsIcon />
      </TableToolbarButton>
      {/* 표 삭제는 셀/행/열 조작과 되돌릴 수 있는 정도가 다른 파괴적 동작이라(표 전체와
          내용을 한 번에 잃음) 별도 구분선 뒤에 두고, CLAUDE.md 규칙에 따라 window.confirm()
          대신 Modal로 확인을 받은 뒤에만 실행한다. */}
      <div className="mx-1 h-5 w-px bg-border" aria-hidden="true" />
      <TableToolbarButton
        label="표 삭제"
        disabled={!tableState.canDeleteTable}
        onClick={() => setConfirmDeleteOpen(true)}
      >
        <TrashIcon />
      </TableToolbarButton>
      <Modal
        open={confirmDeleteOpen}
        onClose={() => setConfirmDeleteOpen(false)}
        title="표 삭제"
        footer={
          <>
            <Button type="button" variant="secondary" onClick={() => setConfirmDeleteOpen(false)}>
              취소
            </Button>
            <Button
              type="button"
              variant="danger"
              onClick={() => {
                setConfirmDeleteOpen(false);
                editor.chain().focus().deleteTable().run();
              }}
            >
              삭제 확인
            </Button>
          </>
        }
      >
        표를 삭제하시겠습니까? 표 안의 모든 내용이 함께 삭제되며 되돌릴 수 없습니다.
      </Modal>
    </div>
  );
}

/**
 * P1-7b(표 컬럼 리사이즈) 도입 때 `getPos` 의존을 제거하도록 다시 손봤다. `resizable: true`가
 * 되면 `@tiptap/extension-table`의 `addNodeView()`는 스스로 `null`을 반환하고, 대신
 * prosemirror-tables의 `columnResizing` 플러그인이 **자신의 `nodeViews` 등록**으로 View
 * 클래스를 생성한다 — 그 호출부가 `new View(node, cellMinWidth, view)` 세 인자만 넘기므로
 * (`node_modules/prosemirror-tables/dist/index.cjs` 확인), 이전 버전이 의존하던 네 번째
 * 인자 `getPos`를 받을 방법이 없다. 그래서 `editor`를 생성자 인자 대신 이 팩토리 함수의
 * 클로저로 캡처해 두 호출부(TipTap 자체 `addNodeView()` / prosemirror-tables의
 * `columnResizing`) 모두와 호환되는 3~4-인자 생성자로 통일했다.
 *
 * "커서가 이 표 안에 있는가"도 `getPos()` + `nodeSize` 범위 비교 대신,
 * `findParentNodeClosestToPos`(`@tiptap/extension-table`이 `deleteRow`/`deleteColumn`
 * 내부에서 이미 쓰는 것과 같은 TipTap 코어 유틸)로 현재 선택 위치에서 가장 가까운 표
 * 조상을 찾아, 그 노드가 `this.node`와 **객체 참조가 같은지**로 판단한다. ProseMirror
 * 노드는 불변 객체라 참조 비교가 안전하다 — 내용이 완전히 같은 표 두 개가 있어도 서로
 * 다른 객체라 정확히 구분되고, `getPos` 없이도(리사이즈 켜짐 경로에서도) 동작한다.
 */
function createStickyTableView(editor: Editor) {
  return class extends TableView {
    private toolbarSlot: HTMLDivElement;
    private renderer: ReactRenderer<unknown, { editor: Editor; active: boolean }>;
    private lastActive = false;
    private handleEditorUpdate = () => this.syncActive();

    constructor(
      node: ProseMirrorNode,
      cellMinWidth: number,
      view: EditorView,
      HTMLAttributes: Record<string, unknown> = {}
    ) {
      super(node, cellMinWidth, view, HTMLAttributes);

      // contentDOM(tbody) 밖, <table> 앞에 슬롯을 끼워 넣는다 — TableView.ignoreMutation이
      // 이미 "wrapper 안·content 밖"을 편집 대상에서 제외해 주므로 여기 마운트되는 React
      // UI는 ProseMirror에게 문서 변경으로 오인되지 않는다.
      this.toolbarSlot = document.createElement("div");
      this.dom.insertBefore(this.toolbarSlot, this.table);

      this.renderer = new ReactRenderer(TableToolbar, {
        editor,
        props: { editor, active: false },
      });
      this.toolbarSlot.appendChild(this.renderer.element);

      editor.on("selectionUpdate", this.handleEditorUpdate);
      editor.on("transaction", this.handleEditorUpdate);
      this.syncActive();
    }

    private syncActive() {
      const found = findParentNodeClosestToPos(
        editor.state.selection.$from,
        (n) => n.type.name === "table"
      );
      const active = found?.node === this.node;
      if (active === this.lastActive) return;
      this.lastActive = active;
      this.renderer.updateProps({ active });
    }

    update(node: ProseMirrorNode) {
      const updated = super.update(node);
      if (updated) this.syncActive();
      return updated;
    }

    destroy() {
      editor.off("selectionUpdate", this.handleEditorUpdate);
      editor.off("transaction", this.handleEditorUpdate);
      this.renderer.destroy();
    }
  };
}

/**
 * `addNodeView()`/`addProseMirrorPlugins()` 둘 다 `@tiptap/extension-table`의 원본 구현을
 * 그대로 복제하되(둘 다 실측 확인), `View`(표 렌더링 클래스) 자리에 이 에디터 인스턴스에
 * 묶인 `createStickyTableView(this.editor)`를 넣는다 — `resizable`이 켜져 있든 꺼져
 * 있든 항상 표별 sticky 툴바가 딸린 View가 쓰이게 하기 위해서다.
 */
const TableWithToolbar = Table.extend({
  addProseMirrorPlugins() {
    const View = createStickyTableView(this.editor);
    return [
      ...(this.options.resizable && this.editor.isEditable
        ? [
            columnResizing({
              handleWidth: this.options.handleWidth,
              cellMinWidth: this.options.cellMinWidth,
              defaultCellMinWidth: this.options.cellMinWidth,
              View,
              lastColumnResizable: this.options.lastColumnResizable,
            }),
          ]
        : []),
      tableEditing({ allowTableNodeSelection: this.options.allowTableNodeSelection }),
    ];
  },
  addNodeView() {
    const isResizable = this.options.resizable && this.editor.isEditable;
    if (isResizable) return null;
    const View = createStickyTableView(this.editor);
    return ({ node, view, HTMLAttributes }) => {
      const mergedAttributes = mergeAttributes(this.options.HTMLAttributes, HTMLAttributes);
      return new View(node, this.options.cellMinWidth, view, mergedAttributes);
    };
  },
});

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

// P1-7c(코드블록 문법 강조): lowlight의 `common` 번들은 JS/TS/Python/Java/Go/Rust/SQL 등
// 자주 쓰는 언어를 폭넓게 담고 있어(공식 문서 권장 기본값) 별도로 언어를 하나씩 고를
// 필요가 없다. 인스턴스는 컴포넌트 바깥에서 한 번만 만든다 — 매 렌더마다 새로 만들 이유가
// 없고, `useEditor`의 extensions 배열도 최초 마운트 시에만 실제로 쓰인다.
const lowlight = createLowlight(common);

/**
 * P17-5b: 코드 블록마다 언어를 직접 고를 수 있는 UI. 자동 추정(P1-7c)은 대부분의 경우
 * 충분하지만, lowlight의 언어 추정이 짧거나 모호한 코드에서는 틀릴 수 있어 사용자가
 * 직접 바로잡을 방법이 없었다("언어 선택이 없다"는 지적). `language` attrs는 이미
 * `@tiptap/extension-code-block` 스키마에 있던 필드를 그대로 쓴다 — 값을 지정하면
 * `LowlightPlugin`이 `lowlight.highlight(language, text)`로 그 언어를 강제하고, 비우면
 * (null) 기존처럼 `highlightAuto()`로 자동 추정한다(node_modules 확인). 목록은 이
 * 프로젝트가 이미 쓰는 `common` 번들에 등록된 언어(`lowlight.listLanguages()`)만
 * 보여준다 — 번들 밖 언어를 추가하는 것은 범위 밖(task.md 참고).
 */
/**
 * P17-5c: 복사 버튼 아이콘. `@sfood/ui`의 `Icon`은 `search`/`comment`만 제공해(위
 * `TableIcon` 주석 참고) 이번에도 같은 시각 스타일(viewBox 0 0 24 24, stroke
 * currentColor, strokeWidth 2, h-4 w-4)로 직접 그린다.
 */
function CodeCopyIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function CodeBlockView({ node, updateAttributes }: Pick<NodeViewProps, "node" | "updateAttributes">) {
  // @sfood/ui의 Select 기본 스타일(`w-full`, `bg-surface`, `text-sm` 등)은 폼 필드용
  // 크기라 코드 블록 헤더에 넣기엔 크고, `bg-surface`가 헤더 배경(`.code-block-header`
  // = surface-subtle)과 달라 "떠 있는 흰 상자"처럼 분리돼 보였다(사용자 지적).
  // `bg-transparent`만으로는 부족했다 —
  // `<select>`는 기본이 `appearance: auto`라 브라우저가 배경색 지정과 무관하게 자체
  // 네이티브 상자를 그 위에 그린다(널리 알려진 CSS 한계). `appearance-none`으로
  // 네이티브 껍데기 자체를 없애야 우리가 지정한 투명 배경이 실제로 적용되고, 그러면서
  // 사라지는 기본 화살표를 작은 글자(▾)로 직접 대체한다. 폭·패딩·글자 크기는 이 좁은
  // 자리에 맞게 줄이고, 나머지(테두리·포커스 링·모서리 반경)는 디자인 시스템 기본값을
  // 그대로 따른다.
  const languages = useMemo(() => lowlight.listLanguages(), []);
  const languageOptions = useMemo(
    () => languages.map((language) => ({ value: language, label: language })),
    [languages]
  );
  // P17-11: 줄 번호 거터 — 코드 블록은 `white-space: pre`라 자동 줄바꿈이 없으므로
  // `\n` 개수로 줄 수를 그대로 셀 수 있다(긴 줄이 화면 폭에 맞춰 다시 줄바꿈되는
  // 경우는 없음 — 대신 `<pre>`가 가로 스크롤된다).
  const lineCount = node.textContent.split("\n").length;

  // P17-5c: `DocumentLinkView`가 이미 NodeView 안에서 `useRouter()`를 직접 호출하는
  // 선례가 있다 — 포털로 렌더링돼도 같은 React 트리라 컨텍스트/훅이 정상 동작하므로,
  // toast 콜백을 부모로부터 prop으로 내려받을 필요 없이 여기서 바로 `useToast()`를 쓴다.
  const { toast } = useToast();
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(node.textContent);
      toast("코드를 클립보드에 복사했습니다.", "success");
    } catch {
      toast("코드 복사에 실패했습니다.", "danger");
    }
  };

  return (
    <NodeViewWrapper className="code-block-wrapper">
      {/*
       * P17-5c 리뷰 중 구조 변경: 처음엔 헤더까지 포함해 코드 블록 전체를 항상
       * 다크로 고정했는데, 그러면 언어 선택·복사 버튼처럼 앱의 일반 UI와 같은
       * 상호작용 컴포넌트도 강제로 다크 배색을 써야 해서 hover 배경·select 팝업
       * 배색 등을 매번 개별로 다시 맞춰야 했다(자세한 경위는 globals.css 주석
       * 참고). 대신 역할을 나눈다 — "조작 UI를 담는 헤더"는 앱의 일반 컴포넌트와
       * 똑같이 라이트/다크 테마를 그대로 따르고(별도 오버라이드 없음), "코드
       * 내용을 보여주는 본문(`<pre>`)"만 `data-theme="dark"`로 항상 다크 배경을
       * 유지한다. 헤더가 테마를 그대로 따르면 그 안의 Select/Button은 디자인
       * 시스템이 이미 보장하는 배경·글자·hover색 짝을 그대로 쓰므로 별도로 맞출
       * 필요가 없다.
       */}
      <div contentEditable={false} className="code-block-header">
        <div className="relative inline-block">
          <Select
            aria-label="코드 언어"
            className="w-auto appearance-none bg-transparent px-2 py-0.5 pr-6 text-xs"
            value={node.attrs.language ?? ""}
            onChange={(event) => updateAttributes({ language: event.target.value || null })}
            options={languageOptions}
            placeholder="자동 감지"
          />
          <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted" aria-hidden="true">
            ▾
          </span>
        </div>
        <Button type="button" variant="ghost" size="sm" aria-label="코드 복사" onClick={handleCopy}>
          <CodeCopyIcon />
        </Button>
      </div>
      {/* data-theme="dark": tokens/semantic.css의 [data-theme="dark"]는 :root가 아닌
          순수 속성 선택자라 임의 요소에 적용되고 자식에게 상속된다 — 이 <pre> 안의
          글자색·문법 강조·줄 번호가 모두 앱의 실제 다크 테마 값을 그대로 상속받는다. */}
      <pre data-theme="dark">
        <div contentEditable={false} className="code-block-gutter" aria-hidden="true">
          {Array.from({ length: lineCount }, (_, index) => (
            <div key={index}>{index + 1}</div>
          ))}
        </div>
        <NodeViewContent<"code"> as="code" className="min-w-0 flex-1" />
      </pre>
    </NodeViewWrapper>
  );
}

const CodeBlockWithLanguagePicker = CodeBlockLowlight.extend({
  addNodeView() {
    return ReactNodeViewRenderer(CodeBlockView);
  },
});

const LINK_OPEN_HINT = "Ctrl(Windows)/Cmd(Mac)+클릭하여 링크 열기";

/**
 * P18-1 후속(사용자 지적 — "링크는 컨트롤 누르면 기능이 되지만 화면 상 되는 지
 * 알수가 없어. 대부분 마우스 포인터에 변화가 없으니까 어떤 동작이 될 거란 생각이
 * 안 들어"): Ctrl/Cmd+클릭으로 열리는 기능 자체는 이미 있었지만 아무 시각적 힌트가
 * 없어 발견할 수 없었다. `title`은 브라우저가 호버 시 자동으로 띄워 주는 네이티브
 * 툴팁이라 별도 포지셔닝 로직 없이 힌트를 줄 수 있다(마우스 포인터 모양은
 * globals.css의 `.prose a`에서 함께 바꾼다) — 그런데 `Link.configure({
 * HTMLAttributes: { title } })`로는 실제 DOM에 반영되지 않았다(실측 확인: 같은
 * 방식으로 넣은 `class`는 반영되는데 `title`만 빠짐 — target/rel/class는 이
 * 확장의 schema attrs로 이미 등록돼 있어 렌더링되지만, schema attrs로 등록되지
 * 않은 임의의 `HTMLAttributes` 키는 최종 DOM에 반영되지 않는 것으로 보인다).
 * 그래서 `title`을 이 확장 자체의 attrs로 직접 등록해 매 링크 마크에 고정값으로
 * 렌더링되게 한다.
 */
const LinkWithOpenHint = Link.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      title: { default: LINK_OPEN_HINT },
    };
  },
});

export function RichTextEditor({ content, onChange, pageId }: RichTextEditorProps) {
  const { toast } = useToast();
  const [documentLinkPicker, setDocumentLinkPicker] = useState<{ range: Range } | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        // P18-1 후속: 아래 `LinkWithOpenHint`로 직접 대체하므로 StarterKit 기본
        // link는 끈다(codeBlock을 CodeBlockWithLanguagePicker로 대체하는 것과
        // 같은 패턴).
        link: false,
        // 문법 강조가 있는 CodeBlockLowlight로 교체하므로 StarterKit 기본 codeBlock은 끈다.
        codeBlock: false,
      }),
      LinkWithOpenHint.configure({ openOnClick: false }),
      // 언어를 지정하지 않아도 lowlight가 내용을 보고 자동으로 언어를 추정해 강조한다
      // (node_modules/@tiptap/extension-code-block-lowlight 확인 — language 속성이
      // 없으면 lowlight.highlightAuto()로 폴백). 언어를 직접 고르는 UI는 P17-5b에서
      // `CodeBlockWithLanguagePicker`(위 정의)로 추가했다.
      //
      // P17-5a: `enableTabIndentation`이 기본값 false라 코드 블록 안에서 Tab을 눌러도
      // 무시되고 포커스가 에디터 밖(다음 버튼 등)으로 빠져나갔다 — "코드 블록 편집이
      // 불편하다"는 지적 중 하나. 옵션만 켜면 Tab/Shift-Tab이 각각 들여쓰기/내어쓰기로
      // 동작한다(node_modules/@tiptap/extension-code-block 확인 — 핸들러는 이미 구현돼
      // 있고 이 플래그로만 켜고 끔). `tabSize`는 기본값(4칸)을 그대로 둔다.
      CodeBlockWithLanguagePicker.configure({ lowlight, enableTabIndentation: true }),
      TextStyle,
      Color,
      FontSize,
      Highlight.configure({ multicolor: true }),
      AttachmentImage,
      Panel,
      DocumentLink,
      TableWithToolbar.configure({ resizable: true }),
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
      SlashCommandExtension.configure({
        suggestion: {
          items: ({ query }: { query: string }) =>
            createSlashItems(query, [
              createImageSlashItem(pageId, (message, variant = "danger") => toast(message, variant)),
              createDocumentLinkSlashItem(
                pageId,
                (range) => setDocumentLinkPicker({ range }),
                (message, variant = "danger") => toast(message, variant)
              ),
            ]),
        },
      }),
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
      transformPastedHTML: stripPastedInlineStyles,
      // P18-1: `link: { openOnClick: false }`(아래 StarterKit 설정)는 편집 중 실수로
      // 페이지가 이동되는 걸 막으려고 일반 클릭으로는 링크가 안 열리게 해뒀다 — 그런데
      // 열 수 있는 다른 방법이 전혀 없어 "링크가 아예 안 열린다"는 지적을 받았다.
      // Notion/Google Docs와 같은 관례대로 Ctrl/Cmd+클릭만 새 탭에서 열리게 한다
      // (일반 클릭은 그대로 커서 배치용으로 남는다 — `@tiptap/extension-link`의 기본
      // 클릭 핸들러는 `openOnClick`이 꺼져 있으면 아무 조건에서도 안 열어 준다,
      // node_modules 확인). 버블 메뉴의 "열기" 버튼(`LinkPopoverForm`)과 함께 두 가지
      // 방법 다 제공한다.
      handleClick: (view, _pos, event) => {
        if (!(event.ctrlKey || event.metaKey)) return false;
        const target = event.target as HTMLElement | null;
        const link = target?.closest("a");
        if (!link || !view.dom.contains(link)) return false;
        const href = link.getAttribute("href");
        if (!href || !isSafeLinkHref(href)) return false;
        event.preventDefault();
        window.open(href, "_blank", "noopener,noreferrer");
        return true;
      },
      handleDrop: (view, event) => {
        const file = event.dataTransfer?.files?.[0];
        if (!file || !file.type.startsWith("image/")) return false;
        event.preventDefault();

        // 문서를 저장하기 전(pageId 없음)에는 첨부 대상 페이지가 없어 업로드할 수 없다.
        // 예전에는 아무 안내 없이 조용히 무시해서 "이미지가 안 된다"로만 보였다
        // (2026-08-26 실사용 확인) — 이유를 토스트로 알린다.
        if (!pageId) {
          toast(NOT_SAVED_IMAGE_MESSAGE, "info");
          return true;
        }
        if (countImageNodes(view.state.doc) >= MAX_IMAGES_PER_DOCUMENT) {
          toast(IMAGE_LIMIT_MESSAGE, "info");
          return true;
        }

        const coords = view.posAtCoords({ left: event.clientX, top: event.clientY });
        const pos = coords?.pos ?? view.state.selection.from;
        const uploadId = crypto.randomUUID();
        insertUploadPlaceholder(view, pos, { uploadId, filename: file.name });

        uploadImage(pageId, file)
          .then((uploaded) => resolveUploadPlaceholder(view, uploadId, uploaded))
          .catch((error) => {
            removeUploadPlaceholder(view, uploadId);
            toast(error instanceof Error ? error.message : "이미지 업로드에 실패했습니다.", "danger");
          });
        return true;
      },
      handlePaste: (view, event) => {
        const file = event.clipboardData?.files?.[0];
        if (!file || !file.type.startsWith("image/")) return false;
        event.preventDefault();

        if (!pageId) {
          toast(NOT_SAVED_IMAGE_MESSAGE, "info");
          return true;
        }
        if (countImageNodes(view.state.doc) >= MAX_IMAGES_PER_DOCUMENT) {
          toast(IMAGE_LIMIT_MESSAGE, "info");
          return true;
        }

        const pos = view.state.selection.from;
        const uploadId = crypto.randomUUID();
        insertUploadPlaceholder(view, pos, { uploadId, filename: file.name });

        uploadImage(pageId, file)
          .then((uploaded) => resolveUploadPlaceholder(view, uploadId, uploaded))
          .catch((error) => {
            removeUploadPlaceholder(view, uploadId);
            toast(error instanceof Error ? error.message : "이미지 업로드에 실패했습니다.", "danger");
          });
        return true;
      },
    },
  });

  return (
    <ImagePageIdContext.Provider value={pageId}>
      {editor && <EditorBubbleMenu editor={editor} />}
      {editor && <ImageBubbleMenu editor={editor} />}
      {/*
        2026-08-25에는 prose-sm(본문 14px)으로 낮췄었다 — 그런데 그 저해상도 노트북
        문제의 실제 원인은 헤더의 버튼/링크/태그류(px 낭비가 큰 UI 크롬)였지 본문
        읽기 영역이 아니었다. 그 UI 크롬은 여전히 text-sm으로 압축된 채 유지하고,
        본문만 사내 문서 뷰어(SF-Note) 캡쳐와 비교해 표준 prose 스케일(본문 16px,
        H1 36px/H2 24px/H3 20px)로 되돌렸다(2026-08-26, 실측 비교 — SF-Note의 실제
        본문 폭이 약 819px로 당시 이 프로젝트의 max-w-[820px]와 사실상 동일했고, 다른 건
        본문·헤딩 글자 크기뿐이었다. 본문 최대 폭은 이후 P8-6에서 support.claude.com/ko
        벤치마킹 실측값에 맞춰 max-w-[830px]로 다시 조정됐다 — 819px과의 차이는 여전히
        10px 안쪽이라 이 절의 비교 결론 자체는 바뀌지 않는다).
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
      <DocumentLinkPickerModal
        open={documentLinkPicker !== null}
        onClose={() => setDocumentLinkPicker(null)}
        excludePageId={pageId}
        onSelect={({ pageId: linkedPageId, title }) => {
          if (editor && documentLinkPicker) {
            editor
              .chain()
              .focus()
              .deleteRange(documentLinkPicker.range)
              .insertContent({ type: "documentLink", attrs: { pageId: linkedPageId, title } })
              .run();
          }
          setDocumentLinkPicker(null);
        }}
      />
    </ImagePageIdContext.Provider>
  );
}
