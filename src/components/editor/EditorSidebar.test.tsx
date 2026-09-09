import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider } from "@sfood/ui";
import { EditorSidebar, extractPageIdFromPathname } from "./EditorSidebar";
import { UnsavedChangesProvider, useUnsavedChanges } from "./UnsavedChangesContext";
import type { DocumentSummary, SharedDocumentSummary } from "@/lib/editor/documents";
import type { FolderNode } from "@/lib/editor/folders";

// P0-1a 가드 테스트만 useRouter()를 실제로 거치는 UnsavedChangesProvider로 감싸므로,
// 여기서만 next/navigation을 모킹한다(usePathname은 라우터 프로바이더 없이도 null을
// 반환할 뿐 던지지 않는 실제 동작을 그대로 쓴다 — 다른 기존 테스트들이 이에 의존한다).
const { push, refresh } = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn() }));
vi.mock("next/navigation", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/navigation")>();
  return { ...actual, useRouter: () => ({ push, refresh }) };
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
    folderId: null,
  },
  {
    pageId: "2",
    title: "문서B",
    updatedAt: "2026-08-21T00:00:00.000Z",
    isPublished: false,
    tags: ["Backend"],
    folderId: null,
  },
];

/** 페이지네이션 테스트 전용 — 한 페이지 크기(30)를 넘기기 위한 문서 35개. */
const MANY_DOCS: DocumentSummary[] = Array.from({ length: 35 }, (_, i) => ({
  pageId: `many-${i}`,
  title: `문서${String(i).padStart(3, "0")}`,
  updatedAt: "2026-08-21T00:00:00.000Z",
  isPublished: false,
  tags: ["공통"],
  folderId: null,
}));

/** 정렬 테스트 전용 — 제목 순서(가나다)와 최신 수정 순서가 서로 반대가 되도록 만든다. */
const SORT_DOCS: DocumentSummary[] = [
  {
    pageId: "old",
    title: "가나다 문서(오래됨)",
    updatedAt: "2020-01-01T00:00:00.000Z",
    isPublished: false,
    tags: [],
    folderId: null,
  },
  {
    pageId: "new",
    title: "마바사 문서(최근)",
    updatedAt: "2026-01-01T00:00:00.000Z",
    isPublished: false,
    tags: [],
    folderId: null,
  },
];

