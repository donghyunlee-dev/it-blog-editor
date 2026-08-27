import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EditorSidebar, extractPageIdFromPathname } from "./EditorSidebar";
import { UnsavedChangesProvider, useUnsavedChanges } from "./UnsavedChangesContext";
import type { DocumentSummary } from "@/lib/editor/documents";

// P0-1a 가드 테스트만 useRouter()를 실제로 거치는 UnsavedChangesProvider로 감싸므로,
// 여기서만 next/navigation을 모킹한다(usePathname은 라우터 프로바이더 없이도 null을
// 반환할 뿐 던지지 않는 실제 동작을 그대로 쓴다 — 다른 기존 테스트들이 이에 의존한다).
const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/navigation")>();
  return { ...actual, useRouter: () => ({ push }) };
});

// DocumentEditor.test.tsx와 같은 이유로 next/link를 대역으로 바꾼다 — 실제 Link는
// AppRouterContext 없이는 onNavigate 자체를 호출하지 않는다.
vi.mock("next/link", () => ({
  default: ({
    href,
    onClick,
    onNavigate,
    children,
    ...rest
  }: {
    href: string;
    onClick?: (event: React.MouseEvent) => void;
    onNavigate?: (event: { preventDefault: () => void }) => void;
    children?: React.ReactNode;
    [key: string]: unknown;
  }) => (
    <a
      href={href}
      onClick={(event: React.MouseEvent) => {
        onClick?.(event);
        let prevented = false;
        onNavigate?.({
          preventDefault: () => {
            prevented = true;
          },
        });
        if (prevented) {
          event.preventDefault();
        }
      }}
      {...rest}
    >
      {children}
    </a>
  ),
}));

const DOCS: DocumentSummary[] = [
  {
    pageId: "1",
    title: "문서A",
    updatedAt: "2026-08-21T00:00:00.000Z",
    isPublished: true,
    tags: ["React"],
  },
  {
    pageId: "2",
    title: "문서B",
    updatedAt: "2026-08-21T00:00:00.000Z",
    isPublished: false,
    tags: ["Backend"],
  },
];

