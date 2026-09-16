import { beforeEach, describe, expect, it, vi } from "vitest";
import { createEvent, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ToastProvider } from "@sfood/ui";
import type { Editor, Range } from "@tiptap/core";
import type { JSONContent } from "@tiptap/react";
import { RichTextEditor, createImageSlashItem, createDocumentLinkSlashItem } from "./RichTextEditor";
import * as imageUpload from "@/lib/editor/image-upload";

// P10-1(문서 링크 카드)의 NodeView가 next/navigation의 useRouter를 쓴다 — AppRouterContext
// 없이 호출하면 던지므로 직접 모킹한다(GlobalSearchModal.test.tsx와 동일한 패턴).
const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

/**
 * TipTap(ProseMirror)은 실제 렌더링된 contenteditable에 드래그/붙여넣기 DOM 이벤트를
 * 그대로 받는 구조라, RichTextEditor는 처음엔 테스트가 없었다(P0-4b가 최초로 추가).
 * 이후 기능을 추가할 때마다(P1-7a/c/d, P1-9e) 그 기능의 테스트를 이 파일에 누적해 왔다 —
 * 새 기능을 다룰 땐 별도 파일로 쪼개지 말고 이 파일에 describe 블록을 추가한다.
 */

/**
 * ProseMirror는 브라우저의 네이티브 `Selection`/`Range`를 관찰해 자신의 `TextSelection`으로
 * 변환한다(`view.domObserver`가 `document`의 `selectionchange`를 구독). jsdom/happy-dom도
 * `Range`/`window.getSelection()`을 지원하므로, 텍스트 노드에 `Range`를 만들어 선택한 뒤
 * `selectionchange` 이벤트를 직접 디스패치하면 실제 브라우저의 드래그 선택과 동일하게
 * ProseMirror가 이를 인식한다(스파이크 테스트로 확인) — `EditorBubbleMenu`(텍스트 선택 시
 * 뜨는 서식 메뉴)를 테스트하려면 이 방법 외에는 대안이 없다(RichTextEditor가 editor 인스턴스를
 * 외부에 노출하지 않아 `editor.commands.setTextSelection()`을 직접 호출할 수도 없다).
 */
function selectText(container: HTMLElement, textMatch: string) {
  const editorEl = container.querySelector(".ProseMirror") as HTMLElement;
  editorEl.focus();
  const walker = document.createTreeWalker(editorEl, NodeFilter.SHOW_TEXT);
  let node: Node | null = null;
  while ((node = walker.nextNode())) {
    if (node.textContent?.includes(textMatch)) break;
  }
  if (!node) throw new Error(`텍스트를 찾을 수 없습니다: ${textMatch}`);
  const range = document.createRange();
  range.selectNodeContents(node);
  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
  document.dispatchEvent(new Event("selectionchange"));
}

/**
 * `selectText`와 같은 원리(네이티브 Range → selectionchange)로, 선택 범위 대신 텍스트
 * 뒤쪽에 커서(collapsed selection)만 둔다 — Tab 들여쓰기처럼 "커서 위치에 삽입"하는
 * 동작을 검증하려면 텍스트를 선택하지 않고 커서만 옮겨야 한다.
 */
function placeCursorAfter(container: HTMLElement, textMatch: string) {
  const editorEl = container.querySelector(".ProseMirror") as HTMLElement;
  editorEl.focus();
  const walker = document.createTreeWalker(editorEl, NodeFilter.SHOW_TEXT);
  let node: Node | null = null;
  while ((node = walker.nextNode())) {
    if (node.textContent?.includes(textMatch)) break;
  }
  if (!node) throw new Error(`텍스트를 찾을 수 없습니다: ${textMatch}`);
  const offset = node.textContent!.indexOf(textMatch) + textMatch.length;
  const range = document.createRange();
  range.setStart(node, offset);
  range.collapse(true);
  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
  document.dispatchEvent(new Event("selectionchange"));
}

/**
 * N개의 이미지 노드를 담은 TipTap doc을 만든다. image 노드는 `inline: false`(기본값)라
 * 스키마상 `paragraph`(content: "inline*")가 아니라 `doc`(content: "block+")의 직계
 * 자식이어야 한다 — 예전엔 이미지들을 paragraph 안에 넣어뒀는데, 초기 `content` prop
 * 로드는 이 위반을 조용히 허용했지만(엄격 검증 없이 JSON에서 직접 구성) 이후 그 paragraph
 * 안으로 `tr.insert`를 시도하면 콘텐츠 매칭 자체가 깨져 있어 "Invalid content for node
 * paragraph"로 실패한다(P17-9에서 업로드 placeholder를 동기적으로 insert하며 실제로
 * 드러남 — 이전엔 promise then() 안에서 비동기로만 삽입해 이 테스트가 그 시점 전에
 * 끝나 버그가 가려져 있었다). 이미지를 doc의 최상위 블록으로 바로 둬 스키마를 맞춘다.
 */
function docWithImages(count: number): JSONContent {
  return {
    type: "doc",
    content: Array.from({ length: count }, (_, i) => ({
      type: "image",
      attrs: { src: `https://example.com/${i}.png`, filename: `${i}.png` },
    })),
  };
}

function makeImageFile(name = "photo.png") {
  return new File(["fake-image-bytes"], name, { type: "image/png" });
}

/** jsdom의 DataTransfer는 files를 직접 대입할 수 없어, 최소 형태로 흉내 낸 대역을 쓴다. */
function fireDrop(container: HTMLElement, file: File) {
  const target = container.querySelector(".ProseMirror") as HTMLElement;
  const event = new Event("drop", { bubbles: true, cancelable: true }) as DragEvent;
  Object.defineProperty(event, "dataTransfer", {
    value: { files: [file], types: ["Files"], getData: () => "" },
  });
  Object.defineProperty(event, "clientX", { value: 0 });
  Object.defineProperty(event, "clientY", { value: 0 });
  target.dispatchEvent(event);
}

function firePaste(container: HTMLElement, file: File) {
  const target = container.querySelector(".ProseMirror") as HTMLElement;
  const event = new Event("paste", { bubbles: true, cancelable: true }) as ClipboardEvent;
  Object.defineProperty(event, "clipboardData", {
    value: { files: [file], types: ["Files"], getData: () => "" },
  });
  target.dispatchEvent(event);
}

/**
 * Word/Google Docs 등 외부 출처의 HTML 붙여넣기를 흉내 낸다(파일 없이 text/html만).
 * `text/html`/`text/plain` 외의 타입(예: VS Code 붙여넣기 감지용 `vscode-editor-data`)은
 * 빈 문자열을 돌려줘야 한다 — 그렇지 않으면 다른 확장(@tiptap/extension-code-block의
 * VS Code 붙여넣기 핸들러)이 그 값을 JSON으로 파싱하려다 실패한다.
 */
function firePasteHtml(container: HTMLElement, html: string, text: string) {
  const target = container.querySelector(".ProseMirror") as HTMLElement;
  const event = new Event("paste", { bubbles: true, cancelable: true }) as ClipboardEvent;
  Object.defineProperty(event, "clipboardData", {
    value: {
      files: [],
      types: ["text/html", "text/plain"],
      getData: (type: string) => {
        if (type === "text/html") return html;
        if (type === "text/plain") return text;
        return "";
      },
    },
  });
  target.dispatchEvent(event);
}

function tableNode(rows = 2, cols = 2, label = ""): JSONContent {
  return {
    type: "table",
    content: Array.from({ length: rows }, (_, r) => ({
      type: "tableRow",
      content: Array.from({ length: cols }, (_, c) => ({
        type: "tableCell",
        content: [{ type: "paragraph", content: [{ type: "text", text: `${label}r${r}c${c}` }] }],
      })),
    })),
  };
}

