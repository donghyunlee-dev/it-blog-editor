import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EditorShell } from "./EditorShell";
import type { DocumentSummary } from "@/lib/editor/documents";

// EditorShell이 UnsavedChangesProvider(P0-1a)를 통해 useRouter()를 호출하게 됐다 — 실제
// next/navigation의 useRouter는 AppRouterContext 없이는 던지므로 여기서 모킹한다.
// usePathname은 EditorSidebar가 활성 문서 강조 표시에 쓰는데, 라우터 프로바이더 없이도
// null을 반환할 뿐 던지지 않는 실제 동작 그대로 유지한다(이 테스트들은 활성 표시를
// 검증하지 않는다).
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => null,
  useSearchParams: () => null,
}));

const DOCS: DocumentSummary[] = [
  {
    pageId: "1",
    title: "문서A",
    updatedAt: "2026-08-21T00:00:00.000Z",
    isPublished: true,
    tags: [],
    folderId: null,
  },
];

function mockMatchMedia(matches: boolean) {
  vi.spyOn(window, "matchMedia").mockReturnValue({
    matches,
    media: "",
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  } as unknown as MediaQueryList);
}

describe("EditorShell", () => {
  it("사이드바와 children을 함께 렌더링한다", () => {
    mockMatchMedia(false);

    render(
      <EditorShell documents={DOCS}>
        <p>본문 영역</p>
      </EditorShell>
    );

    expect(screen.getByText("문서A")).toBeInTheDocument();
    expect(screen.getByText("본문 영역")).toBeInTheDocument();
  });

  it("모바일 뷰포트에서는 토글 버튼을 눌러야 배경 오버레이가 열린다", async () => {
    mockMatchMedia(true);

    render(
      <EditorShell documents={DOCS}>
        <p>본문 영역</p>
      </EditorShell>
    );

    expect(
      document.querySelector('[aria-hidden="true"].fixed.inset-0')
    ).not.toBeInTheDocument();

    await userEvent.click(
      screen.getByRole("button", { name: "문서 목록 열기" })
    );

    expect(
      document.querySelector('[aria-hidden="true"].fixed.inset-0')
    ).toBeInTheDocument();
  });

  it("데스크톱 뷰포트에서는 토글 버튼 없이도 사이드바가 화면 밖으로 밀리지 않는다", () => {
    mockMatchMedia(false);

    render(
      <EditorShell documents={DOCS}>
        <p>본문 영역</p>
      </EditorShell>
    );

    const sidebarWrapper = screen.getByText("문서A").closest("aside")
      ?.parentElement as HTMLElement;
    expect(sidebarWrapper.style.transform).toBe("");
  });

  describe("모바일 오프캔버스 드로어 포커스 트랩(P2-1c)", () => {
    // 컴포넌트가 실제로 쓰는 것과 같은 선택자·필터(hidden 클래스 제외)로 "지금 이 순간 실제
    // 드로어 안에서 포커스 가능한 요소"를 계산한다 — 어떤 요소가 첫/마지막인지 테스트에
    // 하드코딩하는 대신, 구현이 계산하는 것과 같은 방식으로 다시 계산해 실제 동작(순환이
    // 맞물리는지)만 검증한다.
    const FOCUSABLE_SELECTOR =
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

    function getDrawer(): HTMLElement {
      const aside = screen.getByText("문서A").closest("aside") as HTMLElement;
      return aside.parentElement!.parentElement as HTMLElement;
    }

    function getDrawerFocusables(): HTMLElement[] {
      return Array.from(getDrawer().querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
        (el) => !el.classList.contains("hidden")
      );
    }

    it("모바일에서 드로어를 열면 포커스가 드로어 안 첫 요소로 이동한다", async () => {
      mockMatchMedia(true);
      const user = userEvent.setup();
      render(
        <EditorShell documents={DOCS}>
          <p>본문 영역</p>
        </EditorShell>
      );

      await user.click(screen.getByRole("button", { name: "문서 목록 열기" }));

      expect(getDrawerFocusables()[0]).toHaveFocus();
    });

    it("Tab을 마지막 요소에서 누르면 첫 요소로, Shift+Tab을 첫 요소에서 누르면 마지막 요소로 순환한다", async () => {
      mockMatchMedia(true);
      const user = userEvent.setup();
      render(
        <EditorShell documents={DOCS}>
          <p>본문 영역</p>
        </EditorShell>
      );
      await user.click(screen.getByRole("button", { name: "문서 목록 열기" }));

      const focusables = getDrawerFocusables();
      const first = focusables[0];
      const last = focusables[focusables.length - 1];

      last.focus();
      await user.tab();
      expect(first).toHaveFocus();

      first.focus();
      await user.tab({ shift: true });
      expect(last).toHaveFocus();
    });

    it("Escape를 누르면 드로어가 닫힌다", async () => {
      mockMatchMedia(true);
      const user = userEvent.setup();
      render(
        <EditorShell documents={DOCS}>
          <p>본문 영역</p>
        </EditorShell>
      );
      await user.click(screen.getByRole("button", { name: "문서 목록 열기" }));

      await user.keyboard("{Escape}");

      expect(
        document.querySelector('[aria-hidden="true"].fixed.inset-0')
      ).not.toBeInTheDocument();
    });

    it("드로어가 닫히면 열기 전 포커스(햄버거 버튼)로 되돌아간다", async () => {
      mockMatchMedia(true);
      const user = userEvent.setup();
      render(
        <EditorShell documents={DOCS}>
          <p>본문 영역</p>
        </EditorShell>
      );

      const toggleButton = screen.getByRole("button", { name: "문서 목록 열기" });
      toggleButton.focus();
      await user.click(toggleButton);

      await user.keyboard("{Escape}");

      expect(toggleButton).toHaveFocus();
    });

    it("데스크톱에서는 드로어를 열어도 포커스 트랩이 개입하지 않는다", async () => {
      mockMatchMedia(false);
      const user = userEvent.setup();
      render(
        <EditorShell documents={DOCS}>
          <p>본문 영역</p>
        </EditorShell>
      );

      // 데스크톱에서 토글 버튼은 CSS(`md:hidden`)로만 화면에서 숨겨질 뿐 DOM에는 남아있어
      // 클릭 자체는 여전히 가능하다 — 여기서는 그 버튼을 눌러 open 상태를 만들어도(desktop
      // 이라 실제로는 아무도 이렇게 하지 않지만) isMobile 게이트 때문에 트랩이 개입하지
      // 않음을 확인한다.
      const toggleButton = screen.getByRole("button", { name: "문서 목록 열기" });
      await user.click(toggleButton);

      expect(getDrawerFocusables()[0]).not.toHaveFocus();
    });
  });

  describe("폴더 트리와 모바일 오프캔버스 드로어(P7-10)", () => {
    // P2-1c의 포커스 트랩(Tab 순환·Escape 닫기)이 폴더 트리가 추가한 새 상호작용
    // 요소(토글·하위 폴더 추가/이름변경/삭제·이동 버튼)와 함께 있어도 그대로 동작하는지,
    // 트리 방향키 탐색(P7-10 본체)이 드로어 밖으로 초점을 놓치지 않는지 확인한다.
    const FOLDERS = [
      { id: "f1", name: "업무", parentId: null, order: 0 },
      { id: "f2", name: "하위", parentId: "f1", order: 0 },
    ];
    const DOCS_WITH_FOLDER: DocumentSummary[] = [
      { pageId: "1", title: "업무 문서", updatedAt: "2026-08-21T00:00:00.000Z", isPublished: true, tags: [], folderId: "f1" },
    ];

    const FOCUSABLE_SELECTOR =
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

    function getDrawer(): HTMLElement {
      const aside = screen.getByRole("button", { name: "업무" }).closest("aside") as HTMLElement;
      return aside.parentElement!.parentElement as HTMLElement;
    }

    function getDrawerFocusables(): HTMLElement[] {
      return Array.from(getDrawer().querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
        (el) => !el.classList.contains("hidden")
      );
    }

    // 폴더 펼침/접힘 상태가 localStorage에 저장되고 happy-dom은 테스트 파일 전체가 같은
    // window를 공유한다 — EditorSidebar.test.tsx의 P7-4 describe 블록과 같은 이유로 매번
    // 지워 "기본값(전부 펼침)"에서 시작하게 한다.
    beforeEach(() => {
      window.localStorage.clear();
    });

    it("폴더 트리가 있어도 드로어를 열면 포커스가 드로어 안 첫 요소로 이동하고, Tab 순환이 폴더 행까지 포함한다", async () => {
      mockMatchMedia(true);
      const user = userEvent.setup();
      render(
        <EditorShell documents={DOCS_WITH_FOLDER} folders={FOLDERS}>
          <p>본문 영역</p>
        </EditorShell>
      );

      await user.click(screen.getByRole("button", { name: "문서 목록 열기" }));

      expect(getDrawerFocusables()[0]).toHaveFocus();

      const focusables = getDrawerFocusables();
      const last = focusables[focusables.length - 1];
      last.focus();
      await user.tab();
      expect(focusables[0]).toHaveFocus();
    });

    it("모바일 드로어가 열려 있어도 폴더 트리 방향키 탐색이 정상 동작한다", async () => {
      mockMatchMedia(true);
      const user = userEvent.setup();
      render(
        <EditorShell documents={DOCS_WITH_FOLDER} folders={FOLDERS}>
          <p>본문 영역</p>
        </EditorShell>
      );
      await user.click(screen.getByRole("button", { name: "문서 목록 열기" }));

      const f1Toggle = screen.getByRole("button", { name: "업무" });
      f1Toggle.focus();
      await user.keyboard("{ArrowDown}");

      // P2-1c의 Tab/Escape 트랩이 방향키까지 가로채면 초점이 그대로 f1Toggle에 남는다 —
      // 실제로 하위 폴더로 옮겨갔다는 것이 트랩과 방향키 탐색이 충돌하지 않는다는 증거다.
      expect(screen.getByRole("button", { name: "하위" })).toHaveFocus();
    });
  });

  describe("검색 트리거 버튼(P8-1)", () => {
    it("모바일 상단 바의 검색 버튼을 누르면 GlobalSearchModal이 열린다", async () => {
      mockMatchMedia(true);
      const user = userEvent.setup();
      render(
        <EditorShell documents={DOCS}>
          <p>본문 영역</p>
        </EditorShell>
      );

      // 모바일 상단 바(hamburger 버튼과 같은 컨테이너)와 사이드바 헤더 행 둘 다에 같은
      // 이름의 검색 버튼이 있어(둘 다 CSS로만 반응형 전환, DOM에는 항상 둘 다 존재) 상단
      // 바 쪽으로 좁혀서 클릭한다.
      const topBar = screen.getByRole("button", { name: "문서 목록 열기" }).parentElement as HTMLElement;
      expect(screen.queryByLabelText("문서 전체 검색")).not.toBeInTheDocument();
      await user.click(within(topBar).getByRole("button", { name: "전체 검색 (Ctrl+K)" }));

      expect(screen.getByLabelText("문서 전체 검색")).toBeInTheDocument();
    });

    it("데스크톱 사이드바 헤더의 검색 버튼을 누르면 GlobalSearchModal이 열린다", async () => {
      mockMatchMedia(false);
      const user = userEvent.setup();
      render(
        <EditorShell documents={DOCS}>
          <p>본문 영역</p>
        </EditorShell>
      );

      // 모바일 상단 바(항상 DOM에 존재, md:hidden으로만 숨김)에도 같은 이름의 버튼이 있어
      // 사이드바 쪽(문서 목록 aside 안)으로 좁혀서 클릭한다.
      const sidebar = screen.getByText("문서A").closest("aside") as HTMLElement;
      await user.click(within(sidebar).getByRole("button", { name: "전체 검색 (Ctrl+K)" }));

      expect(screen.getByLabelText("문서 전체 검색")).toBeInTheDocument();
    });
  });

  describe("폭 조절 핸들 키보드 조작(P2-1b)", () => {
    // 폭은 localStorage(WIDTH_STORAGE_KEY)에 저장되고 happy-dom은 테스트 파일 전체가 같은
    // window를 공유한다 — 마지막 저장 검증 테스트 하나를 빼면 각 테스트가 "기본 256px에서
    // 시작"을 전제하므로, 매번 지워 서로 영향을 주지 않게 한다.
    beforeEach(() => {
      window.localStorage.clear();
    });

    function getHandle() {
      return screen.getByRole("separator", { name: "문서함 폭 조절" });
    }

    it("초기 aria-valuenow/min/max가 기본 폭·범위를 반영한다", () => {
      mockMatchMedia(false);
      render(
        <EditorShell documents={DOCS}>
          <p>본문 영역</p>
        </EditorShell>
      );

      const handle = getHandle();
      expect(handle).toHaveAttribute("tabIndex", "0");
      expect(handle).toHaveAttribute("aria-valuenow", "256");
      expect(handle).toHaveAttribute("aria-valuemin", "220");
      expect(handle).toHaveAttribute("aria-valuemax", "440");
    });

    it("ArrowRight/ArrowLeft로 aria-valuenow가 16px씩 늘고 준다", async () => {
      mockMatchMedia(false);
      const user = userEvent.setup();
      render(
        <EditorShell documents={DOCS}>
          <p>본문 영역</p>
        </EditorShell>
      );

      const handle = getHandle();
      handle.focus();

      await user.keyboard("{ArrowRight}");
      expect(handle).toHaveAttribute("aria-valuenow", "272");

      await user.keyboard("{ArrowLeft}{ArrowLeft}");
      expect(handle).toHaveAttribute("aria-valuenow", "240");
    });

    it("Home/End로 최소/최대 폭까지 즉시 이동하고 범위를 벗어나지 않는다", async () => {
      mockMatchMedia(false);
      const user = userEvent.setup();
      render(
        <EditorShell documents={DOCS}>
          <p>본문 영역</p>
        </EditorShell>
      );

      const handle = getHandle();
      handle.focus();

      await user.keyboard("{Home}");
      expect(handle).toHaveAttribute("aria-valuenow", "220");

      await user.keyboard("{End}");
      expect(handle).toHaveAttribute("aria-valuenow", "440");

      // End 이후 ArrowRight를 더 눌러도 MAX_WIDTH(440)를 넘지 않는다.
      await user.keyboard("{ArrowRight}");
      expect(handle).toHaveAttribute("aria-valuenow", "440");
    });

    it("키보드로 바뀐 폭은 localStorage에 저장돼 다음 마운트에도 유지된다", async () => {
      mockMatchMedia(false);
      const user = userEvent.setup();
      const { unmount } = render(
        <EditorShell documents={DOCS}>
          <p>본문 영역</p>
        </EditorShell>
      );

      getHandle().focus();
      await user.keyboard("{ArrowRight}");
      unmount();

      render(
        <EditorShell documents={DOCS}>
          <p>본문 영역</p>
        </EditorShell>
      );

      expect(getHandle()).toHaveAttribute("aria-valuenow", "272");
    });
  });
});