describe("EditorSidebar", () => {
  beforeEach(() => {
    push.mockClear();
  });

  it("문서 목록과 게시 상태 아이콘을 보여준다", () => {
    render(<EditorSidebar documents={DOCS} />);

    expect(screen.getByText("문서A")).toBeInTheDocument();
    expect(screen.getByText("문서B")).toBeInTheDocument();
    // 게시 상태는 글자 대신 아이콘 + 색으로만 표시한다(2026-08-26, 사용자 요청) —
    // 접근성을 위해 남겨둔 role="img"/aria-label로 확인한다.
    expect(screen.getByRole("img", { name: "게시됨" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "초안" })).toBeInTheDocument();
  });

  it("문서에 붙은 태그를 함께 보여준다", () => {
    render(<EditorSidebar documents={DOCS} />);

    // "React"/"Backend"는 상단 태그 필터 칩(tab)에도, 문서 목록의 Tag 표시에도
    // 나오므로, 문서 목록 영역(aria-label="문서 목록")으로 좁혀서 확인한다.
    const list = screen.getByRole("navigation", { name: "문서 목록" });
    expect(within(list).getByText("React")).toBeInTheDocument();
    expect(within(list).getByText("Backend")).toBeInTheDocument();
  });

  it("태그를 클릭하면 그 태그가 붙은 문서만 보여준다", async () => {
    render(<EditorSidebar documents={DOCS} />);

    // 태그 필터 칩은 문서 목록에도 같은 텍스트("React")가 나오므로,
    // ChipGroup이 렌더링하는 role="tab" 칩으로 좁혀서 클릭한다.
    await userEvent.click(screen.getByRole("tab", { name: "React" }));

    expect(screen.getByText("문서A")).toBeInTheDocument();
    expect(screen.queryByText("문서B")).not.toBeInTheDocument();
  });

  it("같은 태그를 다시 클릭하면 필터가 해제된다", async () => {
    render(<EditorSidebar documents={DOCS} />);

    const reactTab = screen.getByRole("tab", { name: "React" });
    await userEvent.click(reactTab);
    await userEvent.click(reactTab);

    expect(screen.getByText("문서A")).toBeInTheDocument();
    expect(screen.getByText("문서B")).toBeInTheDocument();
  });

  it("문서가 없으면 빈 상태를 보여준다", () => {
    render(<EditorSidebar documents={[]} />);

    expect(screen.getByText("아직 작성한 문서가 없습니다.")).toBeInTheDocument();
  });

  it("새 문서 링크를 제공한다", () => {
    render(<EditorSidebar documents={DOCS} />);

    expect(screen.getByRole("link", { name: "새 문서" })).toHaveAttribute(
      "href",
      "/editor/new"
    );
  });

  it("activePageId와 일치하는 문서 링크에만 aria-current='page'를 붙인다", () => {
    render(<EditorSidebar documents={DOCS} activePageId="1" />);

    const activeLink = screen.getByRole("link", { name: /문서A/ });
    const inactiveLink = screen.getByRole("link", { name: /문서B/ });

    expect(activeLink).toHaveAttribute("aria-current", "page");
    expect(inactiveLink).not.toHaveAttribute("aria-current");
  });

  it("onLogout이 없으면 로그아웃 영역을 렌더링하지 않는다", () => {
    render(<EditorSidebar documents={DOCS} />);

    expect(
      screen.queryByRole("button", { name: "로그아웃" })
    ).not.toBeInTheDocument();
  });

  it("onLogout이 있으면 사용자 이메일과 로그아웃 버튼을 보여준다", () => {
    render(
      <EditorSidebar documents={DOCS} userEmail="pioneer@s-food.com" onLogout={() => {}} />
    );

    expect(screen.getByText("pioneer@s-food.com")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "로그아웃" })).toBeInTheDocument();
  });

  it("검색어가 제목에 포함된 문서를 보여준다", async () => {
    render(<EditorSidebar documents={DOCS} />);

    await userEvent.type(screen.getByPlaceholderText("문서 검색"), "문서A");

    expect(screen.getByText("문서A")).toBeInTheDocument();
    expect(screen.queryByText("문서B")).not.toBeInTheDocument();
  });

  it("검색어가 제목에는 없지만 태그에 포함되면 그 문서를 보여준다(P1-1a)", async () => {
    render(<EditorSidebar documents={DOCS} />);

    await userEvent.type(screen.getByPlaceholderText("문서 검색"), "backend");

    expect(screen.getByText("문서B")).toBeInTheDocument();
    expect(screen.queryByText("문서A")).not.toBeInTheDocument();
  });

  it("태그 필터와 검색어가 함께(AND) 적용된다(P1-1a)", async () => {
    render(<EditorSidebar documents={DOCS} />);

    await userEvent.click(screen.getByRole("tab", { name: "React" }));
    await userEvent.type(screen.getByPlaceholderText("문서 검색"), "문서B");

    // 태그 필터(React)만으로는 문서A가 남고, 검색어(문서B)만으로는 문서B가 남는다 —
    // 둘 다 만족하는 문서가 없으므로 빈 상태여야 한다.
    expect(screen.getByText("조건에 맞는 문서가 없습니다.")).toBeInTheDocument();
  });

  it("편집 중인 문서에 저장하지 않은 변경사항이 있으면 다른 문서 클릭 시 확인을 받는다(P0-1a)", async () => {
    function DirtyButton() {
      const { setDirty } = useUnsavedChanges();
      return (
        <button type="button" onClick={() => setDirty(true)}>
          편집 중으로 표시
        </button>
      );
    }

    render(
      <UnsavedChangesProvider>
        <DirtyButton />
        <EditorSidebar documents={DOCS} />
      </UnsavedChangesProvider>
    );

    await userEvent.click(
      screen.getByRole("button", { name: "편집 중으로 표시" })
    );

    await userEvent.click(screen.getByRole("link", { name: /문서B/ }));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();

    await userEvent.click(
      screen.getByRole("button", { name: "변경사항 버리고 이동" })
    );
    expect(push).toHaveBeenCalledWith("/editor/2");
  });
});

describe("extractPageIdFromPathname", () => {
  it("/editor/{pageId} 경로에서 pageId를 추출한다", () => {
    expect(extractPageIdFromPathname("/editor/abc123")).toBe("abc123");
  });

  it("/editor/{pageId}/publish 경로도 같은 문서의 pageId로 취급한다", () => {
    expect(extractPageIdFromPathname("/editor/abc123/publish")).toBe(
      "abc123"
    );
  });

  it("/editor/new는 문서가 아니므로 pageId로 취급하지 않는다", () => {
    expect(extractPageIdFromPathname("/editor/new")).toBeUndefined();
  });

  it("/editor/new/publish도 pageId로 취급하지 않는다", () => {
    expect(extractPageIdFromPathname("/editor/new/publish")).toBeUndefined();
  });

  it("/editor 목록 화면 자체는 pageId가 없다", () => {
    expect(extractPageIdFromPathname("/editor")).toBeUndefined();
  });

  it("null 경로는 pageId가 없다", () => {
    expect(extractPageIdFromPathname(null)).toBeUndefined();
  });
});
