import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ToastProvider } from "@sfood/ui";
import type { JSONContent } from "@tiptap/react";
import { RichTextEditor } from "./RichTextEditor";
import * as imageUpload from "@/lib/editor/image-upload";

/**
 * TipTap(ProseMirror)은 실제 렌더링된 contenteditable에 드래그/붙여넣기 DOM 이벤트를
 * 그대로 받는 구조라, RichTextEditor는 이번 작업 전까지 테스트가 없었다. 이 파일은
 * P0-4b(이미지 개수 상한)만 최소로 검증한다 — 전체 리치 편집 기능 테스트는 범위 밖이다.
 */

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

/**
 * 이미지가 문서의 유일한(첫) 노드면 ProseMirror의 초기 선택(`Selection.atStart`)이 텍스트
 * 위치를 찾지 못해 그 이미지 자체를 선택하는 NodeSelection이 된다(tableFirstDoc과 동일한
 * 이유 — 별도의 클릭 시뮬레이션 없이도 렌더링 직후 이미지가 선택된 상태로 시작한다).
 */
function imageFirstDoc(alt?: string): JSONContent {
  return {
    type: "doc",
    content: [
      { type: "image", attrs: { src: "https://example.com/photo.png", filename: "photo.png", alt: alt ?? null } },
    ],
  };
}

describe("RichTextEditor 이미지 대체 텍스트(alt) 입력(P1-8)", () => {
  it("이미지가 선택되지 않은 상태에서는 alt 입력 UI가 보이지 않는다", () => {
    render(
      <ToastProvider>
        <RichTextEditor
          content={{ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "본문" }] }] }}
          onChange={vi.fn()}
        />
      </ToastProvider>
    );

    expect(screen.queryByLabelText("이미지 대체 텍스트(alt)")).not.toBeInTheDocument();
  });

  it("이미지가 선택되면 alt 입력 UI가 뜨고, 서식 버블 메뉴는 뜨지 않는다", async () => {
    const { container } = render(
      <ToastProvider>
        <RichTextEditor content={imageFirstDoc()} onChange={vi.fn()} />
      </ToastProvider>
    );

    // `@tiptap/extension-bubble-menu`의 기본 shouldShow는 `view.hasFocus()`를 요구한다
    // (실사용에서는 이미지를 클릭하는 행위 자체가 NodeSelection 생성과 에디터 포커스를
    // 동시에 만든다). jsdom은 렌더링만으로 자동 포커스하지 않으므로 명시적으로 포커스한다.
    (container.querySelector(".ProseMirror") as HTMLElement).focus();

    await waitFor(() => expect(screen.getByLabelText("이미지 대체 텍스트(alt)")).toBeInTheDocument());
    expect(screen.queryByLabelText("굵게")).not.toBeInTheDocument();
  });

  it("기존 alt 값이 있으면 입력창 초기값으로 채워진다", async () => {
    const { container } = render(
      <ToastProvider>
        <RichTextEditor content={imageFirstDoc("기존 설명")} onChange={vi.fn()} />
      </ToastProvider>
    );

    (container.querySelector(".ProseMirror") as HTMLElement).focus();

    const input = await screen.findByLabelText("이미지 대체 텍스트(alt)");
    expect(input).toHaveValue("기존 설명");
  });

  it("alt 텍스트를 입력하고 적용하면 이미지 노드 속성과 렌더링된 img alt에 반영된다", async () => {
    const onChange = vi.fn();
    const { container } = render(
      <ToastProvider>
        <RichTextEditor content={imageFirstDoc()} onChange={onChange} />
      </ToastProvider>
    );

    (container.querySelector(".ProseMirror") as HTMLElement).focus();

    const input = await screen.findByLabelText("이미지 대체 텍스트(alt)");
    fireEvent.change(input, { target: { value: "회의실 사진" } });
    fireEvent.click(screen.getByRole("button", { name: "적용" }));

    await waitFor(() => expect(container.querySelector(".ProseMirror img")).toHaveAttribute("alt", "회의실 사진"));

    const lastCall = onChange.mock.calls.at(-1)?.[0] as JSONContent;
    expect(lastCall.content?.[0]?.attrs?.alt).toBe("회의실 사진");
  });
});
