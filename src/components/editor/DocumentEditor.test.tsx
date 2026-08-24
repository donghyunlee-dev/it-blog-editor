import type { ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider } from "@sfood/ui";
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

// RichTextEditor는 TipTap(ProseMirror) 기반이라 contenteditable·레이아웃 측정 API에
// 의존하고, 본문 편집 동작 자체는 그 컴포넌트의 책임이다. 여기서 확인할 것은
// DocumentEditor가 본문을 JSONContent 상태로 들고 있다가 저장 요청에 `doc`으로 실어
// 보내는지, 그리고 이미지 업로드 활성화 조건인 pageId를 넘기는지이므로 가벼운 대역으로
// 바꿔 끼운다.
vi.mock("./RichTextEditor", () => ({
  RichTextEditor: ({
    content,
    onChange,
    pageId,
  }: {
    content: unknown;
    onChange: (doc: unknown) => void;
    pageId?: string;
  }) => (
    <textarea
      aria-label="본문"
      data-page-id={pageId ?? ""}
      data-content={JSON.stringify(content)}
      onChange={(event) => {
        onChange({
          type: "doc",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: event.target.value }],
            },
          ],
        });
      }}
    />
  ),
}));

/**
 * useToast()는 Provider 없이도 no-op 컨텍스트 기본값으로 동작하므로 렌더 자체는
 * 성공하지만, 토스트 메시지를 화면에서 조회하려면 실제 Provider가 필요하다.
 */
function renderEditor(ui: ReactElement) {
  return render(<ToastProvider>{ui}</ToastProvider>);
}

/** URL별로 다른 응답을 주는 fetch 대역을 설치하고, 호출 기록용 mock을 돌려준다. */
function stubFetch(
  handler: (url: string, init?: RequestInit) => Response | Promise<Response>
) {
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) =>
    handler(url, init)
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status });

const EDIT_PROPS = {
  mode: "edit" as const,
  pageId: "page-1",
  initialTitle: "기존 제목",
  initialDoc: { type: "doc", content: [] },
  initialVersion: 1,
};

