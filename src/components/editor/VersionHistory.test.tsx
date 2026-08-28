import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { VersionHistory } from "./VersionHistory";

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

describe("VersionHistory", () => {
  it("불러오는 동안 로딩 상태를 보여준다", () => {
    stubFetch(() => new Promise(() => {})); // 영원히 응답하지 않음

    render(<VersionHistory pageId="doc-1" />);

    expect(screen.getByRole("status")).toHaveTextContent("불러오는 중");
  });

  it("성공하면 버전 목록을 최신순으로 보여주고 현재 버전을 표시한다", async () => {
    stubFetch((url) => {
      expect(url).toBe("/api/editor/documents/doc-1/versions");
      return jsonResponse({
        versions: [
          { number: 2, createdAt: "2026-08-27T10:00:00.000Z", isCurrent: true },
          { number: 1, createdAt: "2026-08-20T09:00:00.000Z", isCurrent: false },
        ],
      });
    });

    render(<VersionHistory pageId="doc-1" />);

    expect(await screen.findByText("버전 2")).toBeInTheDocument();
    expect(screen.getByText("버전 1")).toBeInTheDocument();
    expect(screen.getByText("현재 버전")).toBeInTheDocument();
  });

  it("조회에 실패하면 오류 메시지를 보여준다", async () => {
    stubFetch(() =>
      jsonResponse(
        { error: { code: "UPSTREAM_ERROR", message: "일시적인 오류로 요청을 처리하지 못했습니다. 잠시 후 다시 시도해주세요." } },
        502
      )
    );

    render(<VersionHistory pageId="doc-1" />);

    expect(
      await screen.findByText("일시적인 오류로 요청을 처리하지 못했습니다. 잠시 후 다시 시도해주세요.")
    ).toBeInTheDocument();
  });

  it("버전이 없으면 안내 문구를 보여준다", async () => {
    stubFetch(() => jsonResponse({ versions: [] }));

    render(<VersionHistory pageId="doc-1" />);

    expect(await screen.findByText("버전 이력이 없습니다.")).toBeInTheDocument();
  });
});