/**
 * 표가 문서의 맨 첫 노드일 때, TipTap이 초기화 시 기본 선택(`Selection.atStart`)을
 * 문서 시작 지점의 유효한 위치로 잡는데, 그게 곧 첫 셀 안이다 — 그래서 별도의 클릭/선택
 * 시뮬레이션 없이도 렌더링 직후 이 표의 툴바(`TableToolbar`, `StickyTableView`가 커서
 * 위치를 계산해 활성화)가 보인다(실측 확인됨). 표 뒤에 별도 문단이 있는 문서는 이 전제가
 * 깨지므로 "표 밖" 회귀 테스트에 쓴다.
 */
function tableFirstDoc(rows = 2, cols = 2): JSONContent {
  return { type: "doc", content: [tableNode(rows, cols)] };
}

function tableRowCount(container: HTMLElement): number {
  return container.querySelectorAll(".ProseMirror table tr").length;
}

function tableColumnCount(container: HTMLElement): number {
  return container.querySelectorAll(".ProseMirror table tr")[0]?.children.length ?? 0;
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("RichTextEditor 표 행/열 컨트롤(P1-7a)", () => {
  it("커서가 표 밖에 있으면 표 컨트롤이 보이지 않는다", () => {
    const { container } = render(
      <ToastProvider>
        <RichTextEditor
          content={{ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "본문" }] }] }}
          onChange={vi.fn()}
        />
      </ToastProvider>
    );

    expect(screen.queryByLabelText("행 추가(아래)")).not.toBeInTheDocument();
    expect(container.querySelector("table")).not.toBeInTheDocument();
  });

  it("커서가 표 안에 있으면 행/열 추가·삭제 버튼이 모두 보인다", async () => {
    render(
      <ToastProvider>
        <RichTextEditor content={tableFirstDoc()} onChange={vi.fn()} />
      </ToastProvider>
    );

    for (const label of ["행 추가(위)", "행 추가(아래)", "행 삭제", "열 추가(왼쪽)", "열 추가(오른쪽)", "열 삭제"]) {
      await waitFor(() => expect(screen.getByLabelText(label)).toBeInTheDocument());
    }
  });

  it("행 추가(아래)를 클릭하면 표에 행이 하나 늘어난다", async () => {
    const { container } = render(
      <ToastProvider>
        <RichTextEditor content={tableFirstDoc(2, 2)} onChange={vi.fn()} />
      </ToastProvider>
    );

    expect(tableRowCount(container)).toBe(2);

    (await screen.findByLabelText("행 추가(아래)")).click();

    await waitFor(() => expect(tableRowCount(container)).toBe(3));
  });

  it("행 삭제를 클릭하면 표의 행이 하나 줄어든다", async () => {
    const { container } = render(
      <ToastProvider>
        <RichTextEditor content={tableFirstDoc(2, 2)} onChange={vi.fn()} />
      </ToastProvider>
    );

    (await screen.findByLabelText("행 삭제")).click();

    await waitFor(() => expect(tableRowCount(container)).toBe(1));
  });

  it("열 추가(오른쪽)를 클릭하면 표에 열이 하나 늘어난다", async () => {
    const { container } = render(
      <ToastProvider>
        <RichTextEditor content={tableFirstDoc(2, 2)} onChange={vi.fn()} />
      </ToastProvider>
    );

    expect(tableColumnCount(container)).toBe(2);

    (await screen.findByLabelText("열 추가(오른쪽)")).click();

    await waitFor(() => expect(tableColumnCount(container)).toBe(3));
  });

  it("열 삭제를 클릭하면 표의 열이 하나 줄어든다", async () => {
    const { container } = render(
      <ToastProvider>
        <RichTextEditor content={tableFirstDoc(2, 2)} onChange={vi.fn()} />
      </ToastProvider>
    );

    (await screen.findByLabelText("열 삭제")).click();

    await waitFor(() => expect(tableColumnCount(container)).toBe(1));
  });

  /**
   * TipTap이 감싸는 prosemirror-tables의 deleteRow/deleteColumn은 `editor.can()`(dispatch
   * 없이 호출)에서는 "표 안에 있는지"만 확인할 뿐 "마지막 한 행/열인지"는 검사하지 않는다
   * (node_modules/prosemirror-tables/dist/index.cjs 확인 — 그 경계 검사는 `if (dispatch)`
   * 블록 안에만 있어 `can()` 호출(dispatch=undefined) 경로를 타지 않는다). 그래서 이
   * 프로젝트의 다른 표 버튼과 달리 이 경계에서는 버튼이 비활성화되지 않는다 — 대신 실제
   * 클릭 시 라이브러리가 트랜잭션 자체를 디스패치하지 않아 조용히 아무 일도 일어나지
   * 않는다(표가 깨지거나 빈 표가 되지 않음). 이 실제 동작을 그대로 회귀 테스트로 고정한다.
   */
  it("행이 1개뿐일 때 행 삭제를 클릭해도 표가 그대로 유지된다(라이브러리가 마지막 행 삭제를 조용히 막음)", async () => {
    const { container } = render(
      <ToastProvider>
        <RichTextEditor content={tableFirstDoc(1, 2)} onChange={vi.fn()} />
      </ToastProvider>
    );

    (await screen.findByLabelText("행 삭제")).click();

    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(tableRowCount(container)).toBe(1);
  });

  it("열이 1개뿐일 때 열 삭제를 클릭해도 표가 그대로 유지된다(라이브러리가 마지막 열 삭제를 조용히 막음)", async () => {
    const { container } = render(
      <ToastProvider>
        <RichTextEditor content={tableFirstDoc(2, 1)} onChange={vi.fn()} />
      </ToastProvider>
    );

    (await screen.findByLabelText("열 삭제")).click();

    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(tableColumnCount(container)).toBe(1);
  });

  /**
   * P1-7a 3차 재설계의 핵심 목표: 표마다 독립된 NodeView(팩토리로 만든 `StickyTableView`)가
   * "커서가 이 표 노드와 같은 객체인가"(`findParentNodeClosestToPos` + 참조 비교, P1-7b에서
   * `getPos` 의존을 없애며 바뀜)를 직접 계산해 컨트롤 표시 여부를 결정한다 —
   * `editor.isActive("table")`만으로는 표가 여러 개일 때 "어떤" 표인지 구분할 수 없어 이
   * 시나리오를 검증할 수 없다.
   */
  it("문서에 표가 여러 개면 커서가 있는 표에만 컨트롤이 나타난다", async () => {
    const doc: JSONContent = {
      type: "doc",
      content: [
        tableNode(2, 2, "A"),
        { type: "paragraph", content: [{ type: "text", text: "구분 문단" }] },
        tableNode(2, 2, "B"),
      ],
    };

    render(
      <ToastProvider>
        <RichTextEditor content={doc} onChange={vi.fn()} />
      </ToastProvider>
    );

    // 초기 선택은 문서 첫 표(A) 안에 있으므로, 두 표 중 정확히 하나의 컨트롤 세트만 보여야 한다.
    await waitFor(() => expect(screen.getAllByLabelText("행 추가(아래)")).toHaveLength(1));
  });

  /**
   * P17-3: "행 삭제"·"열 삭제"·"표 삭제" 버튼이 전부 같은 범용 휴지통 아이콘을 재사용해
   * aria-label/Tooltip 없이는(마우스 오버·스크린리더 없이는) 구분이 안 된다는 지적을
   * 받았다. 세 버튼의 실제 아이콘(SVG) 마크업이 서로 달라야 시각적으로도 구분된다 —
   * label 텍스트만으로는 이 회귀를 잡을 수 없어, 버튼 내부 SVG의 innerHTML을 직접 비교한다.
   */
  it("행 삭제·열 삭제·표 삭제 버튼은 서로 다른 아이콘을 쓴다", async () => {
    render(
      <ToastProvider>
        <RichTextEditor content={tableFirstDoc()} onChange={vi.fn()} />
      </ToastProvider>
    );

    const rowDeleteIcon = (await screen.findByLabelText("행 삭제")).querySelector("svg")?.innerHTML;
    const columnDeleteIcon = (await screen.findByLabelText("열 삭제")).querySelector("svg")?.innerHTML;
    const tableDeleteIcon = (await screen.findByLabelText("표 삭제")).querySelector("svg")?.innerHTML;

    expect(rowDeleteIcon).toBeTruthy();
    expect(columnDeleteIcon).toBeTruthy();
    expect(tableDeleteIcon).toBeTruthy();
    expect(rowDeleteIcon).not.toBe(columnDeleteIcon);
    expect(rowDeleteIcon).not.toBe(tableDeleteIcon);
    expect(columnDeleteIcon).not.toBe(tableDeleteIcon);
  });

  /**
   * P17-10: 이 툴바는 `sticky top-14`라 표를 스크롤하면 `EditorShell`의 본문 스크롤
   * 컨테이너(`overflow-y-auto`) 맨 위에 들러붙는다 — 그 상태에서 기본값(side="top")
   * 툴팁은 버튼 위쪽으로 그려지는데, 그 공간이 스크롤 컨테이너 경계 밖이라 대부분
   * 잘려서 둥근 모서리도 글자도 없이 얇은 흰 띠만 보이는 걸 실제로 재현해 확인했다
   * (P14-3과 같은 "overflow-y-auto가 overflow-x까지 auto로 강제해 경계 밖 절대위치
   * 요소를 자른다"는 클리핑 원인). 버튼 아래(side="bottom")는 항상 표 본문이 있어
   * 구조적으로 이 문제가 생기지 않는다 — 툴팁이 실제로 `side="bottom"`으로 뜨는지
   * 확인한다(className에 "top-full"이 있으면 아래, "bottom-full"이면 위).
   */
  it("표 툴바 버튼의 툴팁은 버튼 아래(side=bottom)에 뜬다", async () => {
    render(
      <ToastProvider>
        <RichTextEditor content={tableFirstDoc()} onChange={vi.fn()} />
      </ToastProvider>
    );

    for (const label of ["행 추가(위)", "행 삭제", "표 삭제"]) {
      const button = await screen.findByLabelText(label);
      fireEvent.mouseEnter(button);

      const tooltip = await screen.findByRole("tooltip");
      expect(tooltip).toHaveTextContent(label);
      expect(tooltip.className).toContain("top-full");
      expect(tooltip.className).not.toContain("bottom-full");

      fireEvent.mouseLeave(button);
    }
  });

  /**
   * P17-12(사용자 추가 요청): 표 툴바 버튼은 `<table>`의 `contentDOM`(tbody) 밖에
   * 있는 별도 슬롯에 렌더링된다(위 파일 상단 `createStickyTableView` 주석 참고) —
   * `onMouseDown`으로 기본 동작을 막지 않으면, 버튼을 누르는 순간 브라우저가 기존
   * 에디터 선택(사용자가 마지막으로 클릭해 둔 행/셀)을 표의 첫 셀로 되돌려 버려
   * "행 추가가 항상 1행 기준으로 된다"/"셀 병합 버튼은 활성화되는데 눌러도 아무
   * 일도 안 일어난다"는 두 증상으로 이어졌다(사용자가 실제 브라우저에서 직접
   * 재현·진단 — 이 프로젝트의 jsdom 테스트 환경은 이 브라우저 고유의 선택-되돌림
   * 동작 자체를 재현하지 않아, 여기서는 "버튼이 mousedown의 기본 동작을 막는다"는
   * 핸들러 자체의 존재만 회귀 방지로 고정한다).
   */
  it("표 툴바 버튼은 mousedown의 기본 동작을 막아 에디터 선택이 바뀌지 않게 한다", async () => {
    render(
      <ToastProvider>
        <RichTextEditor content={tableFirstDoc()} onChange={vi.fn()} />
      </ToastProvider>
    );

    for (const label of ["행 추가(위)", "행 추가(아래)", "행 삭제", "열 추가(왼쪽)", "열 추가(오른쪽)", "열 삭제"]) {
      const button = await screen.findByLabelText(label);
      const event = createEvent.mouseDown(button);
      fireEvent(button, event);
      expect(event.defaultPrevented, `"${label}" 버튼의 mousedown이 preventDefault되지 않았습니다`).toBe(true);
    }
  });
});

