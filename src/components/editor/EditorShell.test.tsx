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

// EditorShell이 마운트하는 OnboardingModal(P5-2)이 곧바로 `GET /api/editor/account`를
// 호출한다 — 실제 네트워크 요청이 나가지 않도록(테스트 환경에서 느려지거나 실패할 수
// 있음) needsOnboarding: false로 응답해 이 파일의 기존 테스트들이 영향받지 않게 한다.
beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      new Response(
        JSON.stringify({ email: "user@s-food.com", name: "홍길동", team: "IT팀", needsOnboarding: false }),
        { status: 200 }
      )
    )
  );
});

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
});