beforeEach(() => {
  push.mockClear();
  refresh.mockClear();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("DocumentEditor", () => {
  it("새 문서 생성 성공 시 사이드바를 새로고침하고 새 문서로 이동한다", async () => {
    stubFetch(() => jsonResponse({ pageId: "new-1", version: 1 }, 201));

    renderEditor(<DocumentEditor mode="create" />);

    await userEvent.type(screen.getByLabelText("제목"), "새 문서 제목");
    await userEvent.click(screen.getByRole("button", { name: "저장" }));

    expect(refresh).toHaveBeenCalled();
    expect(push).toHaveBeenCalledWith("/editor/new-1");
  });

  it("기존 문서 수정 성공 시 사이드바를 새로고침한다(페이지 이동은 하지 않는다)", async () => {
    stubFetch(() => jsonResponse({ pageId: "page-1", version: 2 }));

    renderEditor(<DocumentEditor {...EDIT_PROPS} />);

    await userEvent.click(screen.getByRole("button", { name: "저장" }));

    expect(refresh).toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
  });

  it("삭제 성공 시 사이드바를 새로고침하고 문서 탐색기로 이동한다", async () => {
    stubFetch(() => new Response(null, { status: 204 }));

    renderEditor(<DocumentEditor {...EDIT_PROPS} />);

    await userEvent.click(screen.getByRole("button", { name: "삭제" }));
    await userEvent.click(screen.getByRole("button", { name: "삭제 확인" }));

    expect(refresh).toHaveBeenCalled();
    expect(push).toHaveBeenCalledWith("/editor");
  });

  it("삭제 버튼을 누르면 확인 모달이 뜨고, 확인해야 실제 삭제 요청을 보낸다", async () => {
    const fetchMock = stubFetch(() => new Response(null, { status: 204 }));

    renderEditor(<DocumentEditor {...EDIT_PROPS} pageId="doc-1" />);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "삭제" }));

    // 모달만 열리고, 확인하기 전에는 어떤 요청도 나가지 않아야 한다.
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole("button", { name: "삭제 확인" }));

    expect(fetchMock).toHaveBeenCalledWith("/api/editor/documents/doc-1", {
      method: "DELETE",
    });
  });

  it("삭제 확인 모달에서 취소하면 삭제 요청을 보내지 않는다", async () => {
    const fetchMock = stubFetch(() => new Response(null, { status: 204 }));

    renderEditor(<DocumentEditor {...EDIT_PROPS} />);

    await userEvent.click(screen.getByRole("button", { name: "삭제" }));
    await userEvent.click(screen.getByRole("button", { name: "취소" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
  });

  it("저장 요청에 markdown 문자열이 아닌 TipTap doc(JSONContent)을 담아 보낸다", async () => {
    const fetchMock = stubFetch(() =>
      jsonResponse({ pageId: "page-1", version: 2 })
    );

    renderEditor(<DocumentEditor {...EDIT_PROPS} />);

    await userEvent.type(screen.getByLabelText("본문"), "본");
    await userEvent.click(screen.getByRole("button", { name: "저장" }));

    const saveCall = fetchMock.mock.calls.find(
      ([url, init]) =>
        url === "/api/editor/documents/page-1" && init?.method === "PUT"
    );
    expect(saveCall).toBeDefined();

    const payload = JSON.parse(String(saveCall?.[1]?.body));
    expect(payload).toEqual({
      title: "기존 제목",
      doc: {
        type: "doc",
        content: [
          { type: "paragraph", content: [{ type: "text", text: "본" }] },
        ],
      },
      version: 1,
    });
    expect(payload).not.toHaveProperty("body");
  });

  it("새 문서 생성 요청에도 markdown 문자열이 아닌 TipTap doc(JSONContent)을 담아 보낸다", async () => {
    const fetchMock = stubFetch((url) =>
      url.endsWith("/tags")
        ? jsonResponse({ pageId: "new-1", tags: [] })
        : jsonResponse({ pageId: "new-1", version: 1 }, 201)
    );

    renderEditor(<DocumentEditor mode="create" />);

    await userEvent.type(screen.getByLabelText("제목"), "새 문서");
    await userEvent.type(screen.getByLabelText("본문"), "본");
    await userEvent.click(screen.getByRole("button", { name: "저장" }));

    const createCall = fetchMock.mock.calls.find(
      ([url, init]) =>
        url === "/api/editor/documents" && init?.method === "POST"
    );
    expect(createCall).toBeDefined();

    const payload = JSON.parse(String(createCall?.[1]?.body));
    expect(payload).toEqual({
      title: "새 문서",
      doc: {
        type: "doc",
        content: [
          { type: "paragraph", content: [{ type: "text", text: "본" }] },
        ],
      },
    });
    expect(payload).not.toHaveProperty("body");
    // 생성 요청에는 version을 보내지 않는다(서버가 새로 발급한다).
    expect(payload).not.toHaveProperty("version");
  });

  it("기존 문서를 저장하면 태그도 태그 전용 엔드포인트로 저장한다", async () => {
    const fetchMock = stubFetch((url) =>
      url.endsWith("/tags")
        ? jsonResponse({ pageId: "page-1", tags: ["React"] })
        : jsonResponse({ pageId: "page-1", version: 2 })
    );

    renderEditor(<DocumentEditor {...EDIT_PROPS} initialTags={["React"]} />);

    await userEvent.click(screen.getByRole("button", { name: "저장" }));

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/editor/documents/page-1/tags",
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify({ tags: ["React"] }),
      })
    );
  });

  it("새 문서의 태그는 생성 응답으로 받은 pageId로 저장한다", async () => {
    const fetchMock = stubFetch((url) =>
      url.endsWith("/tags")
        ? jsonResponse({ pageId: "new-1", tags: ["Backend"] })
        : jsonResponse({ pageId: "new-1", version: 1 }, 201)
    );

    renderEditor(<DocumentEditor mode="create" />);

    await userEvent.type(screen.getByLabelText("제목"), "새 문서");
    await userEvent.type(
      screen.getByPlaceholderText("태그 입력"),
      "Backend{Enter}"
    );
    await userEvent.click(screen.getByRole("button", { name: "저장" }));

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/editor/documents/new-1/tags",
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify({ tags: ["Backend"] }),
      })
    );
  });

  it("문서 저장은 성공했지만 태그 저장이 실패하면 경고 토스트로 구분해 알린다", async () => {
    stubFetch((url) =>
      url.endsWith("/tags")
        ? jsonResponse(
            { error: { code: "UPSTREAM_ERROR", message: "라벨 API 실패" } },
            502
          )
        : jsonResponse({ pageId: "page-1", version: 2 })
    );

    renderEditor(<DocumentEditor {...EDIT_PROPS} initialTags={["React"]} />);

    await userEvent.click(screen.getByRole("button", { name: "저장" }));

    expect(
      await screen.findByText(
        "문서는 저장했지만 태그 저장에 실패했습니다: 라벨 API 실패"
      )
    ).toBeInTheDocument();
    // 본문은 실제로 저장됐으므로 "저장되었습니다."로 뭉개지 않는다.
    expect(screen.queryByText("저장되었습니다.")).not.toBeInTheDocument();
    // 그리고 저장 자체는 성공했으므로 사이드바 갱신은 그대로 수행한다.
    expect(refresh).toHaveBeenCalled();
  });

  it("태그 저장 요청이 네트워크 단계에서 실패해도 저장 실패로 뭉개지 않는다", async () => {
    stubFetch((url) => {
      if (url.endsWith("/tags")) {
        return Promise.reject(new Error("네트워크 연결이 끊겼습니다."));
      }
      return jsonResponse({ pageId: "page-1", version: 2 });
    });

    renderEditor(<DocumentEditor {...EDIT_PROPS} initialTags={["React"]} />);

    await userEvent.click(screen.getByRole("button", { name: "저장" }));

    expect(
      await screen.findByText(
        "문서는 저장했지만 태그 저장에 실패했습니다: 네트워크 연결이 끊겼습니다."
      )
    ).toBeInTheDocument();
    expect(refresh).toHaveBeenCalled();
  });

  it("게시 설정 버튼은 게시 설정 화면으로 이동시킨다", async () => {
    renderEditor(<DocumentEditor {...EDIT_PROPS} />);

    await userEvent.click(screen.getByRole("button", { name: "게시 설정" }));

    expect(push).toHaveBeenCalledWith("/editor/page-1/publish");
  });

  it("태그 자동완성 후보를 TagInput에 전달한다", () => {
    renderEditor(
      <DocumentEditor {...EDIT_PROPS} tagSuggestions={["Backend", "React"]} />
    );

    const input = screen.getByPlaceholderText("태그 입력");
    const datalist = document.getElementById(
      input.getAttribute("list") ?? ""
    );

    expect(datalist?.querySelectorAll("option")).toHaveLength(2);
  });

  it("버전 충돌(409) 메시지를 인라인 텍스트가 아닌 토스트로 알린다", async () => {
    stubFetch(() =>
      jsonResponse(
        {
          error: {
            code: "CONFLICT",
            message: "문서가 이미 최신 버전(3)으로 변경되었습니다.",
          },
        },
        409
      )
    );

    renderEditor(<DocumentEditor {...EDIT_PROPS} />);

    await userEvent.click(screen.getByRole("button", { name: "저장" }));

    expect(
      await screen.findByText("문서가 이미 최신 버전(3)으로 변경되었습니다.")
    ).toBeInTheDocument();
    expect(refresh).not.toHaveBeenCalled();
  });

  it("저장 성공 시 성공 토스트를 띄운다", async () => {
    stubFetch(() => jsonResponse({ pageId: "page-1", version: 2 }));

    renderEditor(<DocumentEditor {...EDIT_PROPS} />);

    await userEvent.click(screen.getByRole("button", { name: "저장" }));

    expect(await screen.findByText("저장되었습니다.")).toBeInTheDocument();
  });

  it("본문 편집기에 pageId를 넘겨 이미지 업로드가 활성화되도록 한다", () => {
    renderEditor(<DocumentEditor {...EDIT_PROPS} />);

    expect(screen.getByLabelText("본문")).toHaveAttribute(
      "data-page-id",
      "page-1"
    );
  });

  it("content가 빈 doc은 빈 문단을 채워 편집기에 넘긴다(ProseMirror doc: block+)", () => {
    renderEditor(<DocumentEditor {...EDIT_PROPS} />);

    expect(screen.getByLabelText("본문")).toHaveAttribute(
      "data-content",
      JSON.stringify({ type: "doc", content: [{ type: "paragraph" }] })
    );
  });

  it("markdown 시절의 수동 이미지 등록 버튼은 더 이상 노출하지 않는다", () => {
    renderEditor(<DocumentEditor {...EDIT_PROPS} />);

    expect(screen.queryByText("이미지 등록")).not.toBeInTheDocument();
  });
});
