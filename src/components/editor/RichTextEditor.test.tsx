import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ToastProvider } from "@sfood/ui";
import type { JSONContent } from "@tiptap/react";
import { RichTextEditor } from "./RichTextEditor";
import * as imageUpload from "@/lib/editor/image-upload";

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

/** N개의 이미지 노드를 담은 TipTap doc을 만든다. */
function docWithImages(count: number): JSONContent {
  return {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: Array.from({ length: count }, (_, i) => ({
          type: "image",
          attrs: { src: `https://example.com/${i}.png`, filename: `${i}.png` },
        })),
      },
    ],
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

describe("RichTextEditor 코드블록 문법 강조(P1-7c)", () => {
  /**
   * language 속성을 지정하지 않아도 lowlight가 내용을 보고 자동으로 언어를 추정해
   * 강조한다(CodeBlockLowlight의 실제 동작, node_modules 확인) — 그래서 language 없이도
   * 최소 하나의 hljs-* 토큰 span이 나오는지만 확인한다. 정확히 어떤 토큰으로 분류되는지
   * (예: "const"가 keyword로 분류되는지)는 lowlight/highlight.js 내부 언어 추정 로직에
   * 달려 있어 이 프로젝트가 검증할 대상이 아니다 — "강조 자체가 동작하는가"만 확인한다.
   */
  it("코드블록 안의 코드에 문법 강조 토큰(hljs-*)이 붙는다", () => {
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

    const codeEl = container.querySelector("pre code");
    expect(codeEl).toBeInTheDocument();
    expect(codeEl?.querySelector('[class^="hljs-"]')).not.toBeNull();
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