describe("RichTextEditor 표 삭제(P2-4)", () => {
  it("표 삭제 버튼을 클릭해도 바로 삭제되지 않고 확인 Modal이 뜬다", async () => {
    const { container } = render(
      <ToastProvider>
        <RichTextEditor content={tableFirstDoc()} onChange={vi.fn()} />
      </ToastProvider>
    );

    (await screen.findByLabelText("표 삭제")).click();

    expect(
      await screen.findByText("표를 삭제하시겠습니까? 표 안의 모든 내용이 함께 삭제되며 되돌릴 수 없습니다.")
    ).toBeInTheDocument();
    expect(container.querySelector("table")).not.toBeNull();
  });

  it("확인 Modal에서 취소하면 표가 그대로 유지된다", async () => {
    const { container } = render(
      <ToastProvider>
        <RichTextEditor content={tableFirstDoc()} onChange={vi.fn()} />
      </ToastProvider>
    );

    (await screen.findByLabelText("표 삭제")).click();
    (await screen.findByRole("button", { name: "취소" })).click();

    await waitFor(() =>
      expect(
        screen.queryByText("표를 삭제하시겠습니까? 표 안의 모든 내용이 함께 삭제되며 되돌릴 수 없습니다.")
      ).not.toBeInTheDocument()
    );
    expect(container.querySelector("table")).not.toBeNull();
  });

  it("확인 Modal에서 삭제 확인을 누르면 표가 삭제되고 onChange에 반영된다", async () => {
    const onChange = vi.fn();
    const { container } = render(
      <ToastProvider>
        <RichTextEditor content={tableFirstDoc()} onChange={onChange} />
      </ToastProvider>
    );

    (await screen.findByLabelText("표 삭제")).click();
    (await screen.findByRole("button", { name: "삭제 확인" })).click();

    await waitFor(() => expect(container.querySelector("table")).toBeNull());

    const lastDoc = onChange.mock.calls.at(-1)?.[0] as JSONContent;
    expect(lastDoc.content?.some((n) => n.type === "table")).toBe(false);
  });

  it("문서에 표가 여러 개일 때 삭제해도 커서가 있던 표만 삭제되고 다른 표는 유지된다", async () => {
    const doc: JSONContent = {
      type: "doc",
      content: [
        tableNode(2, 2, "A"),
        { type: "paragraph", content: [{ type: "text", text: "구분 문단" }] },
        tableNode(2, 2, "B"),
      ],
    };
    const { container } = render(
      <ToastProvider>
        <RichTextEditor content={doc} onChange={vi.fn()} />
      </ToastProvider>
    );

    // 초기 선택은 첫 표(A) 안에 있다(위 "표가 여러 개면 커서가 있는 표에만 컨트롤이 나타난다" 테스트와 동일한 전제).
    (await screen.findByLabelText("표 삭제")).click();
    (await screen.findByRole("button", { name: "삭제 확인" })).click();

    await waitFor(() => expect(container.querySelectorAll("table")).toHaveLength(1));
  });
});

