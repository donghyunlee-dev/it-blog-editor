import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DocumentEditor } from "./DocumentEditor";

// layout.tsx(사이드바)는 Next.js 레이아웃 특성상 클라이언트 네비게이션에서 다시
// 실행되지 않으므로, DocumentEditor의 저장/삭제 성공 경로가 router.refresh()를
// 호출해 사이드바 데이터를 다시 불러오도록 요청하는지 검증한다. next/navigation의
// useRouter는 AppRouterContext 없이 호출하면 던지므로 여기서 직접 모킹한다.
const { push, refresh } = vi.hoisted(() => ({
  push: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh }),
}));

beforeEach(() => {
  push.mockClear();
  refresh.mockClear();
  vi.restoreAllMocks();
});

describe("DocumentEditor", () => {
  it("새 문서 생성 성공 시 사이드바를 새로고침하고 새 문서로 이동한다", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(JSON.stringify({ pageId: "new-1", version: 1 }), {
            status: 200,
          })
      )
    );

    render(<DocumentEditor mode="create" />);

    await userEvent.type(screen.getByLabelText("제목"), "새 문서 제목");
    await userEvent.type(screen.getByLabelText("본문 (Markdown)"), "본문");
    await userEvent.click(screen.getByRole("button", { name: "저장" }));

    expect(refresh).toHaveBeenCalled();
    expect(push).toHaveBeenCalledWith("/editor/new-1");
  });

  it("기존 문서 수정 성공 시 사이드바를 새로고침한다(페이지 이동은 하지 않는다)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () => new Response(JSON.stringify({ version: 2 }), { status: 200 })
      )
    );

    render(
      <DocumentEditor
        mode="edit"
        pageId="page-1"
        initialTitle="기존 제목"
        initialMarkdown="기존 본문"
        initialVersion={1}
      />
    );

    await userEvent.click(screen.getByRole("button", { name: "저장" }));

    expect(refresh).toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
  });

  it("삭제 성공 시 사이드바를 새로고침하고 문서 탐색기로 이동한다", async () => {
    // happy-dom은 jsdom과 달리 window.confirm을 기본 제공하지 않아 vi.spyOn 대상이
    // 없으므로, 함수 자체를 직접 채워 넣는다.
    window.confirm = vi.fn().mockReturnValue(true);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(null, { status: 204 }))
    );

    render(
      <DocumentEditor
        mode="edit"
        pageId="page-1"
        initialTitle="기존 제목"
        initialMarkdown="기존 본문"
        initialVersion={1}
      />
    );

    await userEvent.click(screen.getByRole("button", { name: "삭제" }));

    expect(refresh).toHaveBeenCalled();
    expect(push).toHaveBeenCalledWith("/editor");
  });
});
