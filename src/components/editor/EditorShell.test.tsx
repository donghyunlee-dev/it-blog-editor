import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
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