describe("RichTextEditor 이미지 개수 상한(P0-4b)", () => {
  it("이미지가 30장 미만이면 드래그앤드롭 업로드가 정상적으로 시작된다", async () => {
    const uploadSpy = vi
      .spyOn(imageUpload, "uploadImage")
      .mockResolvedValue({ url: "https://example.com/new.png", filename: "new.png" });

    const { container } = render(
      <ToastProvider>
        <RichTextEditor content={docWithImages(29)} onChange={vi.fn()} pageId="doc-1" />
      </ToastProvider>
    );

    fireDrop(container, makeImageFile());

    await waitFor(() => expect(uploadSpy).toHaveBeenCalledTimes(1));
  });

  it("이미지가 이미 30장이면 드래그앤드롭 업로드를 시작하지 않고 안내 토스트를 띄운다", async () => {
    const uploadSpy = vi.spyOn(imageUpload, "uploadImage");

    const { container } = render(
      <ToastProvider>
        <RichTextEditor content={docWithImages(30)} onChange={vi.fn()} pageId="doc-1" />
      </ToastProvider>
    );

    fireDrop(container, makeImageFile());

    expect(
      await screen.findByText("이미지는 문서당 최대 30장까지 첨부할 수 있습니다.")
    ).toBeInTheDocument();
    expect(uploadSpy).not.toHaveBeenCalled();
  });

  it("이미지가 이미 30장이면 붙여넣기 업로드도 시작하지 않는다", async () => {
    const uploadSpy = vi.spyOn(imageUpload, "uploadImage");

    const { container } = render(
      <ToastProvider>
        <RichTextEditor content={docWithImages(30)} onChange={vi.fn()} pageId="doc-1" />
      </ToastProvider>
    );

    firePaste(container, makeImageFile());

    expect(
      await screen.findByText("이미지는 문서당 최대 30장까지 첨부할 수 있습니다.")
    ).toBeInTheDocument();
    expect(uploadSpy).not.toHaveBeenCalled();
  });
});

describe("슬래시 메뉴 이미지/문서 링크 항목 — 저장 전 pageId 없음 처리(P17-1, P17-2)", () => {
  const RANGE: Range = { from: 1, to: 2 };

  it("createImageSlashItem: pageId가 없으면 파일 선택 창을 열지 않고 안내 토스트만 알린다", () => {
    const clickSpy = vi.spyOn(HTMLInputElement.prototype, "click").mockImplementation(() => {});
    const notify = vi.fn();
    const item = createImageSlashItem(undefined, notify);

    item.run({} as Editor, RANGE);

    expect(notify).toHaveBeenCalledWith("문서를 먼저 저장한 뒤에 이미지를 추가할 수 있습니다.", "info");
    expect(clickSpy).not.toHaveBeenCalled();
  });

  it("createImageSlashItem: pageId가 있으면 안내 없이 파일 선택 창을 연다", () => {
    const clickSpy = vi.spyOn(HTMLInputElement.prototype, "click").mockImplementation(() => {});
    const notify = vi.fn();
    const item = createImageSlashItem("doc-1", notify);

    item.run({} as Editor, RANGE);

    expect(notify).not.toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalledTimes(1);
  });

  it("createDocumentLinkSlashItem: pageId가 없으면 피커를 열지 않고 안내 토스트만 알린다", () => {
    const onOpen = vi.fn();
    const notify = vi.fn();
    const item = createDocumentLinkSlashItem(undefined, onOpen, notify);

    item.run({} as Editor, RANGE);

    expect(notify).toHaveBeenCalledWith("문서를 먼저 저장한 뒤에 문서 링크를 추가할 수 있습니다.", "info");
    expect(onOpen).not.toHaveBeenCalled();
  });

  it("createDocumentLinkSlashItem: pageId가 있으면 안내 없이 피커를 연다", () => {
    const onOpen = vi.fn();
    const notify = vi.fn();
    const item = createDocumentLinkSlashItem("doc-1", onOpen, notify);

    item.run({} as Editor, RANGE);

    expect(notify).not.toHaveBeenCalled();
    expect(onOpen).toHaveBeenCalledWith(RANGE);
  });
});

describe("RichTextEditor 코드블록 문법 강조(P1-7c)", () => {
  /**
   * language 속성을 지정하지 않아도 lowlight가 내용을 보고 자동으로 언어를 추정해
   * 강조한다(CodeBlockLowlight의 실제 동작, node_modules 확인) — 그래서 language 없이도
   * 최소 하나의 hljs-* 토큰 span이 나오는지만 확인한다. 정확히 어떤 토큰으로 분류되는지
   * (예: "const"가 keyword로 분류되는지)는 lowlight/highlight.js 내부 언어 추정 로직에
   * 달려 있어 이 프로젝트가 검증할 대상이 아니다 — "강조 자체가 동작하는가"만 확인한다.
   */
  it("코드블록 안의 코드에 문법 강조 토큰(hljs-*)이 붙는다", async () => {
    const { container } = render(
      <ToastProvider>
        <RichTextEditor
          content={{
            type: "doc",
            content: [
              {
                type: "codeBlock",
                content: [{ type: "text", text: "const x = 1;\nconsole.log(x);" }],
              },
            ],
          }}
          onChange={vi.fn()}
        />
      </ToastProvider>
    );

    // P17-5b에서 코드 블록에 NodeView(언어 선택 UI)가 생기면서, 그 안의 <pre><code>는
    // TipTap의 ReactNodeViewRenderer가 별도 React 렌더 사이클로 마운트한다 — 최초
    // render() 직후 동기적으로는 아직 없을 수 있어 waitFor로 기다린다.
    const codeEl = await waitFor(() => {
      const el = container.querySelector("pre code");
      if (!el) throw new Error("코드 블록이 아직 렌더링되지 않았습니다.");
      return el;
    });
    expect(codeEl.querySelector('[class^="hljs-"]')).not.toBeNull();
  });
});

/**
 * P17-5b: 코드 블록마다 언어를 직접 고를 수 있는 UI가 없어 lowlight의 자동 추정이
 * 틀려도 바로잡을 방법이 없었다 — `CodeBlockView` NodeView가 코드 블록 오른쪽 위에
 * 언어 선택 드롭다운을 띄우고, 고른 값이 `codeBlock` 노드의 `language` attrs로
 * 반영되는지 확인한다.
 */
describe("RichTextEditor 코드 블록 언어 선택(P17-5b)", () => {
  function codeBlockDoc(text = "print('hi')") {
    return { type: "doc", content: [{ type: "codeBlock", content: [{ type: "text", text }] }] } as JSONContent;
  }

  it("코드 블록마다 언어 선택 드롭다운이 보이고, lowlight가 지원하는 언어 목록을 담고 있다", async () => {
    render(
      <ToastProvider>
        <RichTextEditor content={codeBlockDoc()} onChange={vi.fn()} />
      </ToastProvider>
    );

    const select = await screen.findByLabelText("코드 언어");
    const options = Array.from(select.querySelectorAll("option")).map((o) => o.textContent);
    expect(options).toContain("자동 감지");
    expect(options).toContain("javascript");
    expect(options).toContain("python");
  });

  it("드롭다운에서 언어를 고르면 codeBlock 노드의 language attrs가 그 값으로 바뀐다", async () => {
    const onChange = vi.fn();
    render(
      <ToastProvider>
        <RichTextEditor content={codeBlockDoc()} onChange={onChange} />
      </ToastProvider>
    );

    const select = await screen.findByLabelText("코드 언어");
    fireEvent.change(select, { target: { value: "python" } });

    await waitFor(() => {
      const lastDoc = onChange.mock.calls.at(-1)?.[0] as JSONContent;
      expect(lastDoc.content?.[0]?.attrs?.language).toBe("python");
    });
  });

  it("'자동 감지'를 다시 고르면 language attrs가 null로 돌아간다", async () => {
    const onChange = vi.fn();
    render(
      <ToastProvider>
        <RichTextEditor content={codeBlockDoc()} onChange={onChange} />
      </ToastProvider>
    );

    const select = await screen.findByLabelText("코드 언어");
    fireEvent.change(select, { target: { value: "python" } });
    await waitFor(() => {
      const lastDoc = onChange.mock.calls.at(-1)?.[0] as JSONContent;
      expect(lastDoc.content?.[0]?.attrs?.language).toBe("python");
    });

    fireEvent.change(select, { target: { value: "" } });

    await waitFor(() => {
      const lastDoc = onChange.mock.calls.at(-1)?.[0] as JSONContent;
      expect(lastDoc.content?.[0]?.attrs?.language).toBeNull();
    });
  });
});

