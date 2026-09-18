import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider } from "@sfood/ui";
import { VersionHistoryPage, type VersionHistoryPageProps } from "./VersionHistoryPage";

// P19-6: 복원 성공 시 /editor/{pageId}로 이동하므로(DeletedDocumentsPage.test.tsx와 같은
// 이유) next/navigation의 useRouter를 직접 모킹한다(AppRouterContext 없이는 던짐).
const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

function stubFetch(handler: (url: string, init?: RequestInit) => Response | Promise<Response>) {
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => handler(url, init));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status });

function renderPage(props: Partial<VersionHistoryPageProps> & Pick<VersionHistoryPageProps, "initialVersions">) {
  return render(
    <ToastProvider>
      <VersionHistoryPage
        pageId="doc-1"
        currentTitle="문서 제목"
        currentVersion={2}
        {...props}
      />
    </ToastProvider>
  );
}

beforeEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  push.mockClear();
});

describe("VersionHistoryPage", () => {
  it("버전 목록을 최신순으로 보여주고 현재 버전을 표시한다", () => {
    renderPage({
      initialVersions: [
        {
          number: 2,
          createdAt: "2026-08-27T10:00:00.000Z",
          isCurrent: true,
          author: "김철수(editor@s-food.com)",
        },
        { number: 1, createdAt: "2026-08-20T09:00:00.000Z", isCurrent: false, author: null },
      ],
    });

    expect(screen.getByText("버전 2")).toBeInTheDocument();
    expect(screen.getByText("버전 1")).toBeInTheDocument();
    expect(screen.getByText("현재 버전")).toBeInTheDocument();
    // 사용자 지적 — "이 문서의 이력이라고만 하니까 알 수가 없어" — 상단에 문서 제목을
    // 보여준다. "문서 이력"이 큰 제목처럼 보여 오히려 헷갈린다는 재지적을 받아, 문서
    // 제목을 실제 h1(가장 눈에 띄는 텍스트)로 두고 "문서 이력"은 작은 라벨로 낮췄다.
    expect(screen.getByRole("heading", { name: "문서 제목" })).toBeInTheDocument();
    expect(screen.getByText("문서 이력")).toBeInTheDocument();
    // P19-4: 버전 코멘트가 있으면 작성자를, 없으면(이 기능 이전에 저장된 버전) 안내 문구를 보여준다.
    expect(screen.getByText("김철수(editor@s-food.com)")).toBeInTheDocument();
    expect(screen.getByText("작성자 정보 없음")).toBeInTheDocument();
  });

  it("버전이 없으면 안내 문구를 보여준다", () => {
    renderPage({ initialVersions: [] });

    expect(screen.getByText("버전 이력이 없습니다.")).toBeInTheDocument();
  });

  it("제목이 없으면(빈 문자열) 대체 문구를 보여준다", () => {
    renderPage({ initialVersions: [], currentTitle: "" });

    expect(screen.getByText("(제목 없음)")).toBeInTheDocument();
  });

  it("버전 1(최초 버전)에는 '변경 내용 보기' 버튼이 없다(P19-5 — 비교할 이전 버전이 없음)", () => {
    renderPage({
      initialVersions: [
        { number: 1, createdAt: "2026-08-20T09:00:00.000Z", isCurrent: true, author: null },
      ],
    });

    expect(screen.queryByRole("button", { name: "변경 내용 보기" })).not.toBeInTheDocument();
  });

  it("현재 버전에는 '복원' 버튼이 없다(P19-6 — 자기 자신으로 복원은 의미 없음)", () => {
    renderPage({
      initialVersions: [
        { number: 2, createdAt: "2026-08-27T10:00:00.000Z", isCurrent: true, author: null },
        { number: 1, createdAt: "2026-08-20T09:00:00.000Z", isCurrent: false, author: null },
      ],
    });

    const restoreButtons = screen.getAllByRole("button", { name: "복원" });
    expect(restoreButtons).toHaveLength(1);
  });

  it("'변경 내용 보기'를 누르면 diff를 조회해 추가/삭제 부분을 구분해 보여준다(P19-5)", async () => {
    const user = userEvent.setup();
    const fetchMock = stubFetch((url) => {
      expect(url).toBe("/api/editor/documents/doc-1/versions/2/diff");
      return jsonResponse({
        diff: [
          { value: "안녕" },
          { value: "하세요", removed: true },
          { value: "합니다", added: true },
        ],
      });
    });

    renderPage({
      initialVersions: [
        { number: 2, createdAt: "2026-08-27T10:00:00.000Z", isCurrent: true, author: null },
        { number: 1, createdAt: "2026-08-20T09:00:00.000Z", isCurrent: false, author: null },
      ],
    });

    await user.click(screen.getByRole("button", { name: "변경 내용 보기" }));

    expect(await screen.findByText("하세요")).toHaveClass("line-through");
    expect(screen.getByText("합니다")).toHaveClass("bg-success/15");
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // 다시 누르면 닫히고, 다시 열어도 같은 버전은 재요청하지 않는다(캐시).
    await user.click(screen.getByRole("button", { name: "변경 내용 닫기" }));
    expect(screen.queryByText("하세요")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "변경 내용 보기" }));
    expect(await screen.findByText("하세요")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("이전 버전이 없는 diff 응답(null)은 안내 문구로 보여준다", async () => {
    const user = userEvent.setup();
    stubFetch(() => jsonResponse({ diff: null }));

    renderPage({
      initialVersions: [
        { number: 2, createdAt: "2026-08-27T10:00:00.000Z", isCurrent: true, author: null },
      ],
    });

    await user.click(screen.getByRole("button", { name: "변경 내용 보기" }));

    expect(await screen.findByText("이전 버전이 없습니다.")).toBeInTheDocument();
  });

  it("diff 조회에 실패하면 오류 메시지를 보여준다", async () => {
    const user = userEvent.setup();
    stubFetch(() =>
      jsonResponse({ error: { message: "일시적인 오류로 요청을 처리하지 못했습니다." } }, 502)
    );

    renderPage({
      initialVersions: [
        { number: 2, createdAt: "2026-08-27T10:00:00.000Z", isCurrent: true, author: null },
      ],
    });

    await user.click(screen.getByRole("button", { name: "변경 내용 보기" }));

    expect(
      await screen.findByText("일시적인 오류로 요청을 처리하지 못했습니다.")
    ).toBeInTheDocument();
  });

  it("'복원'을 누르면 확인 모달이 뜨고, 확인하면 내용을 조회해 변환한 뒤 저장하고 편집 화면으로 이동한다(P19-6)", async () => {
    const user = userEvent.setup();
    const fetchMock = stubFetch((url, init) => {
      if (url === "/api/editor/documents/doc-1/versions/1/content") {
        return jsonResponse({ html: "<p>과거 내용</p>" });
      }
      if (url === "/api/editor/documents/doc-1" && init?.method === "PUT") {
        const body = JSON.parse(init.body as string);
        expect(body.title).toBe("문서 제목");
        expect(body.version).toBe(2);
        expect(body.doc).toMatchObject({ type: "doc" });
        return jsonResponse({ pageId: "doc-1", version: 3, lastEditedBy: undefined });
      }
      throw new Error(`unexpected request: ${url}`);
    });

    renderPage({
      initialVersions: [
        { number: 2, createdAt: "2026-08-27T10:00:00.000Z", isCurrent: true, author: null },
        { number: 1, createdAt: "2026-08-20T09:00:00.000Z", isCurrent: false, author: null },
      ],
    });

    await user.click(screen.getByRole("button", { name: "복원" }));
    expect(screen.getByText(/버전 1의 내용으로 현재 문서를 덮어씁니다/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "복원 확인" }));

    expect(await screen.findByText(/복원했습니다/)).toBeInTheDocument();
    expect(push).toHaveBeenCalledWith("/editor/doc-1");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("복원 중 내용 조회가 실패하면 오류 토스트를 띄우고 저장을 시도하지 않는다", async () => {
    const user = userEvent.setup();
    const fetchMock = stubFetch((url) => {
      if (url === "/api/editor/documents/doc-1/versions/1/content") {
        return jsonResponse({ error: { message: "버전 내용을 불러오지 못했습니다." } }, 502);
      }
      throw new Error(`unexpected request: ${url}`);
    });

    renderPage({
      initialVersions: [
        { number: 2, createdAt: "2026-08-27T10:00:00.000Z", isCurrent: true, author: null },
        { number: 1, createdAt: "2026-08-20T09:00:00.000Z", isCurrent: false, author: null },
      ],
    });

    await user.click(screen.getByRole("button", { name: "복원" }));
    await user.click(screen.getByRole("button", { name: "복원 확인" }));

    expect(await screen.findByText("버전 내용을 불러오지 못했습니다.")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(push).not.toHaveBeenCalled();
  });
});
