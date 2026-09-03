import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider } from "@sfood/ui";
import { WelcomeForm } from "./WelcomeForm";

const EMAIL = "user@s-food.com";
const replaceMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock }),
}));

function stubFetch(handler: (url: string, init?: RequestInit) => Response | Promise<Response>) {
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => handler(url, init));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status });

function renderForm() {
  return render(
    <ToastProvider>
      <WelcomeForm email={EMAIL} />
    </ToastProvider>
  );
}

beforeEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  replaceMock.mockClear();
});

describe("WelcomeForm", () => {
  it("서비스 소개(제목·기능 3가지)와 로그인 계정 이메일, 이름·팀 입력 폼을 함께 보여준다", () => {
    renderForm();

    expect(screen.getByText("SFOOD IT Editor에 오신 걸 환영해요!")).toBeInTheDocument();
    expect(screen.getByText("초안은 나만 볼 수 있어요")).toBeInTheDocument();
    expect(screen.getByText("원할 때 바로 게시")).toBeInTheDocument();
    expect(screen.getByText("편하게 쓰는 에디터")).toBeInTheDocument();
    expect(screen.getByText(EMAIL)).toBeInTheDocument();
    expect(screen.getByLabelText(/^이름을 알고 싶어요/)).toBeInTheDocument();
    expect(screen.getByLabelText(/^어디 소속인지 알려주세요/)).toBeInTheDocument();
  });

  it("이름·팀을 입력하지 않으면 시작하기 버튼이 비활성화된다", () => {
    renderForm();

    expect(screen.getByRole("button", { name: "시작하기" })).toBeDisabled();
  });

  it("제출에 성공하면 저장 API를 호출하고 /editor로 이동한다", async () => {
    const user = userEvent.setup();
    const fetchMock = stubFetch((url, init) => {
      if (url === "/api/editor/account" && init?.method === "PUT") {
        return jsonResponse({ email: EMAIL, name: "홍길동", team: "IT팀" });
      }
      throw new Error(`unexpected request: ${url}`);
    });

    renderForm();

    await user.type(screen.getByLabelText(/^이름을 알고 싶어요/), "홍길동");
    await user.type(screen.getByLabelText(/^어디 소속인지 알려주세요/), "IT팀");
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
      expect(replaceMock).toHaveBeenCalledWith("/editor");
    });
  });

  it("제출에 실패하면 Toast로 오류를 안내하고 이동하지 않는다", async () => {
    const user = userEvent.setup();
    stubFetch(() => jsonResponse({ error: { message: "이름과 팀을 모두 입력해주세요." } }, 400));

    renderForm();

    await user.type(screen.getByLabelText(/^이름을 알고 싶어요/), "홍길동");
    await user.type(screen.getByLabelText(/^어디 소속인지 알려주세요/), "IT팀");
    await user.click(screen.getByRole("button", { name: "시작하기" }));

    expect(await screen.findByText("이름과 팀을 모두 입력해주세요.")).toBeInTheDocument();
    expect(replaceMock).not.toHaveBeenCalled();
  });
});