/**
 * P17-5c: 코드 블록 전체를 클립보드에 복사하는 버튼. jsdom엔 `navigator.clipboard`가
 * 없어 각 테스트에서 `writeText`를 직접 모킹한다.
 */
describe("RichTextEditor 코드 블록 복사 버튼(P17-5c)", () => {
  function codeBlockDoc(text = "print('hi')") {
    return { type: "doc", content: [{ type: "codeBlock", content: [{ type: "text", text }] }] } as JSONContent;
  }

  function mockClipboard(writeText: (text: string) => Promise<void>) {
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: vi.fn(writeText) },
      configurable: true,
    });
  }

  it("복사 버튼을 클릭하면 코드 블록의 텍스트가 클립보드에 복사되고 성공 토스트가 뜬다", async () => {
    mockClipboard(() => Promise.resolve());
    render(
      <ToastProvider>
        <RichTextEditor content={codeBlockDoc("print('hi')")} onChange={vi.fn()} />
      </ToastProvider>
    );

    const button = await screen.findByLabelText("코드 복사");
    fireEvent.click(button);

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith("print('hi')");
    });
    expect(await screen.findByText("코드를 클립보드에 복사했습니다.")).toBeInTheDocument();
  });

  it("클립보드 복사가 실패하면 실패 토스트가 뜬다", async () => {
    mockClipboard(() => Promise.reject(new Error("denied")));
    render(
      <ToastProvider>
        <RichTextEditor content={codeBlockDoc()} onChange={vi.fn()} />
      </ToastProvider>
    );

    const button = await screen.findByLabelText("코드 복사");
    fireEvent.click(button);

    expect(await screen.findByText("코드 복사에 실패했습니다.")).toBeInTheDocument();
  });

  it("코드 블록이 여러 개일 때 각 복사 버튼은 자신의 코드만 복사한다", async () => {
    mockClipboard(() => Promise.resolve());
    render(
      <ToastProvider>
        <RichTextEditor
          content={{
            type: "doc",
            content: [
              { type: "codeBlock", content: [{ type: "text", text: "first" }] },
              { type: "codeBlock", content: [{ type: "text", text: "second" }] },
            ],
          }}
          onChange={vi.fn()}
        />
      </ToastProvider>
    );

    const buttons = await screen.findAllByLabelText("코드 복사");
    expect(buttons).toHaveLength(2);

    fireEvent.click(buttons[1]);
    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith("second");
    });
  });
});

/**
 * P17-11: 사용자 피드백 — "코드 블록이니까 IDE 느낌이면 좋겠다"는 요청 중 줄 번호
 * 부분. 코드가 몇 줄인지에 맞춰 거터에 그만큼의 줄 번호가 순서대로 보이는지, 코드가
 * 바뀌면(줄 추가/삭제) 그 수도 함께 바뀌는지 확인한다.
 */
describe("RichTextEditor 코드 블록 줄 번호(P17-11)", () => {
  it("코드 블록의 줄 수만큼 거터에 줄 번호가 순서대로 보인다", async () => {
    const { container } = render(
      <ToastProvider>
        <RichTextEditor
          content={{
            type: "doc",
            content: [{ type: "codeBlock", content: [{ type: "text", text: "a\nb\nc" }] }],
          }}
          onChange={vi.fn()}
        />
      </ToastProvider>
    );

    const gutter = await waitFor(() => {
      const el = container.querySelector(".code-block-gutter");
      if (!el) throw new Error("줄 번호 거터가 아직 렌더링되지 않았습니다.");
      return el;
    });
    expect(Array.from(gutter.children).map((el) => el.textContent)).toEqual(["1", "2", "3"]);
  });

  it("빈 코드 블록에는 줄 번호가 1개만 보인다", async () => {
    const { container } = render(
      <ToastProvider>
        <RichTextEditor
          content={{ type: "doc", content: [{ type: "codeBlock" }] }}
          onChange={vi.fn()}
        />
      </ToastProvider>
    );

    const gutter = await waitFor(() => {
      const el = container.querySelector(".code-block-gutter");
      if (!el) throw new Error("줄 번호 거터가 아직 렌더링되지 않았습니다.");
      return el;
    });
    expect(Array.from(gutter.children).map((el) => el.textContent)).toEqual(["1"]);
  });
});

/**
 * P17-5a: `CodeBlockLowlight`의 `enableTabIndentation`이 기본값 false라 코드 블록
 * 안에서 Tab을 눌러도 무시되고 포커스가 에디터 밖으로 빠져나갔다 — "코드 블록 편집이
 * 불편하다"는 지적 중 하나. 옵션을 켠 뒤 실제로 Tab이 들여쓰기(공백 4칸 삽입)로
 * 동작하는지 확인한다.
 */
describe("RichTextEditor 코드 블록 Tab 들여쓰기(P17-5a)", () => {
  it("코드 블록 안에서 Tab을 누르면 커서 위치에 공백 4칸이 삽입된다", async () => {
    const { container } = render(
      <ToastProvider>
        <RichTextEditor
          content={{
            type: "doc",
            content: [{ type: "codeBlock", content: [{ type: "text", text: "const x = 1;" }] }],
          }}
          onChange={vi.fn()}
        />
      </ToastProvider>
    );

    // 문법 강조가 코드 텍스트를 hljs-* <span>별로 여러 텍스트 노드로 쪼개므로("const x =
    // 1;" 전체를 담은 단일 텍스트 노드가 없음), 마지막 글자(";")만으로 커서를 코드
    // 끝으로 옮긴다.
    placeCursorAfter(container, ";");
    const editorEl = container.querySelector(".ProseMirror") as HTMLElement;
    fireEvent.keyDown(editorEl, { key: "Tab", code: "Tab" });

    await waitFor(() =>
      expect(container.querySelector("pre code")?.textContent).toBe("const x = 1;    ")
    );
  });

  it("코드 블록 밖(일반 문단)에서는 Tab을 눌러도 들여쓰기가 삽입되지 않는다", async () => {
    const { container } = render(
      <ToastProvider>
        <RichTextEditor
          content={{ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "일반 문단" }] }] }}
          onChange={vi.fn()}
        />
      </ToastProvider>
    );

    placeCursorAfter(container, "일반 문단");
    const editorEl = container.querySelector(".ProseMirror") as HTMLElement;
    fireEvent.keyDown(editorEl, { key: "Tab", code: "Tab" });

    expect(container.querySelector(".ProseMirror p")?.textContent).toBe("일반 문단");
  });
});

