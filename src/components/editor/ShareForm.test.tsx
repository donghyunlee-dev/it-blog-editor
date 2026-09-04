import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider } from "@sfood/ui";
import { ShareForm } from "./ShareForm";

function stubFetch(handler: (url: string, init?: RequestInit) => Response | Promise<Response>) {
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => handler(url, init));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status });

function renderForm(initialSharedWith: { email: string; name: string }[] = []) {
  return render(
    <ToastProvider>
      <ShareForm pageId="doc-1" initialSharedWith={initialSharedWith} />
    </ToastProvider>
  );
}

beforeEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("ShareForm", () => {
  it("초기 공유 목록을 보여준다", () => {
    renderForm([{ email: "a@s-food.com", name: "김철수" }]);

    // Tag의 접근성 텍스트에는 제거(×) 버튼의 문구도 섞여 들어가므로(같은 <span> 안),
    // 정확히 일치가 아니라 라벨로 시작하는지로 확인한다.
    expect(screen.getByText(/^김철수\(a@s-food\.com\)/)).toBeInTheDocument();
  });

  it("공유된 대상이 없으면 안내 문구를 보여준다", () => {
    renderForm([]);

    expect(screen.getByText("아직 공유된 대상이 없습니다.")).toBeInTheDocument();
  });

  it("검색어를 입력하면(디바운스 후) 검색 API를 호출해 결과를 보여준다", async () => {
    const fetchMock = stubFetch((url) =>
      url.includes("/api/editor/account/search")
        ? jsonResponse({
            accounts: [
              { email: "b@s-food.com", name: "이영희", team: "디자인팀", accessEnabled: true },
            ],
          })
        : jsonResponse({}, 404)
    );

    renderForm();
    await userEvent.type(screen.getByPlaceholderText("이름·이메일·팀으로 검색"), "이영희");

    await waitFor(
      () =>
        expect(fetchMock).toHaveBeenCalledWith(
          "/api/editor/account/search?q=" + encodeURIComponent("이영희")
        ),
      { timeout: 2000 }
    );
    expect(await screen.findByText("이영희(b@s-food.com)", {}, { timeout: 2000 })).toBeInTheDocument();
  });

  it("이미 공유된 대상은 검색 결과에서 제외한다", async () => {
    stubFetch((url) =>
      url.includes("/api/editor/account/search")
        ? jsonResponse({
            accounts: [
              { email: "a@s-food.com", name: "김철수", team: "IT팀", accessEnabled: true },
              { email: "b@s-food.com", name: "이영희", team: "디자인팀", accessEnabled: true },
            ],
          })
        : jsonResponse({}, 404)
    );

    renderForm([{ email: "a@s-food.com", name: "김철수" }]);
    await userEvent.type(screen.getByPlaceholderText("이름·이메일·팀으로 검색"), "s-food");

    expect(
      await screen.findByText("이영희(b@s-food.com)", {}, { timeout: 2000 })
    ).toBeInTheDocument();
    // "공유 중인 사람" 목록에도 김철수가 있으므로, 검색 결과의 "추가" 버튼 목록에는
    // 김철수가 없어야 한다 — 화면 전체에 "김철수(a@s-food.com)"가 정확히 1번(공유 목록)만
    // 나타나는지로 확인한다.
    expect(screen.getAllByText(/^김철수\(a@s-food\.com\)/)).toHaveLength(1);
  });

  it("검색 결과에서 '추가'를 누르면 공유 API를 호출하고 공유 목록에 반영한다", async () => {
    const fetchMock = stubFetch((url, init) => {
      if (url.includes("/api/editor/account/search")) {
        return jsonResponse({
          accounts: [{ email: "b@s-food.com", name: "이영희", team: "디자인팀", accessEnabled: true }],
        });
      }
      if (url === "/api/editor/documents/doc-1/share" && init?.method === "POST") {
        return jsonResponse({ sharedWith: ["b@s-food.com"] });
      }
      return jsonResponse({}, 404);
    });

    renderForm();
    await userEvent.type(screen.getByPlaceholderText("이름·이메일·팀으로 검색"), "이영희");
    const addButton = await screen.findByRole("button", { name: "추가" }, { timeout: 2000 });
    await userEvent.click(addButton);

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/editor/documents/doc-1/share",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ email: "b@s-food.com" }),
        })
      )
    );
    expect(await screen.findByText("이영희(b@s-food.com)님과 공유했습니다.")).toBeInTheDocument();
  });

  it("공유 목록에서 '제거'를 누르면 해제 API를 호출하고 목록에서 지운다", async () => {
    const fetchMock = stubFetch((url, init) => {
      if (url === "/api/editor/documents/doc-1/share/a%40s-food.com" && init?.method === "DELETE") {
        return jsonResponse({ sharedWith: [] });
      }
      return jsonResponse({}, 404);
    });

    renderForm([{ email: "a@s-food.com", name: "김철수" }]);
    await userEvent.click(
      screen.getByRole("button", { name: "김철수(a@s-food.com) 공유 해제" })
    );

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/editor/documents/doc-1/share/a%40s-food.com",
        expect.objectContaining({ method: "DELETE" })
      )
    );
    expect(
      await screen.findByText("김철수(a@s-food.com)님과의 공유를 해제했습니다.")
    ).toBeInTheDocument();
    expect(screen.getByText("아직 공유된 대상이 없습니다.")).toBeInTheDocument();
  });

  it("검색 API 실패 시 오류를 안내한다", async () => {
    stubFetch(() => jsonResponse({ error: { message: "일시적인 오류로 요청을 처리하지 못했습니다." } }, 502));

    renderForm();
    await userEvent.type(screen.getByPlaceholderText("이름·이메일·팀으로 검색"), "김철수");

    expect(
      await screen.findByText("일시적인 오류로 요청을 처리하지 못했습니다.", {}, { timeout: 2000 })
    ).toBeInTheDocument();
  });

  it("공유 추가 실패 시 오류를 안내하고 목록에 반영하지 않는다", async () => {
    stubFetch((url, init) => {
      if (url.includes("/api/editor/account/search")) {
        return jsonResponse({
          accounts: [{ email: "b@s-food.com", name: "이영희", team: "디자인팀", accessEnabled: true }],
        });
      }
      if (url === "/api/editor/documents/doc-1/share" && init?.method === "POST") {
        return jsonResponse({ error: { message: "대상 계정을 찾을 수 없습니다." } }, 404);
      }
      return jsonResponse({}, 404);
    });

    renderForm();
    await userEvent.type(screen.getByPlaceholderText("이름·이메일·팀으로 검색"), "이영희");
    const addButton = await screen.findByRole("button", { name: "추가" }, { timeout: 2000 });
    await userEvent.click(addButton);

    expect(await screen.findByText("대상 계정을 찾을 수 없습니다.")).toBeInTheDocument();
    expect(screen.getByText("아직 공유된 대상이 없습니다.")).toBeInTheDocument();
  });
});
