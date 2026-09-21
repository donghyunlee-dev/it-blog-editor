// createSlashMenuRenderer()가 document.createElement로 실제 메뉴 DOM을 만들기 때문에
// `.test.ts`(기본 node 환경)에는 DOM이 없다. 이 파일 전체를 `.test.tsx`로 바꾸는 대신(내용에
// JSX가 전혀 없음), vitest의 파일별 환경 오버라이드로 이 파일만 happy-dom을 쓰게 한다 —
// createSlashItems 등 나머지 순수 함수 테스트에는 영향 없다.
// @vitest-environment happy-dom

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Editor, Range } from "@tiptap/core";
import type { SuggestionKeyDownProps, SuggestionProps } from "@tiptap/suggestion";
import { createSlashItems, SlashCommandExtension, type CommandItem } from "./SlashCommandExtension";

/**
 * `run(editor, range)`은 `editor.chain().focus()...run()` 형태의 TipTap 커맨드 체인을
 * 호출한다. 실제 Editor 인스턴스 없이 "어떤 메서드가 어떤 인자로, 어떤 순서로 호출됐는지"만
 * 기록하는 가벼운 Proxy 체인을 만든다 — 복붙으로 만들어진 9개 항목(특히 패널 3종) 사이에
 * 값이 잘못 들어가는 실수를 잡아내는 것이 이 테스트의 핵심 목적이다.
 */
function createChainRecorder() {
  const calls: string[] = [];
  const chain = new Proxy(
    {},
    {
      get(_target, prop: string) {
        if (prop === "run")
          return () => {
            calls.push("run()");
            return calls;
          };
        return (...args: unknown[]) => {
          calls.push(args.length > 0 ? `${prop}(${JSON.stringify(args)})` : `${prop}()`);
          return chain;
        };
      },
    }
  );
  const editor = { chain: () => chain } as unknown as Editor;
  return { editor, calls };
}

const RANGE: Range = { from: 1, to: 2 };

describe("createSlashItems", () => {
  it("빈 쿼리면 기본 13개 항목을 전부 반환한다", () => {
    expect(createSlashItems("")).toHaveLength(13);
  });

  it("대소문자를 구분하지 않고 제목에 쿼리가 포함된 항목만 반환한다", () => {
    const result = createSlashItems("패널");
    expect(result.map((item) => item.title)).toEqual(["정보 패널", "경고 패널", "노트 패널"]);
  });

  it("일치하는 항목이 없으면 빈 배열을 반환한다", () => {
    expect(createSlashItems("존재하지않는항목")).toEqual([]);
  });

  it("extraItems를 기본 항목 뒤에 이어붙이고 쿼리 필터링 대상에 포함한다", () => {
    const extra: CommandItem = { title: "이미지", run: vi.fn() };

    expect(createSlashItems("", [extra]).at(-1)).toBe(extra);
    expect(createSlashItems("이미지", [extra])).toEqual([extra]);
  });

  // P17-6: 아이콘을 깜빡 빠뜨린 항목이 있어도 타입 체크만으로는 잡히지 않는다
  // (icon이 optional이라 아예 안 써도 컴파일된다) — 기본 13개 전부가 실제로
  // non-empty 아이콘을 갖는지 런타임에서 확인한다.
  it("기본 13개 항목 전부가 non-empty 아이콘을 갖는다", () => {
    for (const item of createSlashItems("")) {
      expect(item.icon, `"${item.title}" 항목에 아이콘이 없습니다`).toBeTruthy();
    }
  });
});

