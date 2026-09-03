import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider } from "@sfood/ui";
import { OnboardingModal } from "./OnboardingModal";

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
      <OnboardingModal />
    </ToastProvider>
  );
}

beforeEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("OnboardingModal", () => {
  it("needsOnboarding이 false면 아무것도 렌더링하지 않는다", async () => {
    stubFetch(() =>
      jsonResponse({ email: "user@s-food.com", name: "홍길동", team: "IT팀", needsOnboarding: false })
    );

    renderModal();

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  it("needsOnboarding이 true면 이름·팀 입력 폼이 뜬다", async () => {
    stubFetch(() =>
      jsonResponse({ email: "user@s-food.com", name: "", team: "", needsOnboarding: true })
    );

    renderModal();

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(screen.getByLabelText(/^이름/)).toBeInTheDocument();
    expect(screen.getByLabelText(/^팀/)).toBeInTheDocument();
  });

  it("이름·팀을 입력하지 않으면 시작하기 버튼이 비활성화된다", async () => {
    stubFetch(() =>
      jsonResponse({ email: "user@s-food.com", name: "", team: "", needsOnboarding: true })
    );

    renderModal();
    await screen.findByRole("dialog");

    expect(screen.getByRole("button", { name: "시작하기" })).toBeDisabled();
  });

  it("Escape 키를 눌러도 저장 전에는 닫히지 않는다", async () => {
    const user = userEvent.setup();
    stubFetch(() =>
      jsonResponse({ email: "user@s-food.com", name: "", team: "", needsOnboarding: true })
    );

    renderModal();
    await screen.findByRole("dialog");

    await user.keyboard("{Escape}");

    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("이름·팀을 입력하고 제출하면 저장 API를 호출하고 닫힌다", async () => {
    const user = userEvent.setup();
    const fetchMock = stubFetch((url, init) => {
      if (url === "/api/editor/account" && (!init || init.method === undefined)) {
        return jsonResponse({
          email: "user@s-food.com",
          name: "",
          team: "",
          needsOnboarding: true,
        });
      }
      if (url === "/api/editor/account" && init?.method === "PUT") {
        return jsonResponse({ email: "user@s-food.com", name: "홍길동", team: "IT팀" });
      }
      throw new Error(`unexpected request: ${url}`);
    });

    renderModal();
    await screen.findByRole("dialog");

    await user.type(screen.getByLabelText(/^이름/), "홍길동");
    await user.type(screen.getByLabelText(/^팀/), "IT팀");
    await user.click(screen.getByRole("button", { name: "시작하기" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/editor/account",
        expect.objectContaining({
          method: "PUT",
          body: JSON.stringify({ name: "홍길동", team: "IT팀" }),
        })
      );
    });
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  it("저장에 실패하면 Modal이 열린 채로 오류 메시지를 보여준다", async () => {
    const user = userEvent.setup();
    stubFetch((url, init) => {
      if (init?.method === "PUT") {
        return jsonResponse({ error: { message: "이름과 팀을 모두 입력해주세요." } }, 400);
      }
      return jsonResponse({ email: "user@s-food.com", name: "", team: "", needsOnboarding: true });
    });

    renderModal();
    await screen.findByRole("dialog");

    await user.type(screen.getByLabelText(/^이름/), "홍길동");
    await user.type(screen.getByLabelText(/^팀/), "IT팀");
    await user.click(screen.getByRole("button", { name: "시작하기" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("이름과 팀을 모두 입력해주세요.");
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});
