import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider } from "@sfood/ui";
import { EditorSidebar, extractPageIdFromPathname, type EditorSidebarProps } from "./EditorSidebar";
import { UnsavedChangesProvider, useUnsavedChanges } from "./UnsavedChangesContext";
import type { DocumentSummary, SharedDocumentSummary } from "@/lib/editor/documents";
import type { FolderNode } from "@/lib/editor/folders";

// P0-1a 가드 테스트만 useRouter()를 실제로 거치는 UnsavedChangesProvider로 감싸므로,
// 여기서만 next/navigation을 모킹한다(usePathname은 라우터 프로바이더 없이도 null을
// 반환할 뿐 던지지 않는 실제 동작을 그대로 쓴다 — 다른 기존 테스트들이 이에 의존한다).
// useRouter()가 실제 Next.js에서는 항상 같은 객체 참조를 돌려주는 것과 달리, 매번 새
// 객체 리터럴을 반환하면 그 객체를 의존성 배열에 넣는 effect(P7-7, 아래 focusFolderId
// 처리)가 렌더마다 재실행돼 setState → 리렌더 → 재실행으로 이어지는 무한 루프가 생긴다
// (실제로 겪은 문제 — 이 파일의 P7-7 테스트가 타임아웃났다). 그래서 push/replace/refresh를
// 감싸는 router 객체 자체를 한 번만 만들어 매 호출에 같은 참조를 돌려준다.
const { push, replace, refresh, router } = vi.hoisted(() => {
  const push = vi.fn();
  const replace = vi.fn();
  const refresh = vi.fn();
  return { push, replace, refresh, router: { push, replace, refresh } };
});
// P7-7: 편집 화면 브레드크럼에서 폴더를 눌렀을 때(`/editor?folder={id}`) 사이드바가 반응하는지
// 검증하려면 useSearchParams를 테스트에서 직접 제어할 수 있어야 한다 — 실제 usePathname처럼
// 라우터 컨텍스트 없이는 항상 null만 반환해 재현할 방법이 없다. router.replace는 그 폴더에
// 도착한 뒤 쿼리를 지우는 데 쓴다(EditorSidebar.tsx).
const mockSearchParams = vi.hoisted(() => ({ current: new URLSearchParams() }));
vi.mock("next/navigation", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/navigation")>();
  return {
    ...actual,
    useRouter: () => router,
    useSearchParams: () => mockSearchParams.current,
  };
});