describe("RichTextEditor 붙여넣기 서식 정제(P1-7d)", () => {
  /**
   * Word/Google Docs는 텍스트 조각마다 `<span style="color:...">`를 촘촘히 붙여 내보낸다.
   * 이 프로젝트의 Color 마크는 style이 있는 span을 만나면 그 color를 그대로 읽어들이므로
   * (실측 확인), 정제 없이 붙여넣으면 "글자색은 정해진 스와치로만" 제한한 기존 결정이
   * 붙여넣기 경로로 우회된다 — 그 우회가 실제로 막혔는지 확인한다.
   */
  it("외부에서 붙여넣은 인라인 스타일(색상)이 문서에 반영되지 않는다", async () => {
    const onChange = vi.fn();
    const { container } = render(
      <ToastProvider>
        <RichTextEditor
          content={{ type: "doc", content: [{ type: "paragraph", content: [] }] }}
          onChange={onChange}
        />
      </ToastProvider>
    );

    firePasteHtml(
      container,
      '<span style="color: rgb(255, 0, 0); font-family: Arial;">외부 텍스트</span>',
      "외부 텍스트"
    );

    await waitFor(() => expect(onChange).toHaveBeenCalled());

    // stripPastedInlineStyles가 style 속성을 걷어내면 textStyle 마크의 parseHTML 규칙
    // 자체가 매치하지 않아(구현이 `!element.hasAttribute("style")`이면 규칙을 아예
    // 적용하지 않는다) 색상 마크가 붙지 않는다 — 그래서 style이 있는 요소 자체가
    // 없어야 하고, 텍스트 내용만 그대로 살아있어야 한다.
    expect(container.querySelector(".ProseMirror [style]")).toBeNull();
    expect(container.textContent).toContain("외부 텍스트");
  });
});

describe("RichTextEditor 기본 렌더링(P1-9e)", () => {
  it("content prop으로 넘긴 문서를 그대로 렌더링한다", () => {
    render(
      <ToastProvider>
        <RichTextEditor
          content={{ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "안녕하세요" }] }] }}

          onChange={vi.fn()}
        />
      </ToastProvider>
    );


    expect(screen.getByText("안녕하세요")).toBeInTheDocument();
  });
});

describe("RichTextEditor 패널 아이콘(P9-1)", () => {
  it.each([
    ["info", "ℹ️"],
    ["warning", "⚠️"],
    ["note", "📝"],
  ])("icon attrs가 없는 패널(panelType: %s)은 타입 기본 아이콘(%s)으로 렌더링된다", async (panelType, icon) => {
    const { container } = render(
      <ToastProvider>
        <RichTextEditor
          content={{
            type: "doc",
            content: [
              {
                type: "panel",
                attrs: { panelType },
                content: [{ type: "paragraph", content: [{ type: "text", text: "내용" }] }],
              },
            ],
          }}
          onChange={vi.fn()}
        />
      </ToastProvider>
    );

    await waitFor(() => expect(container.querySelector(".panel-icon")?.textContent).toBe(icon));
  });

  it("icon attrs가 명시된 패널은 타입 기본값 대신 그 아이콘으로 렌더링된다", async () => {
    const { container } = render(
      <ToastProvider>
        <RichTextEditor
          content={{
            type: "doc",
            content: [
              {
                type: "panel",
                attrs: { panelType: "note", icon: "🔥" },
                content: [{ type: "paragraph", content: [{ type: "text", text: "커스텀 아이콘" }] }],
              },
            ],
          }}
          onChange={vi.fn()}
        />
      </ToastProvider>
    );

    await waitFor(() => expect(container.querySelector(".panel-icon")?.textContent).toBe("🔥"));
    expect(screen.getByText("커스텀 아이콘")).toBeInTheDocument();
  });

  it("아이콘을 클릭하면 큐레이션된 이모지 그리드가 열리고, 고르면 패널 아이콘이 바뀐다(P9-2)", async () => {
    const { container } = render(
      <ToastProvider>
        <RichTextEditor
          content={{
            type: "doc",
            content: [
              {
                type: "panel",
                attrs: { panelType: "info", icon: "ℹ️" },
                content: [{ type: "paragraph", content: [{ type: "text", text: "안내" }] }],
              },
            ],
          }}
          onChange={vi.fn()}
        />
      </ToastProvider>
    );

    fireEvent.click(await screen.findByLabelText("콜아웃 아이콘 바꾸기"));
    fireEvent.click(await screen.findByLabelText("🔥"));

    await waitFor(() => expect(container.querySelector(".panel-icon")?.textContent).toBe("🔥"));
    // 본문 편집 영역은 아이콘 변경 후에도 그대로 유지된다(NodeView 도입에 따른 회귀 없음).
    expect(screen.getByText("안내")).toBeInTheDocument();
  });
});

describe("RichTextEditor 문서 링크 카드(P10-1)", () => {
  beforeEach(() => {
    push.mockClear();
  });

  function docWithDocumentLink(pageId = "target-doc", title = "연결된 문서") {
    return {
      type: "doc",
      content: [{ type: "documentLink", attrs: { pageId, title } }],
    } as JSONContent;
  }

  it("카드에 고정 아이콘과 캐시된 제목이 표시된다", () => {
    render(
      <ToastProvider>
        <RichTextEditor content={docWithDocumentLink(undefined, "회의록")} onChange={vi.fn()} pageId="doc-1" />
      </ToastProvider>
    );

    expect(screen.getByText("회의록")).toBeInTheDocument();
    expect(screen.getByText("📄")).toBeInTheDocument();
  });

  it("제목이 비어 있으면 '(제목 없음)'으로 표시된다", () => {
    render(
      <ToastProvider>
        <RichTextEditor content={docWithDocumentLink("target-doc", "")} onChange={vi.fn()} pageId="doc-1" />
      </ToastProvider>
    );

    expect(screen.getByText("(제목 없음)")).toBeInTheDocument();
  });

  it("카드를 클릭하면 해당 문서 편집 화면으로 이동한다", () => {
    render(
      <ToastProvider>
        <RichTextEditor content={docWithDocumentLink("target-doc", "연결된 문서")} onChange={vi.fn()} pageId="doc-1" />
      </ToastProvider>
    );

    fireEvent.click(screen.getByText("연결된 문서"));

    expect(push).toHaveBeenCalledWith("/editor/target-doc");
  });
});

