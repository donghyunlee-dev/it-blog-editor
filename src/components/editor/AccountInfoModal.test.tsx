import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider } from "@sfood/ui";
import { AccountInfoModal } from "./AccountInfoModal";

function stubFetch(handler: (url: string, init?: RequestInit) => Response | Promise<Response>) {
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => handler(url, init));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status });

function renderModal() {
  return render(
    <ToastProvider>
      <AccountInfoModal />
    </ToastProvider>
  );
}

beforeEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("AccountInfoModal", () => {
  it("불러오는 동안 로딩 상태를 보여준다", () => {
    stubFetch(() => new Promise(() => {}));

    renderModal();

    expect(screen.getByRole("status")).toHaveTextContent("불러오는 중");
  });

  it("성공하면 이메일(읽기전용)과 이름·팀을 채워 보여준다", async () => {
    stubFetch(() =>
      jsonResponse({ email: "user@s-food.com", name: "홍길동", team: "IT팀" })
    );

    renderModal();

    expect(await screen.findByDisplayValue("user@s-food.com")).toBeDisabled();
    expect(screen.getByDisplayValue("홍길동")).toBeInTheDocument();
    expect(screen.getByDisplayValue("IT팀")).toBeInTheDocument();
  });

  it("조회에 실패하면 오류 메시지를 보여준다", async () => {
    stubFetch(() =>
      jsonResponse({ error: { message: "일시적인 오류로 요청을 처리하지 못했습니다." } }, 502)
    );

    renderModal();

    expect(
      await screen.findByText("일시적인 오류로 요청을 처리하지 못했습니다.")
    ).toBeInTheDocument();
  });

  it("저장에 성공하면 성공 Toast를 보여준다", async () => {
    const user = userEvent.setup();
    const fetchMock = stubFetch((url, init) => {
      if (url === "/api/editor/account" && init?.method === "PUT") {
        return jsonResponse({ email: "user@s-food.com", name: "김철수", team: "디자인팀" });
      }
      return jsonResponse({ email: "user@s-food.com", name: "홍길동", team: "IT팀" });
    });

    renderModal();
    await screen.findByDisplayValue("홍길동");

    const nameInput = screen.getByDisplayValue("홍길동");
    await user.clear(nameInput);
    await user.type(nameInput, "김철수");
    const teamInput = screen.getByDisplayValue("IT팀");
    await user.clear(teamInput);
    await user.type(teamInput, "디자인팀");
    await user.click(screen.getByRole("button", { name: "저장" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/editor/account",
        expect.objectContaining({
          method: "PUT",
          body: JSON.stringify({ name: "김철수", team: "디자인팀" }),
        })
      );
    });
    expect(await screen.findByText("계정 정보를 저장했습니다.")).toBeInTheDocument();
  });

  it("저장에 실패하면 오류 Toast를 보여주고 값을 그대로 남긴다", async () => {
    const user = userEvent.setup();
    stubFetch((url, init) => {
      if (init?.method === "PUT") {
        return jsonResponse({ error: { message: "이름과 팀을 모두 입력해주세요." } }, 400);
      }
      return jsonResponse({ email: "user@s-food.com", name: "홍길동", team: "IT팀" });
    });

    renderModal();
    await screen.findByDisplayValue("홍길동");
    await user.click(screen.getByRole("button", { name: "저장" }));

    expect(await screen.findByText("이름과 팀을 모두 입력해주세요.")).toBeInTheDocument();
    expect(screen.getByDisplayValue("홍길동")).toBeInTheDocument();
  });
});