describe("기본 슬래시 항목의 run 커맨드 체인", () => {
  it.each([
    ["제목 1", ["focus()", 'deleteRange([{"from":1,"to":2}])', 'setNode(["heading",{"level":1}])', "run()"]],
    ["제목 2", ["focus()", 'deleteRange([{"from":1,"to":2}])', 'setNode(["heading",{"level":2}])', "run()"]],
    ["제목 3", ["focus()", 'deleteRange([{"from":1,"to":2}])', 'setNode(["heading",{"level":3}])', "run()"]],
    ["글머리 목록", ["focus()", 'deleteRange([{"from":1,"to":2}])', "toggleBulletList()", "run()"]],
    ["번호 목록", ["focus()", 'deleteRange([{"from":1,"to":2}])', "toggleOrderedList()", "run()"]],
    ["인용구", ["focus()", 'deleteRange([{"from":1,"to":2}])', "toggleBlockquote()", "run()"]],
    ["구분선", ["focus()", 'deleteRange([{"from":1,"to":2}])', "setHorizontalRule()", "run()"]],
    [
      "표",
      [
        "focus()",
        'deleteRange([{"from":1,"to":2}])',
        'insertTable([{"rows":2,"cols":2}])',
        "run()",
      ],
    ],
    ["코드블록", ["focus()", 'deleteRange([{"from":1,"to":2}])', "toggleCodeBlock()", "run()"]],
    ["인라인 코드", ["focus()", 'deleteRange([{"from":1,"to":2}])', "toggleCode()", "run()"]],
  ])("%s", (title, expectedCalls) => {
    const item = createSlashItems("").find((i) => i.title === title);
    expect(item).toBeDefined();

    const { editor, calls } = createChainRecorder();
    item?.run(editor, RANGE);

    expect(calls).toEqual(expectedCalls);
  });

  it.each([
    ["정보 패널", "info", "ℹ️"],
    ["경고 패널", "warning", "⚠️"],
    ["노트 패널", "note", "📝"],
  ])("%s은 panelType: %s, icon: %s로 삽입한다", (title, panelType, icon) => {
    const item = createSlashItems("").find((i) => i.title === title);
    expect(item).toBeDefined();

    const { editor, calls } = createChainRecorder();
    item?.run(editor, RANGE);

    expect(calls).toEqual([
      "focus()",
      'deleteRange([{"from":1,"to":2}])',
      `insertContent([{"type":"panel","attrs":{"panelType":"${panelType}","icon":"${icon}"},"content":[{"type":"paragraph"}]}])`,
      "run()",
    ]);
  });
});