describe("RichTextEditor 서식 버블 메뉴(P1-9e)", () => {
  function renderWithText(onChange = vi.fn()) {
    const utils = render(
      <ToastProvider>
        <RichTextEditor
          content={{ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "안녕하세요" }] }] }}
          onChange={onChange}
        />
      </ToastProvider>
    );
    selectText(utils.container, "안녕");
    return utils;
  }

  it("텍스트를 선택하지 않으면 서식 버블 메뉴가 보이지 않는다", () => {
    render(
      <ToastProvider>
        <RichTextEditor
          content={{ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "안녕하세요" }] }] }}
          onChange={vi.fn()}
        />
      </ToastProvider>
    );

    expect(screen.queryByLabelText("굵게")).not.toBeInTheDocument();
  });

  it("텍스트를 선택하면 서식 버블 메뉴가 뜬다", async () => {
    renderWithText();

    await waitFor(() => expect(screen.getByLabelText("굵게")).toBeInTheDocument());
    expect(screen.getByLabelText("기울임")).toBeInTheDocument();
    expect(screen.getByLabelText("취소선")).toBeInTheDocument();
    expect(screen.getByLabelText("밑줄")).toBeInTheDocument();
  });

  it("굵게 버튼을 클릭하면 선택한 텍스트에 굵게 마크가 적용되고 onChange가 호출된다", async () => {
    const onChange = vi.fn();
    const { container } = renderWithText(onChange);

    (await screen.findByLabelText("굵게")).click();

    await waitFor(() => expect(container.querySelector(".ProseMirror strong")).not.toBeNull());
    const lastDoc = onChange.mock.calls.at(-1)?.[0] as JSONContent;
    const marks = lastDoc.content?.[0]?.content?.flatMap((n) => n.marks?.map((m) => m.type) ?? []) ?? [];
    expect(marks).toContain("bold");
  });

  it("기울임 버튼을 클릭하면 선택한 텍스트에 기울임 마크가 적용된다", async () => {
    const { container } = renderWithText();

    (await screen.findByLabelText("기울임")).click();

    await waitFor(() => expect(container.querySelector(".ProseMirror em")).not.toBeNull());
  });

  it("취소선 버튼을 클릭하면 선택한 텍스트에 취소선 마크가 적용된다", async () => {
    const { container } = renderWithText();

    (await screen.findByLabelText("취소선")).click();

    await waitFor(() => expect(container.querySelector(".ProseMirror s")).not.toBeNull());
  });

  // P2-8: underline은 StarterKit 기본값으로 스키마상 이미 켜져 있었지만 버블 메뉴에
  // 진입점이 없었다 — 굵게·기울임·취소선과 같은 인라인 마크 패턴으로 추가한다.
  it("밑줄 버튼을 클릭하면 선택한 텍스트에 밑줄 마크가 적용된다", async () => {
    const { container } = renderWithText();

    (await screen.findByLabelText("밑줄")).click();

    await waitFor(() => expect(container.querySelector(".ProseMirror u")).not.toBeNull());
  });

  // P2-7
  it("코드 버튼을 클릭하면 선택한 텍스트에 인라인 코드 마크가 적용된다", async () => {
    const { container } = renderWithText();

    (await screen.findByLabelText("코드")).click();

    await waitFor(() => expect(container.querySelector(".ProseMirror code")).not.toBeNull());
  });

  it("코드 버튼을 다시 클릭하면 적용된 인라인 코드 마크가 해제된다", async () => {
    const { container } = renderWithText();

    (await screen.findByLabelText("코드")).click();
    await waitFor(() => expect(container.querySelector(".ProseMirror code")).not.toBeNull());

    (await screen.findByLabelText("코드")).click();

    await waitFor(() => expect(container.querySelector(".ProseMirror code")).toBeNull());
  });

  // P2-6
  it("글자 크기 메뉴에서 크기를 고르면 선택한 텍스트에 글자 크기가 적용된다", async () => {
    const { container } = renderWithText();

    fireEvent.click(await screen.findByLabelText("글자 크기"));
    fireEvent.click(await screen.findByText("크게"));

    await waitFor(() =>
      expect(container.querySelector(".ProseMirror [style*='font-size']")).not.toBeNull()
    );
  });

  it("글자 크기 메뉴에서 보통을 고르면 적용된 글자 크기가 해제된다", async () => {
    const { container } = renderWithText();

    fireEvent.click(await screen.findByLabelText("글자 크기"));
    fireEvent.click(await screen.findByText("크게"));
    await waitFor(() =>
      expect(container.querySelector(".ProseMirror [style*='font-size']")).not.toBeNull()
    );

    fireEvent.click(await screen.findByText("보통"));

    await waitFor(() =>
      expect(container.querySelector(".ProseMirror [style*='font-size']")).toBeNull()
    );
  });

  it("글자 색상 팔레트에서 색을 고르면 선택한 텍스트에 색상이 적용된다", async () => {
    const { container } = renderWithText();

    fireEvent.click(await screen.findByLabelText("글자 색상"));
    const swatch = await waitFor(() => {
      const el = container.querySelector('button[style*="background"]');
      if (!el) throw new Error("스와치가 아직 렌더링되지 않았습니다.");
      return el as HTMLElement;
    });
    fireEvent.click(swatch);

    await waitFor(() => expect(container.querySelector(".ProseMirror [style*=color]")).not.toBeNull());
  });

  it("글자 색상 팔레트의 '색상 지우기'를 고르면 적용된 색상이 해제된다", async () => {
    const { container } = renderWithText();

    fireEvent.click(await screen.findByLabelText("글자 색상"));
    const swatch = await waitFor(() => {
      const el = container.querySelector('button[style*="background"]');
      if (!el) throw new Error("스와치가 아직 렌더링되지 않았습니다.");
      return el as HTMLElement;
    });
    fireEvent.click(swatch);
    await waitFor(() => expect(container.querySelector(".ProseMirror [style*=color]")).not.toBeNull());

    fireEvent.click(screen.getByRole("button", { name: "색상 지우기" }));

    await waitFor(() => expect(container.querySelector(".ProseMirror [style*=color]")).toBeNull());
  });

  it("하이라이트 팔레트에서 색을 고르면 선택한 텍스트에 하이라이트가 적용된다", async () => {
    const { container } = renderWithText();

    fireEvent.click(await screen.findByLabelText("하이라이트"));
    // HIGHLIGHT_SWATCHES는 `color-mix(...)` 값을 쓰는데, happy-dom의 CSSOM이 이 함수를
    // 인식하지 못해(소스로 확인) `style` 속성 자체가 렌더링되지 않는다 — TEXT_COLOR_SWATCHES
    // (단순 `var(--color-*)` 값)와 달리 `[style*="background"]` 셀렉터로 못 찾으므로 스와치
    // 이름(aria-label)으로 대신 찾는다.
    fireEvent.click(await screen.findByLabelText("브랜드"));

    await waitFor(() => expect(container.querySelector(".ProseMirror mark")).not.toBeNull());
  });

  it("하이라이트 팔레트의 '색상 지우기'를 고르면 적용된 하이라이트가 해제된다", async () => {
    const { container } = renderWithText();

    fireEvent.click(await screen.findByLabelText("하이라이트"));
    fireEvent.click(await screen.findByLabelText("브랜드"));
    await waitFor(() => expect(container.querySelector(".ProseMirror mark")).not.toBeNull());

    fireEvent.click(screen.getByRole("button", { name: "색상 지우기" }));

    await waitFor(() => expect(container.querySelector(".ProseMirror mark")).toBeNull());
  });

  it("링크 팝오버에서 안전한 URL을 적용하면 링크 마크가 붙는다", async () => {
    const { container } = renderWithText();

    (await screen.findByLabelText("링크")).click();
    const input = await screen.findByLabelText("링크 URL");
    fireEvent.change(input, { target: { value: "https://example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "적용" }));

    await waitFor(() => expect(container.querySelector(".ProseMirror a[href='https://example.com']")).not.toBeNull());
  });

  it("링크 팝오버에서 안전하지 않은 스킴(javascript:)을 적용하면 토스트로 거부되고 링크가 붙지 않는다", async () => {
    const { container } = renderWithText();

    (await screen.findByLabelText("링크")).click();
    const input = await screen.findByLabelText("링크 URL");
    fireEvent.change(input, { target: { value: "javascript:alert(1)" } });
    // happy-dom의 `<input type="url">`은 `javascript:` 스킴 값을 자체 HTML5 제약 검증에서
    // 이미 무효로 판정해, 제출 버튼을 클릭해도(`fireEvent.click`) 브라우저의 "제출 전 검증"
    // 단계에서 막혀 우리 `onSubmit` 핸들러(및 그 안의 `isSafeLinkHref` 검사)까지 아예 도달하지
    // 못한다는 것을 직접 확인했다(실제 브라우저의 WHATWG `type=url` 검증은 이보다 관대해
    // `javascript:` 스킴도 "유효한 URL"로 통과시킨다 — happy-dom 쪽이 더 엄격한 구현). 그래서
    // 이 앱 자신의 방어 로직을 테스트하려는 의도에 맞게, 네이티브 검증을 우회하고 `submit`
    // 이벤트를 폼에 직접 디스패치한다.
    fireEvent.submit(input.closest("form") as HTMLFormElement);

    await waitFor(() =>
      expect(screen.getByText("허용되지 않는 링크 형식입니다. http(s):// 또는 mailto: 링크만 사용할 수 있습니다.")).toBeInTheDocument()
    );
    expect(container.querySelector(".ProseMirror a")).toBeNull();
  });
});

describe("RichTextEditor 이미지 업로드 성공 경로(P1-9e)", () => {
  it("드래그앤드롭 업로드가 끝나면 실제로 이미지 노드가 삽입되고 onChange에 반영된다", async () => {
    vi.spyOn(imageUpload, "uploadImage").mockResolvedValue({
      url: "https://example.com/new.png",
      filename: "new.png",
    });
    const onChange = vi.fn();

    const { container } = render(
      <ToastProvider>
        <RichTextEditor
          content={{ type: "doc", content: [{ type: "paragraph", content: [] }] }}
          onChange={onChange}
          pageId="doc-1"
        />
      </ToastProvider>
    );

    fireDrop(container, makeImageFile());

    await waitFor(() => expect(container.querySelector(".ProseMirror img")).not.toBeNull());
    expect(container.querySelector(".ProseMirror img")).toHaveAttribute("src", "https://example.com/new.png");

    const lastDoc = onChange.mock.calls.at(-1)?.[0] as JSONContent;
    expect(lastDoc.content?.some((n) => n.type === "image")).toBe(true);

  });
});

/**
 * P17-9: 이미지가 업로드되는 동안(드래그앤드롭·붙여넣기·슬래시 메뉴 공통 경로) 아무 표시가
 * 없어 "진행 중인지 알 수 없다"는 지적을 받았다 — 업로드가 끝나기 전에는 그 자리에 스피너
 * 자리표시자가 보이고, 성공하면 실제 이미지로, 실패하면 자리표시자가 사라지고 에러 토스트가
 * 뜨는지 확인한다. 업로드 완료 시점을 직접 제어해야 "중간 상태"를 관찰할 수 있으므로,
 * `uploadImage`를 즉시 resolve/reject하지 않는 수동 Promise로 모킹한다.
 */
describe("RichTextEditor 이미지 업로드 진행 상태 표시(P17-9)", () => {
  it("업로드가 끝나기 전에는 자리표시자가 보이고, 끝나면 실제 이미지로 바뀐다", async () => {
    let resolveUpload!: (value: { url: string; filename: string }) => void;
    vi.spyOn(imageUpload, "uploadImage").mockReturnValue(
      new Promise((resolve) => {
        resolveUpload = resolve;
      })
    );

    const { container } = render(
      <ToastProvider>
        <RichTextEditor
          content={{ type: "doc", content: [{ type: "paragraph", content: [] }] }}
          onChange={vi.fn()}
          pageId="doc-1"
        />
      </ToastProvider>
    );

    fireDrop(container, makeImageFile("photo.png"));

    await waitFor(() => expect(screen.getByText("photo.png 업로드 중…")).toBeInTheDocument());
    expect(container.querySelector(".ProseMirror img")).toBeNull();

    resolveUpload({ url: "https://example.com/new.png", filename: "new.png" });

    await waitFor(() => expect(container.querySelector(".ProseMirror img")).not.toBeNull());
    expect(screen.queryByText("photo.png 업로드 중…")).not.toBeInTheDocument();
  });

  it("업로드가 실패하면 자리표시자가 사라지고 에러 토스트가 뜬다", async () => {
    vi.spyOn(imageUpload, "uploadImage").mockRejectedValue(new Error("업로드 실패!"));

    const { container } = render(
      <ToastProvider>
        <RichTextEditor
          content={{ type: "doc", content: [{ type: "paragraph", content: [] }] }}
          onChange={vi.fn()}
          pageId="doc-1"
        />
      </ToastProvider>
    );

    fireDrop(container, makeImageFile("photo.png"));

    // mockRejectedValue는 이미 거부된 Promise라 다음 마이크로태스크에서 바로 실패
    // 콜백이 실행된다 — "중간에 자리표시자가 보였는지"는 관찰 시점이 불안정해 검증하지
    // 않고, 실패 후 최종 상태(토스트가 뜨고 자리표시자·이미지 둘 다 없음)만 확인한다.
    await waitFor(() => expect(screen.getByText("업로드 실패!")).toBeInTheDocument());
    expect(screen.queryByText("photo.png 업로드 중…")).not.toBeInTheDocument();
    expect(container.querySelector(".ProseMirror img")).toBeNull();
  });
});

/**
 * P2-5: 사용자가 "표 안 텍스트의 색상·폰트 서식을 바꿀 방법이 없다"고 보고해 조사했다.
 * `EditorBubbleMenu`는 `shouldShow`를 오버라이드하지 않아 `@tiptap/extension-bubble-menu`의
 * 기본 구현을 그대로 쓰는데, 그 기본 구현은 표 셀 여부를 전혀 구분하지 않는다(포커스·비어있지
 * 않은 선택·`isEditable`만 검사, 소스로 확인). 표 셀 안 텍스트 선택도 일반 `TextSelection`이라
 * 이 조건을 그대로 통과해, 실제로는 이미 정상 동작함을 이 테스트로 확인했다 — 버그가 아니다.
 * (당시엔 글꼴 종류·글자 크기 자체가 문서 전체 어디에도 없는 별개의 기능 격차였고, Issue #69로
 * 등록했다 — 이후 사용자가 글자 크기는 필요하다고 정정해 P2-6에서 추가했고, 아래 테스트로
 * 표 셀 안에서도 동일하게 동작함을 확인한다. 글꼴 종류는 최종적으로 범위 밖으로 유지됐다.)
 */
describe("RichTextEditor 표 셀 안 서식 버블 메뉴(P2-5)", () => {
  it("표 셀 안 텍스트를 선택해도 서식 버블 메뉴가 뜨고 글자 색상 버튼이 보인다", async () => {
    const { container } = render(
      <ToastProvider>
        <RichTextEditor content={tableFirstDoc()} onChange={vi.fn()} />
      </ToastProvider>
    );

    selectText(container, "r0c0");

    await waitFor(() => expect(screen.queryByLabelText("굵게")).toBeInTheDocument());
    expect(screen.getByLabelText("글자 색상")).toBeInTheDocument();
  });

  it("표 셀 안 텍스트를 선택하면 글자 크기 버튼도 보이고 정상 동작한다(P2-6)", async () => {
    const { container } = render(
      <ToastProvider>
        <RichTextEditor content={tableFirstDoc()} onChange={vi.fn()} />
      </ToastProvider>
    );

    selectText(container, "r0c0");

    fireEvent.click(await screen.findByLabelText("글자 크기"));
    fireEvent.click(await screen.findByText("크게"));

    await waitFor(() =>
      expect(container.querySelector(".ProseMirror [style*='font-size']")).not.toBeNull()
    );
  });

  it("표 셀 안 텍스트를 선택하면 코드 버튼도 보이고 정상 동작한다(P2-7)", async () => {
    const { container } = render(
      <ToastProvider>
        <RichTextEditor content={tableFirstDoc()} onChange={vi.fn()} />
      </ToastProvider>
    );

    selectText(container, "r0c0");

    (await screen.findByLabelText("코드")).click();

    await waitFor(() => expect(container.querySelector(".ProseMirror code")).not.toBeNull());
  });
});
