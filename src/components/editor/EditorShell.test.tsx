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
}));

const DOCS: DocumentSummary[] = [
  {
    pageId: "1",
    title: "문서A",
    updatedAt: "2026-08-21T00:00:00.000Z",
    isPublished: true,
    tags: [],
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
