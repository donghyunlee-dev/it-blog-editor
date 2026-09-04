import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider } from "@sfood/ui";
import AccountsPage from "./page";

function stubFetch(handler: (url: string) => Response | Promise<Response>) {
  const fetchMock = vi.fn(async (url: string) => handler(url));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status });

function renderPage() {
  return render(
    <ToastProvider>
      <AccountsPage />
    </ToastProvider>
  );
}

beforeEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("AccountsPage", () => {
  it("마운트 시 빈 검색어로 전체 목록을 조회해 보여준다", async () => {
    const fetchMock = stubFetch(() =>
      jsonResponse({
        accounts: [
          { email: "user@s-food.com", name: "홍길동", team: "IT팀", accessEnabled: true },
        ],
      })
    );

    renderPage();

    expect(await screen.findByText("홍길동(user@s-food.com)")).toBeInTheDocument();
    expect(screen.getByText("IT팀")).toBeInTheDocument();
    expect(screen.getByText("허용")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith("/api/editor/account/search?q=");
  });

  it("접속이 차단된 계정은 차단 뱃지로 표시한다", async () => {
    stubFetch(() =>
      jsonResponse({
        accounts: [
          { email: "other@s-food.com", name: "김철수", team: "디자인팀", accessEnabled: false },
        ],
      })
    );

    renderPage();

    expect(await screen.findByText("차단")).toBeInTheDocument();
  });

  it("검색어를 입력하면 검색 API를 다시 호출한다", async () => {
    const user = userEvent.setup();
    const fetchMock = stubFetch(() => jsonResponse({ accounts: [] }));

    renderPage();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    await user.type(screen.getByPlaceholderText("이름·이메일·팀으로 검색"), "김철수");

    await waitFor(() =>
      expect(fetchMock).toHaveBeenLastCalledWith("/api/editor/account/search?q=%EA%B9%80%EC%B2%A0%EC%88%98")
    );
  });

  it("조회에 실패하면 오류를 안내한다", async () => {
    stubFetch(() => jsonResponse({ error: { message: "실패" } }, 502));

    renderPage();

    expect(await screen.findByText("계정 목록을 불러오지 못했습니다.")).toBeInTheDocument();
  });
});