describe("createSlashMenuRenderer(SlashCommandExtension 내부)", () => {
  function makeItems(): CommandItem[] {
    return [
      { title: "항목1", run: vi.fn() },
      { title: "항목2", run: vi.fn() },
    ];
  }

  interface SlashMenuRenderer {
    onStart: (props: SuggestionProps<CommandItem>) => void;
    onUpdate: (props: SuggestionProps<CommandItem>) => void;
    onKeyDown: (props: SuggestionKeyDownProps) => boolean;
    onExit: () => void;
  }

  function makeRenderer(): SlashMenuRenderer {
    // createSlashMenuRenderer는 export되지 않으므로, 실제 사용 경로와 동일하게
    // SlashCommandExtension.options.suggestion.render()를 통해 얻는다.
    const render = SlashCommandExtension.options.suggestion.render as () => SlashMenuRenderer;
    return render();
  }

  function makeMount() {
    const unmount = vi.fn();
    const mount = vi.fn((_el: HTMLElement) => unmount);
    return { mount, unmount };
  }

  function makeProps(items: CommandItem[], mount: (el: HTMLElement) => () => void): SuggestionProps<CommandItem> {
    return {
      items,
      editor: {} as Editor,
      range: RANGE,
      query: "",
      text: "/",
      mount,
    } as unknown as SuggestionProps<CommandItem>;
  }

  let renderer: ReturnType<typeof makeRenderer>;

  beforeEach(() => {
    renderer = makeRenderer();
  });

  it("onStart는 항목을 버튼으로 렌더링하고 props.mount(menuEl)를 호출한다", () => {
    const items = makeItems();
    const { mount } = makeMount();

    renderer.onStart(makeProps(items, mount));

    expect(mount).toHaveBeenCalledTimes(1);
    const menuEl = mount.mock.calls[0][0] as HTMLElement;
    const buttons = Array.from(menuEl.querySelectorAll("button"));
    expect(buttons.map((b) => b.textContent)).toEqual(["항목1", "항목2"]);
  });

  // P17-6: icon이 없는 CommandItem(위 makeItems, 하위 호환 픽스처)은 아이콘 요소
  // 자체가 생기지 않아야 한다 — 위 테스트에서 이미 textContent가 title과 정확히
  // 같음을 확인했지만, "아이콘 span이 아예 없다"는 더 구체적인 사실도 함께 고정한다.
  it("icon이 없으면 아이콘 요소 없이 항목당 자식 1개(텍스트)만 렌더링한다", () => {
    const items = makeItems();
    const { mount } = makeMount();

    renderer.onStart(makeProps(items, mount));

    const menuEl = mount.mock.calls[0][0] as HTMLElement;
    const button = menuEl.querySelectorAll("button")[0];
    expect(button.children).toHaveLength(1);
  });

  // P17-6: icon이 있으면 aria-hidden 아이콘 span이 텍스트 앞에 추가되고, 버튼의
  // 접근성 이름에 해당하는 텍스트(label span)는 title 그대로 유지된다.
  it("icon이 있으면 aria-hidden 아이콘 span과 별도의 텍스트 span을 렌더링한다", () => {
    const items: CommandItem[] = [{ title: "이미지", icon: '<svg data-testid="img-icon"></svg>', run: vi.fn() }];
    const { mount } = makeMount();

    renderer.onStart(makeProps(items, mount));

    const menuEl = mount.mock.calls[0][0] as HTMLElement;
    const button = menuEl.querySelectorAll("button")[0];
    expect(button.children).toHaveLength(2);
    const [iconSpan, labelSpan] = Array.from(button.children);
    expect(iconSpan.getAttribute("aria-hidden")).toBe("true");
    expect(iconSpan.querySelector('[data-testid="img-icon"]')).not.toBeNull();
    expect(labelSpan.textContent).toBe("이미지");
  });

  it("항목이 없으면 '일치하는 항목이 없습니다'를 렌더링한다", () => {
    const { mount } = makeMount();

    renderer.onStart(makeProps([], mount));

    const menuEl = mount.mock.calls[0][0] as HTMLElement;
    expect(menuEl.textContent).toContain("일치하는 항목이 없습니다");
  });

  it("ArrowDown/ArrowUp이 선택 인덱스를 순환시키고 Enter가 선택된 항목의 run을 호출한다", () => {
    const items = makeItems();
    const { mount } = makeMount();
    renderer.onStart(makeProps(items, mount));

    // 초기 선택은 0번(항목1). ArrowDown 두 번이면 항목이 2개뿐이라 다시 0번(항목1)으로
    // 순환한다 — 이 순환 자체를 검증하기 위해 ArrowDown을 한 번만 눌러 1번(항목2)으로 옮긴다.
    renderer.onKeyDown({ event: { key: "ArrowDown" } } as SuggestionKeyDownProps);
    renderer.onKeyDown({ event: { key: "Enter" } } as SuggestionKeyDownProps);

    expect(items[1].run).toHaveBeenCalledTimes(1);
    expect(items[0].run).not.toHaveBeenCalled();
  });

  it("마지막 항목에서 ArrowDown을 누르면 처음 항목으로 순환한다", () => {
    const items = makeItems();
    const { mount } = makeMount();
    renderer.onStart(makeProps(items, mount));

    renderer.onKeyDown({ event: { key: "ArrowDown" } } as SuggestionKeyDownProps);
    renderer.onKeyDown({ event: { key: "ArrowDown" } } as SuggestionKeyDownProps);
    renderer.onKeyDown({ event: { key: "Enter" } } as SuggestionKeyDownProps);

    expect(items[0].run).toHaveBeenCalledTimes(1);
  });

  it("ArrowUp이 처음 항목에서 마지막 항목으로 순환한다", () => {
    const items = makeItems();
    const { mount } = makeMount();
    renderer.onStart(makeProps(items, mount));

    renderer.onKeyDown({ event: { key: "ArrowUp" } } as SuggestionKeyDownProps);
    renderer.onKeyDown({ event: { key: "Enter" } } as SuggestionKeyDownProps);

    expect(items[1].run).toHaveBeenCalledTimes(1);
  });

  it("메뉴 항목을 클릭하면 그 항목의 run이 호출된다", () => {
    const items = makeItems();
    const { mount } = makeMount();
    renderer.onStart(makeProps(items, mount));

    const menuEl = mount.mock.calls[0][0] as HTMLElement;
    const secondButton = menuEl.querySelectorAll("button")[1] as HTMLButtonElement;
    secondButton.click();

    expect(items[1].run).toHaveBeenCalledTimes(1);
  });

  // 표 툴바 버튼(P17-12)과 같은 근본 원인의 회귀 방지 — mousedown의 기본 동작을 막지
  // 않으면 브라우저가 에디터 선택을 바꾸고, 그 selectionchange가 Suggestion 플러그인
  // 상태를 "range 밖" 판정해 onExit(메뉴 DOM 제거)을 mousedown~click 사이에 실행해
  // 버려 클릭 자체가 무시된다("항목을 선택해도 반응이 없다"). jsdom은 이 브라우저
  // 고유의 선택-되돌림 자체는 재현하지 않으므로, 표 툴바 테스트와 동일하게 "버튼의
  // mousedown이 preventDefault를 호출한다"는 핸들러 존재만 고정한다.
  it("메뉴 버튼의 mousedown은 기본 동작을 막아 에디터 선택이 바뀌지 않게 한다", () => {
    const items = makeItems();
    const { mount } = makeMount();
    renderer.onStart(makeProps(items, mount));

    const menuEl = mount.mock.calls[0][0] as HTMLElement;
    const buttons = Array.from(menuEl.querySelectorAll("button"));
    for (const button of buttons) {
      const event = new MouseEvent("mousedown", { bubbles: true, cancelable: true });
      button.dispatchEvent(event);
      expect(event.defaultPrevented).toBe(true);
    }
  });

  it("onExit는 props.mount가 반환한 unmount 콜백을 호출한다", () => {
    const items = makeItems();
    const { mount, unmount } = makeMount();
    renderer.onStart(makeProps(items, mount));

    renderer.onExit();

    expect(unmount).toHaveBeenCalledTimes(1);
  });

  describe("ARIA(P2-1a)", () => {
    function makePropsWithEditorDom(items: CommandItem[], mount: (el: HTMLElement) => () => void) {
      const dom = document.createElement("div");
      const editor = { view: { dom } } as unknown as Editor;
      return {
        props: { items, editor, range: RANGE, query: "", text: "/", mount } as unknown as SuggestionProps<CommandItem>,
        dom,
      };
    }

    it("메뉴 컨테이너는 role=listbox와 aria-label을 갖는다", () => {
      const { mount } = makeMount();
      renderer.onStart(makeProps(makeItems(), mount));

      const menuEl = mount.mock.calls[0][0] as HTMLElement;
      expect(menuEl.getAttribute("role")).toBe("listbox");
      expect(menuEl.getAttribute("aria-label")).toBeTruthy();
    });

    it("각 항목 버튼은 role=option과 선택 상태를 반영하는 aria-selected를 갖는다", () => {
      const { mount } = makeMount();
      renderer.onStart(makeProps(makeItems(), mount));

      const menuEl = mount.mock.calls[0][0] as HTMLElement;
      const buttons = Array.from(menuEl.querySelectorAll("button"));
      expect(buttons.map((b) => b.getAttribute("role"))).toEqual(["option", "option"]);
      expect(buttons.map((b) => b.getAttribute("aria-selected"))).toEqual(["true", "false"]);

      renderer.onKeyDown({ event: { key: "ArrowDown" } } as SuggestionKeyDownProps);

      const buttonsAfter = Array.from(menuEl.querySelectorAll("button"));
      expect(buttonsAfter.map((b) => b.getAttribute("aria-selected"))).toEqual(["false", "true"]);
    });

    it("일치하는 항목이 없으면 빈 상태에 role=status와 aria-live=polite가 있다", () => {
      const { mount } = makeMount();
      renderer.onStart(makeProps([], mount));

      const menuEl = mount.mock.calls[0][0] as HTMLElement;
      const empty = menuEl.firstElementChild as HTMLElement;
      expect(empty.getAttribute("role")).toBe("status");
      expect(empty.getAttribute("aria-live")).toBe("polite");
    });

    it("메뉴가 열려있는 동안 editor.view.dom에 aria-activedescendant가 선택된 option을 가리키고, 닫히면 제거된다", () => {
      const items = makeItems();
      const { mount } = makeMount();
      const { props, dom } = makePropsWithEditorDom(items, mount);

      renderer.onStart(props);
      const menuEl = mount.mock.calls[0][0] as HTMLElement;
      const firstOptionId = menuEl.querySelectorAll("button")[0].id;
      expect(dom.getAttribute("aria-activedescendant")).toBe(firstOptionId);

      renderer.onKeyDown({ event: { key: "ArrowDown" } } as SuggestionKeyDownProps);
      const secondOptionId = menuEl.querySelectorAll("button")[1].id;
      expect(dom.getAttribute("aria-activedescendant")).toBe(secondOptionId);

      renderer.onExit();
      expect(dom.hasAttribute("aria-activedescendant")).toBe(false);
    });

    it("editor.view가 없는 목 객체가 들어와도 에러 없이 동작한다", () => {
      const { mount } = makeMount();

      expect(() => renderer.onStart(makeProps(makeItems(), mount))).not.toThrow();
      expect(() => renderer.onExit()).not.toThrow();
    });
  });
});