describe("EditorSidebar", () => {
  beforeEach(() => {
    push.mockClear();
    refresh.mockClear();
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

  it("userName이 있으면 '이름(이메일)' 형식으로 표시한다(P5-5)", () => {
    render(
      <EditorSidebar
        documents={DOCS}
        userEmail="pioneer@s-food.com"
        userName="홍길동"
        onLogout={() => {}}
      />
    );

    expect(screen.getByText("홍길동(pioneer@s-food.com)")).toBeInTheDocument();
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

  it("기본값(최신순)은 최근 수정한 문서가 위에 온다(P1-1b)", () => {
    render(<EditorSidebar documents={SORT_DOCS} />);

    const nav = screen.getByRole("navigation", { name: "문서 목록" });
    const items = within(nav).getAllByRole("listitem");

    expect(items[0]).toHaveTextContent("마바사 문서(최근)");
    expect(items[1]).toHaveTextContent("가나다 문서(오래됨)");
  });

  it("제목순으로 바꾸면 제목 오름차순으로 정렬된다(P1-1b)", async () => {
    render(<EditorSidebar documents={SORT_DOCS} />);

    await userEvent.selectOptions(screen.getByLabelText("문서 정렬"), "title");

    const nav = screen.getByRole("navigation", { name: "문서 목록" });
    const items = within(nav).getAllByRole("listitem");

    expect(items[0]).toHaveTextContent("가나다 문서(오래됨)");
    expect(items[1]).toHaveTextContent("마바사 문서(최근)");
  });

  it("문서가 없으면 정렬 드롭다운을 보여주지 않는다(P1-1b)", () => {
    render(<EditorSidebar documents={[]} />);

    expect(screen.queryByLabelText("문서 정렬")).not.toBeInTheDocument();
  });

  it("결과가 30개 이하면 더 보기 버튼이 없다(P1-1c)", () => {
    render(<EditorSidebar documents={DOCS} />);

    expect(screen.queryByRole("button", { name: "더 보기" })).not.toBeInTheDocument();
  });

  it("31개 이상이면 처음 30개만 보이고 더 보기 버튼이 나타난다(P1-1c)", () => {
    render(<EditorSidebar documents={MANY_DOCS} />);

    const nav = screen.getByRole("navigation", { name: "문서 목록" });
    expect(within(nav).getAllByRole("listitem")).toHaveLength(30);
    expect(screen.getByRole("button", { name: "더 보기" })).toBeInTheDocument();
  });

  it("더 보기를 누르면 나머지 문서가 모두 보이고 버튼이 사라진다(P1-1c)", async () => {
    render(<EditorSidebar documents={MANY_DOCS} />);

    await userEvent.click(screen.getByRole("button", { name: "더 보기" }));

    const nav = screen.getByRole("navigation", { name: "문서 목록" });
    expect(within(nav).getAllByRole("listitem")).toHaveLength(35);
    expect(screen.queryByRole("button", { name: "더 보기" })).not.toBeInTheDocument();
  });

  it("검색어를 바꾸면 표시 개수가 처음(30개)으로 리셋된다(P1-1c)", async () => {
    render(<EditorSidebar documents={MANY_DOCS} />);

    await userEvent.click(screen.getByRole("button", { name: "더 보기" }));
    // 태그(공통)로 검색해도 35개 모두 여전히 매치되지만, 검색어가 바뀌었으니
    // 표시 개수는 다시 30개부터 시작해야 한다.
    await userEvent.type(screen.getByPlaceholderText("문서 검색"), "공통");

    const nav = screen.getByRole("navigation", { name: "문서 목록" });
    expect(within(nav).getAllByRole("listitem")).toHaveLength(30);
    expect(screen.getByRole("button", { name: "더 보기" })).toBeInTheDocument();
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

  it("'삭제된 문서' 버튼을 누르면 목록 Modal이 열린다(P1-2b)", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ documents: [] }), { status: 200 })
    );
    vi.stubGlobal("fetch", fetchMock);

    render(<EditorSidebar documents={DOCS} />);

    await userEvent.click(screen.getByRole("button", { name: "삭제된 문서" }));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith("/api/editor/documents/deleted");
    expect(await screen.findByText("삭제된 문서가 없습니다.")).toBeInTheDocument();

    vi.unstubAllGlobals();
  });

  it("사이드바 메뉴에는 '계정 관리' 진입점이 없다(P5-7, 화면은 유지하되 메뉴 연결은 끊음 — 사용자 피드백)", () => {
    render(<EditorSidebar documents={DOCS} />);

    expect(screen.queryByRole("link", { name: "계정 관리" })).not.toBeInTheDocument();
  });

  it("공유받은 문서가 없으면 '공유받은 문서' 영역을 렌더링하지 않는다(P6-5)", () => {
    render(<EditorSidebar documents={DOCS} sharedDocuments={[]} />);

    expect(screen.queryByText("공유받은 문서")).not.toBeInTheDocument();
  });

  it("공유받은 문서가 있으면 '내 문서'와 분리된 영역에 공유자와 함께 보여준다(P6-5)", async () => {
    const shared: SharedDocumentSummary[] = [
      {
        pageId: "shared-1",
        title: "공유받은 회의록",
        updatedAt: "2026-09-04T00:00:00.000Z",
        isPublished: true,
        tags: [],
        folderId: null,
        ownerEmail: "owner@s-food.com",
        ownerName: "홍길동",
      },
    ];
    render(<EditorSidebar documents={DOCS} sharedDocuments={shared} />);

    expect(screen.getByText("공유받은 문서")).toBeInTheDocument();
    const link = screen.getByRole("link", { name: /공유받은 회의록/ });
    expect(link).toHaveAttribute("href", "/editor/shared-1");
    expect(within(link).getByText("홍길동(owner@s-food.com)")).toBeInTheDocument();
  });
});

describe("EditorSidebar 폴더 트리(P7-4)", () => {
  const FOLDERS: FolderNode[] = [
    { id: "f1", name: "업무", parentId: null, order: 0 },
    { id: "f2", name: "하위 폴더", parentId: "f1", order: 0 },
  ];

  const DOCS_WITH_FOLDERS: DocumentSummary[] = [
    { pageId: "1", title: "업무 문서", updatedAt: "2026-08-21T00:00:00.000Z", isPublished: true, tags: [], folderId: "f1" },
    { pageId: "2", title: "미분류 문서", updatedAt: "2026-08-21T00:00:00.000Z", isPublished: false, tags: [], folderId: null },
    { pageId: "3", title: "하위 문서", updatedAt: "2026-08-21T00:00:00.000Z", isPublished: false, tags: [], folderId: "f2" },
  ];

  // 펼침/접힘 상태가 localStorage(FOLDER_EXPANDED_STORAGE_KEY)에 저장되고 happy-dom은
  // 테스트 파일 전체가 같은 window를 공유한다 — EditorShell.test.tsx의 폭 조절 테스트와
  // 같은 이유로 각 테스트가 "기본값(전부 펼침)에서 시작"을 전제하므로 매번 지운다.
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("폴더가 없으면 '미분류' 레이블이 보이지 않는다(회귀 확인)", () => {
    render(<EditorSidebar documents={DOCS} />);

    expect(screen.queryByText("미분류")).not.toBeInTheDocument();
  });

  it("폴더가 있으면 트리로 보이고, 미분류 문서는 '미분류' 레이블 아래 별도로 보인다", () => {
    render(<EditorSidebar documents={DOCS_WITH_FOLDERS} folders={FOLDERS} />);

    expect(screen.getByText("업무")).toBeInTheDocument();
    expect(screen.getByText("하위 폴더")).toBeInTheDocument();
    expect(screen.getByText("미분류")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /업무 문서/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /하위 문서/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /미분류 문서/ })).toBeInTheDocument();
  });

  it("폴더를 접으면 그 안 문서(및 하위 폴더)가 숨고, 다시 펼치면 보인다", async () => {
    const user = userEvent.setup();
    render(<EditorSidebar documents={DOCS_WITH_FOLDERS} folders={FOLDERS} />);

    const toggle = screen.getByRole("button", { name: "업무" });
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("하위 폴더")).toBeInTheDocument();

    await user.click(toggle);

    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("link", { name: /업무 문서/ })).not.toBeInTheDocument();
    expect(screen.queryByText("하위 폴더")).not.toBeInTheDocument();

    await user.click(toggle);

    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("link", { name: /업무 문서/ })).toBeInTheDocument();
  });

  it("하위 폴더는 상위 폴더보다 더 들여쓰기된다", () => {
    render(<EditorSidebar documents={DOCS_WITH_FOLDERS} folders={FOLDERS} />);

    // P7-5부터 들여쓰기는 토글 버튼이 아니라 그 버튼을 감싸는 행(div, 액션 버튼과 나란히
    // 두기 위한 래퍼)에 적용된다.
    const topRow = screen.getByRole("button", { name: "업무" }).parentElement as HTMLElement;
    const childRow = screen.getByRole("button", { name: "하위 폴더" }).parentElement as HTMLElement;

    const topPadding = parseInt(topRow.style.paddingLeft, 10);
    const childPadding = parseInt(childRow.style.paddingLeft, 10);

    expect(childPadding).toBeGreaterThan(topPadding);
  });

  it("접힘 상태는 localStorage에 저장되어 다음 마운트에도 유지된다", async () => {
    const user = userEvent.setup();
    const { unmount } = render(
      <EditorSidebar documents={DOCS_WITH_FOLDERS} folders={FOLDERS} />
    );

    await user.click(screen.getByRole("button", { name: "업무" }));
    unmount();

    render(<EditorSidebar documents={DOCS_WITH_FOLDERS} folders={FOLDERS} />);

    expect(screen.getByRole("button", { name: "업무" })).toHaveAttribute("aria-expanded", "false");
  });
});