beforeEach(() => {
  mockSearchParams.current = new URLSearchParams();
  push.mockClear();
  replace.mockClear();
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

// P14-2: VersionHistory 자체의 로딩/성공/실패 동작은 VersionHistory.test.tsx가 다룬다.
// 여기서는 "이력" 메뉴 항목이 Modal을 열고 올바른 pageId를 넘기는지만 확인하면 되므로
// 가벼운 대역으로 바꿔 끼운다(DocumentEditor.test.tsx가 헤더에 있던 이 버튼을 테스트하던
// 방식과 동일 — 기능이 여기로 옮겨왔다).
vi.mock("./VersionHistory", () => ({
  VersionHistory: ({ pageId }: { pageId: string }) => (
    <div data-testid="version-history" data-page-id={pageId} />
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

  it("onOpenSearch가 없으면 헤더에 검색 버튼을 렌더링하지 않는다", () => {
    render(<EditorSidebar documents={DOCS} />);

    expect(screen.queryByRole("button", { name: "전체 검색 (Ctrl+K)" })).not.toBeInTheDocument();
  });

  it("onOpenSearch가 있으면 헤더 검색 버튼 클릭 시 호출한다(P8-1)", async () => {
    const onOpenSearch = vi.fn();
    const user = userEvent.setup();
    render(<EditorSidebar documents={DOCS} onOpenSearch={onOpenSearch} />);

    await user.click(screen.getByRole("button", { name: "전체 검색 (Ctrl+K)" }));

    expect(onOpenSearch).toHaveBeenCalledTimes(1);
  });

  it("문서 목록 행에는 태그를 표시하지 않는다(2026-09-11, 태그가 많으면 행이 늘어나 밀도가 떨어진다는 피드백으로 제거)", () => {
    render(<EditorSidebar documents={DOCS} />);

    // 문서 목록 행(aria-label="문서 목록") 안에는 태그가 렌더링되지 않는다. 태그 필터
    // 칩(ChipGroup) 자체도 P12-1로 제거되어(태그는 검색으로만 활용) role="tab"이 없다.
    const list = screen.getByRole("navigation", { name: "문서 목록" });
    expect(within(list).queryByText("React")).not.toBeInTheDocument();
    expect(within(list).queryByText("Backend")).not.toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "React" })).not.toBeInTheDocument();
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

  it("문서 검색 입력이 '새 문서' 링크보다 위(앞)에 있다(2026-09-11, 공간 효율화를 위한 레이아웃 재배치)", () => {
    render(<EditorSidebar documents={DOCS} />);

    const searchInput = screen.getByLabelText("문서 제목·태그 검색");
    const newDocLink = screen.getByRole("link", { name: "새 문서" });

    expect(
      searchInput.compareDocumentPosition(newDocLink) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });

  it("'새 문서' 링크가 '폴더' 섹션·문서 목록보다 아래(뒤)에 있다(2026-09-14, P15-1 — 폴더 행의 '+'가 폴더별 생성을 맡고, 이 버튼은 미분류 생성 전용으로 목록 맨 아래로 이동)", () => {
    render(<EditorSidebar documents={DOCS} />);

    const newDocLink = screen.getByRole("link", { name: "새 문서" });
    const folderLabel = screen.getByText("폴더");

    expect(
      folderLabel.compareDocumentPosition(newDocLink) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });

  it("'본문까지 찾으려면 Ctrl+K' 안내 문구는 더 이상 없다(2026-09-11, 화면이 복잡해 보인다는 피드백으로 삭제)", () => {
    render(<EditorSidebar documents={DOCS} />);

    expect(screen.queryByText(/본문까지 찾으려면/)).not.toBeInTheDocument();
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

  it("정렬 아이콘 버튼을 누르면 제목 오름차순으로 정렬된다(P1-1b, 2026-09-11부터 드롭다운 대신 토글 버튼)", async () => {
    render(<EditorSidebar documents={SORT_DOCS} />);

    await userEvent.click(screen.getByRole("button", { name: "정렬: 최신순 (누르면 제목순으로 변경)" }));

    const nav = screen.getByRole("navigation", { name: "문서 목록" });
    const items = within(nav).getAllByRole("listitem");

    expect(items[0]).toHaveTextContent("가나다 문서(오래됨)");
    expect(items[1]).toHaveTextContent("마바사 문서(최근)");
  });

  it("정렬 아이콘 버튼을 다시 누르면 최신순으로 되돌아간다(P1-1b)", async () => {
    render(<EditorSidebar documents={SORT_DOCS} />);

    await userEvent.click(screen.getByRole("button", { name: "정렬: 최신순 (누르면 제목순으로 변경)" }));
    await userEvent.click(screen.getByRole("button", { name: "정렬: 제목순 (누르면 최신순으로 변경)" }));

    const nav = screen.getByRole("navigation", { name: "문서 목록" });
    const items = within(nav).getAllByRole("listitem");

    expect(items[0]).toHaveTextContent("마바사 문서(최근)");
    expect(items[1]).toHaveTextContent("가나다 문서(오래됨)");
  });

  it("문서가 없으면 정렬 버튼을 보여주지 않는다(P1-1b)", () => {
    render(<EditorSidebar documents={[]} />);

    expect(
      screen.queryByRole("button", { name: "정렬: 최신순 (누르면 제목순으로 변경)" })
    ).not.toBeInTheDocument();
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

  it("'삭제된 문서' 링크는 전용 페이지(/editor/trash)로 이동한다(P16-1, 팝업 대신 전용 페이지로 전환)", () => {
    render(<EditorSidebar documents={DOCS} />);

    expect(screen.getByRole("link", { name: "삭제된 문서" })).toHaveAttribute(
      "href",
      "/editor/trash"
    );
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

  it("공유받은 문서는 내 폴더 트리(P7-4)와 무관하게 항상 별도 영역에만 있다(P7-9 — folderId는 소유자 쪽 배정일 뿐, 내 폴더 구조에 편입되지 않는다)", () => {
    const folders: FolderNode[] = [{ id: "f1", name: "업무", parentId: null, order: 0 }];
    const shared: SharedDocumentSummary[] = [
      {
        pageId: "shared-1",
        title: "공유받은 회의록",
        updatedAt: "2026-09-04T00:00:00.000Z",
        isPublished: true,
        tags: [],
        folderId: "f1",
        ownerEmail: "owner@s-food.com",
        ownerName: "홍길동",
      },
    ];
    render(<EditorSidebar documents={DOCS} sharedDocuments={shared} folders={folders} />);

    expect(screen.getByRole("link", { name: /공유받은 회의록/ })).toBeInTheDocument();

    // "업무" 폴더 트리 행 안에는 이 공유 문서가 보이지 않는다 — 있다면 folderId만으로
    // 남의 문서를 내 폴더 구조에 편입시키는 회귀다.
    const folderRow = screen.getByRole("button", { name: "업무" }).closest("li") as HTMLElement;
    expect(within(folderRow).queryByText(/공유받은 회의록/)).not.toBeInTheDocument();
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

  // P15-1: "하위 폴더 추가"·"이름 변경"·"삭제"가 폴더 행에 나란히 있던 독립 버튼에서
  // "폴더 옵션"(...) 트리거를 눌러야 나오는 메뉴 항목(role="menuitem")으로 바뀌었다 —
  // 문서 옵션 메뉴(P14-1)와 같은 이유·같은 패턴이라 이 헬퍼로 두 단계 클릭을 묶는다.
  async function openFolderMenuItem(user: ReturnType<typeof userEvent.setup>, itemName: string) {
    await user.click(screen.getByRole("button", { name: "폴더 옵션" }));
    await user.click(screen.getByRole("menuitem", { name: itemName }));
  }

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

  it("폴더 행의 '+'는 그 폴더로 바로 이동하는 새 문서 링크다(P15-1)", () => {
    renderSidebar();

    expect(screen.getByRole("link", { name: '"업무"에 새 문서' })).toHaveAttribute(
      "href",
      "/editor/new?folder=f1"
    );
  });

  it("폴더 옵션 메뉴의 '하위 폴더 추가'를 누르면 그 폴더를 parentId로 하는 생성 모달이 뜬다(P15-1)", async () => {
    const user = userEvent.setup();
    const fetchMock = stubFetch(() => jsonResponse({ id: "f3", name: "하위", parentId: "f1", order: 0 }, 201));
    renderSidebar();

    await openFolderMenuItem(user, "하위 폴더 추가");
    await user.type(screen.getByRole("textbox", { name: /폴더 이름/ }), "하위");
    await user.click(screen.getByRole("button", { name: "저장" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/editor/folders",
        expect.objectContaining({ body: JSON.stringify({ name: "하위", parentId: "f1" }) })
      );
    });
  });

  it("폴더 옵션 메뉴의 '이름 변경'을 누르면 현재 이름이 채워진 모달이 뜨고, 저장하면 PUT을 호출한다(P15-1)", async () => {
    const user = userEvent.setup();
    const fetchMock = stubFetch(() => jsonResponse({ id: "f1", name: "새이름", parentId: null, order: 0 }));
    renderSidebar();

    await openFolderMenuItem(user, "이름 변경");
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

  it("폴더 옵션 메뉴의 '삭제'를 누르면 바로 삭제되지 않고 확인 모달이 뜬다(P15-1)", async () => {
    const user = userEvent.setup();
    const fetchMock = stubFetch(() => jsonResponse({}));
    renderSidebar();

    await openFolderMenuItem(user, "삭제");

    expect(
      screen.getByText('"업무" 폴더를 삭제하시겠습니까? 안에 있던 하위 폴더와 문서는 삭제되지 않고 상위 위치로 이동합니다.')
    ).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("삭제 확인 모달에서 취소하면 삭제 요청을 보내지 않는다", async () => {
    const user = userEvent.setup();
    const fetchMock = stubFetch(() => jsonResponse({}));
    renderSidebar();

    await openFolderMenuItem(user, "삭제");
    await user.click(screen.getByRole("button", { name: "취소" }));

    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.queryByText(/삭제하시겠습니까/)).not.toBeInTheDocument();
  });

  it("삭제 확인 모달에서 확인하면 DELETE를 호출하고 새로고침한다", async () => {
    const user = userEvent.setup();
    const fetchMock = stubFetch(() => jsonResponse(null, 204));
    renderSidebar();

    await openFolderMenuItem(user, "삭제");
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

    await openFolderMenuItem(user, "삭제");
    await user.click(screen.getByRole("button", { name: "삭제 확인" }));

    expect(await screen.findByText("폴더를 찾을 수 없습니다.")).toBeInTheDocument();
  });
});

describe("EditorSidebar 문서를 폴더로 이동(P7-6)", () => {
  const FOLDERS: FolderNode[] = [
    { id: "f1", name: "업무", parentId: null, order: 0 },
    { id: "f2", name: "하위", parentId: "f1", order: 0 },
  ];
  const DOC_UNCLASSIFIED: DocumentSummary = {
    pageId: "1",
    title: "문서A",
    updatedAt: "2026-08-21T00:00:00.000Z",
    isPublished: true,
    tags: [],
    folderId: null,
  };
  const DOC_IN_FOLDER: DocumentSummary = {
    pageId: "2",
    title: "문서B",
    updatedAt: "2026-08-21T00:00:00.000Z",
    isPublished: false,
    tags: [],
    folderId: "f1",
  };

  function stubFetch(handler: (url: string, init?: RequestInit) => Response | Promise<Response>) {
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => handler(url, init));
    vi.stubGlobal("fetch", fetchMock);
    return fetchMock;
  }

  const jsonResponse = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status });

  // 이동 성공/실패를 Toast로 안내하므로(CLAUDE.md UI 규칙) FolderFormModal.test.tsx와
  // 같은 이유로 ToastProvider가 필요하다.
  function renderSidebar(documents: DocumentSummary[], folders: FolderNode[] = FOLDERS) {
    return render(
      <ToastProvider>
        <EditorSidebar documents={documents} folders={folders} />
      </ToastProvider>
    );
  }

  // 다른 describe 블록(P7-4)의 테스트가 남긴 폴더 펼침/접힘 상태가 같은 jsdom window의
  // localStorage에 남아 이 블록의 폴더(f1)가 접힌 채로 시작할 수 있다 — 매번 지워
  // "기본값(전부 펼침)"을 보장한다.
  beforeEach(() => {
    vi.unstubAllGlobals();
    refresh.mockClear();
    window.localStorage.clear();
  });

  // P14-1: "다른 폴더로 이동"은 더 이상 독립 버튼이 아니라 "문서 옵션"(⋯) 트리거를 눌러야
  // 나오는 메뉴 항목(role="menuitem")이다 — 이 헬퍼로 두 단계 클릭을 한 번에 묶는다.
  async function openMoveMenuItem(user: ReturnType<typeof userEvent.setup>) {
    await user.click(screen.getByRole("button", { name: "문서 옵션" }));
    await user.click(screen.getByRole("menuitem", { name: "다른 폴더로 이동" }));
  }

  it("폴더가 있는 계정의 문서 행에는 '문서 옵션'(⋯) 트리거가 보인다", () => {
    renderSidebar([DOC_UNCLASSIFIED]);

    expect(screen.getByRole("button", { name: "문서 옵션" })).toBeInTheDocument();
  });

  // P14-2: 옵션 메뉴에 "이력"·"삭제"가 추가되면서, 폴더가 하나도 없어도(옮길 곳이 없어도)
  // 메뉴 자체는 항상 보인다 — "다른 폴더로 이동" 항목만 빠진다(같은 검증은 "EditorSidebar
  // 문서 옵션 메뉴 — 이력·삭제(P14-2)" describe 블록에 있다).
  it("폴더가 하나도 없는 계정에서도 옵션 트리거는 보인다(이력·삭제는 항상 유효)", () => {
    renderSidebar([DOC_UNCLASSIFIED], []);

    expect(screen.getByRole("button", { name: "문서 옵션" })).toBeInTheDocument();
  });

  it("옵션 메뉴에서 '다른 폴더로 이동'을 누르면 대상 폴더를 고르는 모달이 뜨고, 하위 폴더는 들여쓴 이름으로 보인다", async () => {
    const user = userEvent.setup();
    renderSidebar([DOC_UNCLASSIFIED]);

    await openMoveMenuItem(user);

    expect(screen.getByText('"문서A" 이동')).toBeInTheDocument();
    const dialog = screen.getByRole("dialog");
    const select = within(dialog).getByRole("combobox");
    expect(within(select).getByText("미분류")).toBeInTheDocument();
    expect(within(select).getByText("업무")).toBeInTheDocument();
    // 하위 폴더의 표시용 들여쓰기(전각 공백 "　")는 testing-library의 기본 텍스트
    // 정규화(공백 trim/collapse)에 걸려 사라지므로, 정규화를 끄고 원문 그대로 비교한다.
    expect(
      within(select).getByText("　하위", { normalizer: (text) => text })
    ).toBeInTheDocument();
  });

  it("폴더를 골라 저장하면 PUT /api/editor/documents/{pageId}/folder를 folderId와 함께 호출한다", async () => {
    const user = userEvent.setup();
    const fetchMock = stubFetch(() => new Response(null, { status: 204 }));
    renderSidebar([DOC_UNCLASSIFIED]);

    await openMoveMenuItem(user);
    const select = within(screen.getByRole("dialog")).getByRole("combobox");
    await user.selectOptions(select, "f1");
    await user.click(screen.getByRole("button", { name: "이동" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/editor/documents/1/folder",
        expect.objectContaining({
          method: "PUT",
          body: JSON.stringify({ folderId: "f1" }),
        })
      );
    });
    expect(await screen.findByText("문서를 이동했습니다.")).toBeInTheDocument();
    expect(refresh).toHaveBeenCalled();
  });

  it("이미 폴더에 속한 문서를 '미분류'로 되돌리면 folderId: null로 호출한다", async () => {
    const user = userEvent.setup();
    const fetchMock = stubFetch(() => new Response(null, { status: 204 }));
    renderSidebar([DOC_IN_FOLDER]);

    await openMoveMenuItem(user);
    const select = within(screen.getByRole("dialog")).getByRole("combobox");
    await user.selectOptions(select, "");
    await user.click(screen.getByRole("button", { name: "이동" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/editor/documents/2/folder",
        expect.objectContaining({
          method: "PUT",
          body: JSON.stringify({ folderId: null }),
        })
      );
    });
  });

  it("이동에 실패하면 오류 Toast를 보여준다", async () => {
    const user = userEvent.setup();
    stubFetch(() => jsonResponse({ error: { message: "개인 폴더가 없습니다." } }, 404));
    renderSidebar([DOC_UNCLASSIFIED]);

    await openMoveMenuItem(user);
    await user.click(screen.getByRole("button", { name: "이동" }));

    expect(await screen.findByText("개인 폴더가 없습니다.")).toBeInTheDocument();
  });
});

describe("EditorSidebar 문서 옵션 메뉴 — 이력·삭제(P14-2)", () => {
  const DOC: DocumentSummary = {
    pageId: "doc-1",
    title: "문서A",
    updatedAt: "2026-08-21T00:00:00.000Z",
    isPublished: true,
    tags: [],
    folderId: null,
  };

  function stubFetch(handler: (url: string, init?: RequestInit) => Response | Promise<Response>) {
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => handler(url, init));
    vi.stubGlobal("fetch", fetchMock);
    return fetchMock;
  }

  function renderSidebar(props?: Partial<EditorSidebarProps>) {
    return render(
      <ToastProvider>
        <EditorSidebar documents={[DOC]} folders={[]} {...props} />
      </ToastProvider>
    );
  }

  beforeEach(() => {
    vi.unstubAllGlobals();
    push.mockClear();
    refresh.mockClear();
  });

  async function openOptionsMenu(user: ReturnType<typeof userEvent.setup>) {
    await user.click(screen.getByRole("button", { name: "문서 옵션" }));
  }

  it("폴더가 하나도 없어도 옵션 메뉴에는 '이력'·'삭제'가 보인다(이동만 빠진다)", async () => {
    const user = userEvent.setup();
    renderSidebar();

    await openOptionsMenu(user);

    expect(screen.getByRole("menuitem", { name: "이력" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "삭제" })).toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: "다른 폴더로 이동" })).not.toBeInTheDocument();
  });

  it("'이력'을 누르면 버전 이력 모달이 열리고 올바른 pageId를 넘긴다", async () => {
    const user = userEvent.setup();
    renderSidebar();

    await openOptionsMenu(user);
    await user.click(screen.getByRole("menuitem", { name: "이력" }));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByTestId("version-history")).toHaveAttribute("data-page-id", "doc-1");
  });

  it("'삭제'를 누르면 확인 모달이 뜨고, 확인해야 실제 삭제 요청을 보낸다", async () => {
    const user = userEvent.setup();
    const fetchMock = stubFetch(() => new Response(null, { status: 204 }));
    renderSidebar();

    await openOptionsMenu(user);
    await user.click(screen.getByRole("menuitem", { name: "삭제" }));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "삭제 확인" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/editor/documents/doc-1", {
        method: "DELETE",
      });
    });
    expect(await screen.findByText("문서를 삭제했습니다.")).toBeInTheDocument();
    expect(refresh).toHaveBeenCalled();
  });

  it("삭제 확인 모달에서 취소하면 삭제 요청을 보내지 않는다", async () => {
    const user = userEvent.setup();
    const fetchMock = stubFetch(() => new Response(null, { status: 204 }));
    renderSidebar();

    await openOptionsMenu(user);
    await user.click(screen.getByRole("menuitem", { name: "삭제" }));
    await user.click(screen.getByRole("button", { name: "취소" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("지금 보고 있는 문서를 삭제하면 /editor로 이동한다", async () => {
    const user = userEvent.setup();
    stubFetch(() => new Response(null, { status: 204 }));
    renderSidebar({ activePageId: "doc-1" });

    await openOptionsMenu(user);
    await user.click(screen.getByRole("menuitem", { name: "삭제" }));
    await user.click(screen.getByRole("button", { name: "삭제 확인" }));

    await waitFor(() => {
      expect(push).toHaveBeenCalledWith("/editor");
    });
  });

  it("다른 문서를 삭제할 때는 지금 문서함 화면을 벗어나지 않는다", async () => {
    const user = userEvent.setup();
    stubFetch(() => new Response(null, { status: 204 }));
    renderSidebar({ activePageId: "other-doc" });

    await openOptionsMenu(user);
    await user.click(screen.getByRole("menuitem", { name: "삭제" }));
    await user.click(screen.getByRole("button", { name: "삭제 확인" }));

    await waitFor(() => {
      expect(refresh).toHaveBeenCalled();
    });
    expect(push).not.toHaveBeenCalled();
  });

  it("삭제에 실패하면 오류 Toast를 보여준다", async () => {
    const user = userEvent.setup();
    stubFetch(() =>
      new Response(
        JSON.stringify({ error: { message: "문서를 찾을 수 없습니다." } }),
        { status: 404 }
      )
    );
    renderSidebar();

    await openOptionsMenu(user);
    await user.click(screen.getByRole("menuitem", { name: "삭제" }));
    await user.click(screen.getByRole("button", { name: "삭제 확인" }));

    expect(await screen.findByText("문서를 찾을 수 없습니다.")).toBeInTheDocument();
  });
});

describe("EditorSidebar 브레드크럼에서 도착한 폴더로 스크롤·강조(P7-7)", () => {
  const FOLDERS: FolderNode[] = [
    { id: "f1", name: "업무", parentId: null, order: 0 },
    { id: "f2", name: "하위", parentId: "f1", order: 0 },
  ];

  beforeEach(() => {
    window.localStorage.clear();
  });

  it("접혀 있던 조상 폴더까지 다시 펼치고, router.replace로 쿼리를 지운다", async () => {
    // 둘 다 접힌 상태로 시작한다 — 그래야 "도착 처리가 실제로 펼쳤다"를 검증할 수 있다
    // (기본값 자체가 이미 전부 펼침이라, 접어두지 않으면 이 효과가 없어도 통과해버린다).
    window.localStorage.setItem(
      "sfood-editor-folder-tree-expanded",
      JSON.stringify({ f1: false, f2: false })
    );
    mockSearchParams.current = new URLSearchParams("folder=f2");

    render(<EditorSidebar documents={DOCS} folders={FOLDERS} />);

    // f2(하위)는 f1(업무)의 자식이라, 둘 다 펼쳐져 있어야 f2 행이 실제로 보인다.
    expect(await screen.findByRole("button", { name: "하위" })).toBeInTheDocument();
    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith("/editor");
    });
    expect(push).not.toHaveBeenCalled();
  });

  it("트리에 없는 폴더 id(오래된 링크)는 조용히 무시하고 쿼리도 그대로 둔다", () => {
    mockSearchParams.current = new URLSearchParams("folder=ghost");

    render(<EditorSidebar documents={DOCS} folders={FOLDERS} />);

    // 대상 자체를 못 찾으면 일찍 반환하므로, 도착 처리(router.replace로 쿼리 제거)도
    // 일어나지 않는다 — 렌더 자체는 평소(기본값 전부 펼침)와 다름없이 성공한다.
    expect(screen.getByRole("button", { name: "업무" })).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it("folder 쿼리가 없으면 기존과 동일하게 기본값(전부 펼침)으로 시작한다", () => {
    render(<EditorSidebar documents={DOCS} folders={FOLDERS} />);

    expect(screen.getByRole("button", { name: "업무" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "하위" })).toBeInTheDocument();
  });
});

describe("EditorSidebar 빈 폴더 안내(P7-8)", () => {
  const FOLDERS: FolderNode[] = [
    { id: "empty", name: "빈 폴더", parentId: null, order: 0 },
    { id: "parent", name: "상위", parentId: null, order: 1 },
    { id: "child", name: "하위", parentId: "parent", order: 0 },
    { id: "has-docs", name: "문서 있음", parentId: null, order: 2 },
  ];
  const DOCS: DocumentSummary[] = [
    {
      pageId: "1",
      title: "회의록",
      updatedAt: "2026-08-21T00:00:00.000Z",
      isPublished: true,
      tags: ["React"],
      folderId: "has-docs",
    },
    {
      pageId: "2",
      title: "하위 문서",
      updatedAt: "2026-08-21T00:00:00.000Z",
      isPublished: false,
      tags: [],
      folderId: "child",
    },
  ];

  beforeEach(() => {
    window.localStorage.clear();
  });

  it("하위 폴더도 문서도 없는 폴더는 '이 폴더에는 아직 문서가 없습니다'를 보여준다", () => {
    render(<EditorSidebar documents={DOCS} folders={FOLDERS} />);

    const emptyFolderRow = screen.getByRole("button", { name: "빈 폴더" }).closest("li") as HTMLElement;
    expect(within(emptyFolderRow).getByText("이 폴더에는 아직 문서가 없습니다.")).toBeInTheDocument();
  });

  it("직속 문서는 없어도 하위 폴더가 있으면 빈 폴더 안내를 보여주지 않는다", () => {
    render(<EditorSidebar documents={DOCS} folders={FOLDERS} />);

    const parentRow = screen.getByRole("button", { name: "상위" }).closest("li") as HTMLElement;
    expect(within(parentRow).queryByText("이 폴더에는 아직 문서가 없습니다.")).not.toBeInTheDocument();
  });

  it("문서가 있는 폴더는 빈 폴더 안내를 보여주지 않는다", () => {
    render(<EditorSidebar documents={DOCS} folders={FOLDERS} />);

    const hasDocsRow = screen.getByRole("button", { name: "문서 있음" }).closest("li") as HTMLElement;
    expect(within(hasDocsRow).queryByText("이 폴더에는 아직 문서가 없습니다.")).not.toBeInTheDocument();
  });

  it("검색어로 폴더의 문서만 가려져도, 실제로 문서가 있는 폴더는 빈 폴더 안내를 보여주지 않는다", async () => {
    const user = userEvent.setup();
    render(<EditorSidebar documents={DOCS} folders={FOLDERS} />);

    // "하위 문서"는 검색어와 일치해 전체 목록이 비지 않는다(트리 자체는 계속 그려짐).
    // "문서 있음" 폴더의 "회의록"은 이 검색어와 무관해 걸러지지만, 그 폴더가 실제로는
    // 문서를 갖고 있다는 사실은 변하지 않으므로 잘못된 빈 폴더 안내를 보여주면 안 된다.
    await user.type(screen.getByPlaceholderText("문서 검색"), "하위 문서");

    const hasDocsRow = screen.getByRole("button", { name: "문서 있음" }).closest("li") as HTMLElement;
    expect(within(hasDocsRow).queryByText("이 폴더에는 아직 문서가 없습니다.")).not.toBeInTheDocument();
  });

  it("접힌 빈 폴더는 안내를 보여주지 않고, 펼치면 보여준다", async () => {
    const user = userEvent.setup();
    render(<EditorSidebar documents={DOCS} folders={FOLDERS} />);

    const toggle = screen.getByRole("button", { name: "빈 폴더" });
    await user.click(toggle);

    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("이 폴더에는 아직 문서가 없습니다.")).not.toBeInTheDocument();

    await user.click(toggle);

    expect(screen.getByText("이 폴더에는 아직 문서가 없습니다.")).toBeInTheDocument();
  });
});

describe("EditorSidebar 폴더 트리 키보드 탐색·WAI-ARIA(P7-10)", () => {
  // f1(업무) > f2(하위) > 하위 문서, f1 > 업무 문서, f3(개인, 비어 있음) — 순서대로.
  const FOLDERS: FolderNode[] = [
    { id: "f1", name: "업무", parentId: null, order: 0 },
    { id: "f2", name: "하위", parentId: "f1", order: 0 },
    { id: "f3", name: "개인", parentId: null, order: 1 },
  ];
  const DOCS: DocumentSummary[] = [
    { pageId: "d1", title: "업무 문서", updatedAt: "2026-08-21T00:00:00.000Z", isPublished: true, tags: [], folderId: "f1" },
    { pageId: "d2", title: "하위 문서", updatedAt: "2026-08-21T00:00:00.000Z", isPublished: false, tags: [], folderId: "f2" },
  ];

  beforeEach(() => {
    window.localStorage.clear();
  });

  it("트리 컨테이너·폴더·문서에 WAI-ARIA tree/treeitem/group 역할과 aria-level이 붙는다", () => {
    render(<EditorSidebar documents={DOCS} folders={FOLDERS} />);

    const tree = screen.getByRole("tree", { name: "폴더" });
    expect(tree).toBeInTheDocument();

    const f1Item = screen.getByRole("button", { name: "업무" }).closest('[role="treeitem"]');
    expect(f1Item).toHaveAttribute("aria-level", "1");
    expect(f1Item).toHaveAttribute("aria-expanded", "true");

    const f2Item = screen.getByRole("button", { name: "하위" }).closest('[role="treeitem"]');
    expect(f2Item).toHaveAttribute("aria-level", "2");

    const d2Item = screen.getByRole("link", { name: /하위 문서/ }).closest('[role="treeitem"]');
    expect(d2Item).toHaveAttribute("aria-level", "3");
  });

  it("ArrowDown/ArrowUp은 지금 보이는 트리 순서대로 초점을 옮긴다", async () => {
    const user = userEvent.setup();
    render(<EditorSidebar documents={DOCS} folders={FOLDERS} />);

    const f1Toggle = screen.getByRole("button", { name: "업무" });
    f1Toggle.focus();

    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("button", { name: "하위" })).toHaveFocus();

    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("link", { name: /하위 문서/ })).toHaveFocus();

    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("link", { name: /업무 문서/ })).toHaveFocus();

    await user.keyboard("{ArrowUp}");
    expect(screen.getByRole("link", { name: /하위 문서/ })).toHaveFocus();
  });

  it("접힌 폴더에서 ArrowRight를 누르면 초점은 그대로 두고 펼친다", async () => {
    const user = userEvent.setup();
    render(<EditorSidebar documents={DOCS} folders={FOLDERS} />);

    const f1Toggle = screen.getByRole("button", { name: "업무" });
    await user.click(f1Toggle); // 접는다
    expect(f1Toggle).toHaveAttribute("aria-expanded", "false");

    f1Toggle.focus();
    await user.keyboard("{ArrowRight}");

    expect(f1Toggle).toHaveAttribute("aria-expanded", "true");
    expect(f1Toggle).toHaveFocus();
  });

  it("펼쳐진 폴더에서 ArrowRight를 누르면 첫 자식으로 초점이 옮겨간다", async () => {
    const user = userEvent.setup();
    render(<EditorSidebar documents={DOCS} folders={FOLDERS} />);

    const f1Toggle = screen.getByRole("button", { name: "업무" });
    f1Toggle.focus();
    await user.keyboard("{ArrowRight}");

    expect(screen.getByRole("button", { name: "하위" })).toHaveFocus();
  });

  it("펼쳐진 폴더에서 ArrowLeft를 누르면 초점은 그대로 두고 접는다", async () => {
    const user = userEvent.setup();
    render(<EditorSidebar documents={DOCS} folders={FOLDERS} />);

    const f1Toggle = screen.getByRole("button", { name: "업무" });
    f1Toggle.focus();
    await user.keyboard("{ArrowLeft}");

    expect(f1Toggle).toHaveAttribute("aria-expanded", "false");
    expect(f1Toggle).toHaveFocus();
  });

  it("접힌 폴더(하위 폴더)에서 ArrowLeft를 누르면 상위 폴더로 초점이 옮겨간다", async () => {
    const user = userEvent.setup();
    render(<EditorSidebar documents={DOCS} folders={FOLDERS} />);

    const f2Toggle = screen.getByRole("button", { name: "하위" });
    await user.click(f2Toggle); // 접는다(자식이 없으므로 ArrowLeft가 곧장 부모로 가야 함)
    f2Toggle.focus();
    await user.keyboard("{ArrowLeft}");

    expect(screen.getByRole("button", { name: "업무" })).toHaveFocus();
  });

  it("문서 행에서 ArrowLeft를 누르면 그 문서가 속한 폴더로 초점이 옮겨간다", async () => {
    const user = userEvent.setup();
    render(<EditorSidebar documents={DOCS} folders={FOLDERS} />);

    const doc = screen.getByRole("link", { name: /업무 문서/ });
    doc.focus();
    await user.keyboard("{ArrowLeft}");

    expect(screen.getByRole("button", { name: "업무" })).toHaveFocus();
  });

  it("Home/End는 트리에서 보이는 첫/마지막 노드로 초점을 옮긴다", async () => {
    const user = userEvent.setup();
    render(<EditorSidebar documents={DOCS} folders={FOLDERS} />);

    const middleDoc = screen.getByRole("link", { name: /하위 문서/ });
    middleDoc.focus();

    await user.keyboard("{Home}");
    expect(screen.getByRole("button", { name: "업무" })).toHaveFocus();

    await user.keyboard("{End}");
    expect(screen.getByRole("button", { name: "개인" })).toHaveFocus();
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
