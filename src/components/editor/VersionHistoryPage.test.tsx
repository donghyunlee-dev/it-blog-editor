import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { VersionHistoryPage } from "./VersionHistoryPage";

function stubFetch(handler: (url: string) => Response | Promise<Response>) {
  const fetchMock = vi.fn(async (url: string) => handler(url));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status });

beforeEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("VersionHistoryPage", () => {
  it("버전 목록을 최신순으로 보여주고 현재 버전을 표시한다", () => {
    render(
      <VersionHistoryPage
        pageId="doc-1"
        initialVersions={[
          {
            number: 2,
            createdAt: "2026-08-27T10:00:00.000Z",
            isCurrent: true,
            author: "김철수(editor@s-food.com)",
          },
          { number: 1, createdAt: "2026-08-20T09:00:00.000Z", isCurrent: false, author: null },
        ]}
      />
    );

    expect(screen.getByText("버전 2")).toBeInTheDocument();
    expect(screen.getByText("버전 1")).toBeInTheDocument();
    expect(screen.getByText("현재 버전")).toBeInTheDocument();
    // P19-4: 버전 코멘트가 있으면 작성자를, 없으면(이 기능 이전에 저장된 버전) 안내 문구를 보여준다.
    expect(screen.getByText("김철수(editor@s-food.com)")).toBeInTheDocument();
    expect(screen.getByText("작성자 정보 없음")).toBeInTheDocument();
  });

  it("버전이 없으면 안내 문구를 보여준다", () => {
    render(<VersionHistoryPage pageId="doc-1" initialVersions={[]} />);

    expect(screen.getByText("버전 이력이 없습니다.")).toBeInTheDocument();
  });

  it("버전 1(최초 버전)에는 '변경 내용 보기' 버튼이 없다(P19-5 — 비교할 이전 버전이 없음)", () => {
    render(
      <VersionHistoryPage
        pageId="doc-1"
        initialVersions={[
          { number: 1, createdAt: "2026-08-20T09:00:00.000Z", isCurrent: true, author: null },
        ]}
      />
    );

    expect(screen.queryByRole("button", { name: "변경 내용 보기" })).not.toBeInTheDocument();
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

    render(
      <VersionHistoryPage
        pageId="doc-1"
        initialVersions={[
          { number: 2, createdAt: "2026-08-27T10:00:00.000Z", isCurrent: true, author: null },
          { number: 1, createdAt: "2026-08-20T09:00:00.000Z", isCurrent: false, author: null },
        ]}
      />
    );

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

    render(
      <VersionHistoryPage
        pageId="doc-1"
        initialVersions={[
          { number: 2, createdAt: "2026-08-27T10:00:00.000Z", isCurrent: true, author: null },
        ]}
      />
    );

    await user.click(screen.getByRole("button", { name: "변경 내용 보기" }));

    expect(await screen.findByText("이전 버전이 없습니다.")).toBeInTheDocument();
  });

  it("diff 조회에 실패하면 오류 메시지를 보여준다", async () => {
    const user = userEvent.setup();
    stubFetch(() =>
      jsonResponse({ error: { message: "일시적인 오류로 요청을 처리하지 못했습니다." } }, 502)
    );

    render(
      <VersionHistoryPage
        pageId="doc-1"
        initialVersions={[
          { number: 2, createdAt: "2026-08-27T10:00:00.000Z", isCurrent: true, author: null },
        ]}
      />
    );

    await user.click(screen.getByRole("button", { name: "변경 내용 보기" }));

    expect(
      await screen.findByText("일시적인 오류로 요청을 처리하지 못했습니다.")
    ).toBeInTheDocument();
  });
});