describe("EditorSidebar 폴더 생성·이름변경·삭제(P7-5)", () => {
  const FOLDERS: FolderNode[] = [{ id: "f1", name: "업무", parentId: null, order: 0 }];

  function stubFetch(handler: (url: string, init?: RequestInit) => Response | Promise<Response>) {
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => handler(url, init));
    vi.stubGlobal("fetch", fetchMock);
    return fetchMock;
  }

  const jsonResponse = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status });

  // 폴더 저장/삭제 성공·실패를 Toast로 안내하므로(CLAUDE.md UI 규칙), 실제 Toast UI가
  // 뜨려면 ToastProvider가 필요하다(useToast()는 Provider가 없어도 던지지 않고 조용히
  // no-op하는 기본값을 갖고 있어, Provider 없이는 토스트 문구 자체를 검증할 수 없다).
  function renderSidebar() {
    return render(
      <ToastProvider>
        <EditorSidebar documents={DOCS} folders={FOLDERS} />
      </ToastProvider>
    );
  }

  beforeEach(() => {
    vi.unstubAllGlobals();
    refresh.mockClear();
  });

  it("'새 폴더 만들기' 버튼을 누르면 생성 모달이 뜬다(최상위, parentId: null)", async () => {
    const user = userEvent.setup();
    const fetchMock = stubFetch(() => jsonResponse({ id: "f2", name: "새 폴더", parentId: null, order: 1 }, 201));
    renderSidebar();

    await user.click(screen.getByRole("button", { name: "새 폴더 만들기" }));
    expect(screen.getByText("새 폴더")).toBeInTheDocument();

    await user.type(screen.getByRole("textbox", { name: /폴더 이름/ }), "새 폴더");
    await user.click(screen.getByRole("button", { name: "저장" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/editor/folders",
        expect.objectContaining({ body: JSON.stringify({ name: "새 폴더", parentId: null }) })
      );
    });
    expect(refresh).toHaveBeenCalled();
  });

  it("폴더 행의 '하위 폴더 추가' 버튼을 누르면 그 폴더를 parentId로 하는 생성 모달이 뜬다", async () => {
    const user = userEvent.setup();
    const fetchMock = stubFetch(() => jsonResponse({ id: "f3", name: "하위", parentId: "f1", order: 0 }, 201));
    renderSidebar();

    await user.click(screen.getByRole("button", { name: "하위 폴더 추가" }));
    await user.type(screen.getByRole("textbox", { name: /폴더 이름/ }), "하위");
    await user.click(screen.getByRole("button", { name: "저장" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/editor/folders",
        expect.objectContaining({ body: JSON.stringify({ name: "하위", parentId: "f1" }) })
      );
    });
  });

  it("폴더 행의 '이름 변경' 버튼을 누르면 현재 이름이 채워진 모달이 뜨고, 저장하면 PUT을 호출한다", async () => {
    const user = userEvent.setup();
    const fetchMock = stubFetch(() => jsonResponse({ id: "f1", name: "새이름", parentId: null, order: 0 }));
    renderSidebar();

    await user.click(screen.getByRole("button", { name: "폴더 이름 변경" }));
    const input = screen.getByRole("textbox", { name: /폴더 이름/ });
    expect(input).toHaveValue("업무");
    await user.clear(input);
    await user.type(input, "새이름");
    await user.click(screen.getByRole("button", { name: "저장" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/editor/folders/f1",
        expect.objectContaining({ method: "PUT", body: JSON.stringify({ name: "새이름" }) })
      );
    });
  });

  it("'삭제' 버튼을 누르면 바로 삭제되지 않고 확인 모달이 뜬다", async () => {
    const user = userEvent.setup();
    const fetchMock = stubFetch(() => jsonResponse({}));
    renderSidebar();

    await user.click(screen.getByRole("button", { name: "폴더 삭제" }));

    expect(
      screen.getByText('"업무" 폴더를 삭제하시겠습니까? 안에 있던 하위 폴더와 문서는 삭제되지 않고 상위 위치로 이동합니다.')
    ).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("삭제 확인 모달에서 취소하면 삭제 요청을 보내지 않는다", async () => {
    const user = userEvent.setup();
    const fetchMock = stubFetch(() => jsonResponse({}));
    renderSidebar();

    await user.click(screen.getByRole("button", { name: "폴더 삭제" }));
    await user.click(screen.getByRole("button", { name: "취소" }));

    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.queryByText(/삭제하시겠습니까/)).not.toBeInTheDocument();
  });

  it("삭제 확인 모달에서 확인하면 DELETE를 호출하고 새로고침한다", async () => {
    const user = userEvent.setup();
    const fetchMock = stubFetch(() => jsonResponse(null, 204));
    renderSidebar();

    await user.click(screen.getByRole("button", { name: "폴더 삭제" }));
    await user.click(screen.getByRole("button", { name: "삭제 확인" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/editor/folders/f1", expect.objectContaining({ method: "DELETE" }));
    });
    expect(refresh).toHaveBeenCalled();
  });

  it("삭제에 실패하면 오류 Toast를 보여준다", async () => {
    const user = userEvent.setup();
    stubFetch(() => jsonResponse({ error: { message: "폴더를 찾을 수 없습니다." } }, 404));
    renderSidebar();

    await user.click(screen.getByRole("button", { name: "폴더 삭제" }));
    await user.click(screen.getByRole("button", { name: "삭제 확인" }));

    expect(await screen.findByText("폴더를 찾을 수 없습니다.")).toBeInTheDocument();
  });
});

describe("extractPageIdFromPathname", () => {
  it("/editor/{pageId} 경로에서 pageId를 추출한다", () => {
    expect(extractPageIdFromPathname("/editor/abc123")).toBe("abc123");
  });

  it("/editor/{pageId}/publish처럼 더 깊은 경로는 pageId로 취급하지 않는다(P2-2, 실제로 존재하지 않는 라우트)", () => {
    expect(extractPageIdFromPathname("/editor/abc123/publish")).toBeUndefined();
  });

  it("/editor/new는 문서가 아니므로 pageId로 취급하지 않는다", () => {
    expect(extractPageIdFromPathname("/editor/new")).toBeUndefined();
  });

  it("/editor 목록 화면 자체는 pageId가 없다", () => {
    expect(extractPageIdFromPathname("/editor")).toBeUndefined();
  });

  it("null 경로는 pageId가 없다", () => {
    expect(extractPageIdFromPathname(null)).toBeUndefined();
  });
});
