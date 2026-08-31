import type { ReactElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider } from "@sfood/ui";
import { DocumentEditor } from "./DocumentEditor";
import { UnsavedChangesProvider } from "./UnsavedChangesContext";
import {
  readAutosaveSnapshot,
  writeAutosaveSnapshot,
} from "@/lib/editor/autosave-storage";

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

// next/link의 실제 클릭 핸들러는 onNavigate를 부르기 전에 AppRouterContext(별도의 내부
// 컨텍스트, useRouter 모킹으로는 채워지지 않는다)가 있는지부터 확인해서, 라우터
// 프로바이더 없는 테스트에서는 onNavigate 자체가 절대 호출되지 않는다(node_modules/next/
// dist/client/app-dir/link.js의 linkClicked). 진짜 라우터 컨텍스트를 흉내 내는 대신,
// Link의 계약(onClick 먼저, 그 다음 onNavigate — 막히면 중단)만 재현하는 가벼운 대역으로
// 바꿔 끼운다 — P0-1a의 "이동 가드"가 실제로 걸리는지를 검증하기 위함이다.
vi.mock("next/link", () => ({
  default: ({
    href,
    onClick,
    onNavigate,
    children,
    ...rest
  }: {
    href: string;
    onClick?: (event: React.MouseEvent) => void;
    onNavigate?: (event: { preventDefault: () => void }) => void;
    children?: React.ReactNode;
    [key: string]: unknown;
  }) => (
    <a
      href={href}
      onClick={(event: React.MouseEvent) => {
        onClick?.(event);
        let prevented = false;
        onNavigate?.({
          preventDefault: () => {
            prevented = true;
          },
        });
        if (prevented) {
          event.preventDefault();
        }
      }}
      {...rest}
    >
      {children}
    </a>
  ),
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

// VersionHistory 자체의 로딩/성공/실패 동작은 VersionHistory.test.tsx가 다룬다. 여기서는
// "이력" 버튼이 Modal을 열고 올바른 pageId를 넘기는지만 확인하면 되므로 가벼운 대역으로
// 바꿔 끼운다.
vi.mock("./VersionHistory", () => ({
  VersionHistory: ({ pageId }: { pageId: string }) => (
    <div data-testid="version-history" data-page-id={pageId} />
  ),
}));

/**
 * useToast()는 Provider 없이도 no-op 컨텍스트 기본값으로 동작하므로 렌더 자체는
 * 성공하지만, 토스트 메시지를 화면에서 조회하려면 실제 Provider가 필요하다.
 */
function renderEditor(ui: ReactElement) {
  return render(<ToastProvider>{ui}</ToastProvider>);
}

/**
 * 실제 앱에서는 EditorShell이 항상 UnsavedChangesProvider로 DocumentEditor를 감싼다
 * (P0-1a). 위 renderEditor는 그 Provider 없이 DocumentEditor 단독 동작을 확인하는
 * 기존 테스트들을 위한 것이고, 이탈 경고 자체를 검증하는 테스트는 이 헬퍼로 실제
 * 구성과 동일하게 감싸서 렌더링한다.
 */
function renderEditorWithGuard(ui: ReactElement) {
  return render(
    <ToastProvider>
      <UnsavedChangesProvider>{ui}</UnsavedChangesProvider>
    </ToastProvider>
  );
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
  initialPublishState: { isPublished: false, viewers: {} },
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
      screen.getByPlaceholderText("예: React, Backend"),
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

  it("게시 설정 버튼은 페이지 이동 대신 오버레이(모달)를 연다", async () => {
    renderEditor(<DocumentEditor {...EDIT_PROPS} />);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "게시 설정" }));

    // 예전엔 /editor/{pageId}/publish로 페이지 이동했는데, 토글 몇 개짜리 설정
    // 때문에 문서 화면을 완전히 벗어나는 게 문맥 이탈이 크다는 지적으로 오버레이로
    // 바꿨다(2026-08-26, "게시 설정 오버레이로 바꿔줘").
    expect(push).not.toHaveBeenCalledWith(
      expect.stringContaining("/publish")
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(
      within(screen.getByRole("dialog")).getByRole("switch", { name: "게시함" })
    ).toBeInTheDocument();
  });

  it("이력 버튼을 누르면 버전 이력 모달이 열리고 올바른 pageId를 넘긴다(P1-2a)", async () => {
    renderEditor(<DocumentEditor {...EDIT_PROPS} />);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "이력" }));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByTestId("version-history")).toHaveAttribute(
      "data-page-id",
      "page-1"
    );
  });

  it("태그 자동완성 후보를 TagInput에 전달한다", async () => {
    renderEditor(
      <DocumentEditor {...EDIT_PROPS} tagSuggestions={["Backend", "React"]} />
    );

    const input = screen.getByPlaceholderText("예: React, Backend");
    await userEvent.type(input, "e");

    expect(screen.getAllByRole("option")).toHaveLength(2);
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

  it("저장하지 않은 변경사항이 있으면 문서함으로 돌아가기를 눌러도 확인해야 이동한다(P0-1a)", async () => {
    renderEditorWithGuard(<DocumentEditor {...EDIT_PROPS} />);

    await userEvent.type(screen.getByLabelText("제목"), " (수정)");

    await userEvent.click(
      screen.getByRole("link", { name: "문서함으로 돌아가기" })
    );

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole("button", { name: "계속 편집" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();

    await userEvent.click(
      screen.getByRole("link", { name: "문서함으로 돌아가기" })
    );
    await userEvent.click(
      screen.getByRole("button", { name: "변경사항 버리고 이동" })
    );
    expect(push).toHaveBeenCalledWith("/editor");
  });

  it("저장에 성공하면 그 뒤로는 확인 없이 문서함으로 돌아갈 수 있다(P0-1a)", async () => {
    stubFetch(() => jsonResponse({ pageId: "page-1", version: 2 }));

    renderEditorWithGuard(<DocumentEditor {...EDIT_PROPS} />);

    await userEvent.type(screen.getByLabelText("제목"), " (수정)");
    await userEvent.click(screen.getByRole("button", { name: "저장" }));
    await screen.findByText("저장되었습니다.");

    await userEvent.click(
      screen.getByRole("link", { name: "문서함으로 돌아가기" })
    );

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});

describe("DocumentEditor — 자동 저장(P0-1b)", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("변경사항이 있으면 1분 뒤 자동으로 저장하고, 태그 요청은 보내지 않는다", async () => {
    const fetchMock = stubFetch(() => jsonResponse({ pageId: "page-1", version: 2 }));

    // 컴포넌트의 자동 저장 setInterval이 진짜 타이머로 등록된 뒤에 가짜 타이머로
    // 바꾸면 그 타이머는 가짜 시계의 통제를 받지 않는다 — 렌더링 전에 먼저 켠다.
    // userEvent는 delay: null로 내부 대기를 없애 가짜 타이머와 함께 동작하게 한다.
    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval"] });
    const user = userEvent.setup({ delay: null });
    renderEditorWithGuard(<DocumentEditor {...EDIT_PROPS} />);
    await user.type(screen.getByLabelText("제목"), " (자동저장 대상)");

    await vi.advanceTimersByTimeAsync(60_000);

    const putCall = fetchMock.mock.calls.find(
      ([url, init]) => url === "/api/editor/documents/page-1" && init?.method === "PUT"
    );
    expect(putCall).toBeDefined();
    expect(
      fetchMock.mock.calls.some(([url]) => url === "/api/editor/documents/page-1/tags")
    ).toBe(false);
  });

  it("변경사항이 없으면 1분이 지나도 자동 저장 요청을 보내지 않는다", async () => {
    const fetchMock = stubFetch(() => jsonResponse({ pageId: "page-1", version: 2 }));

    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval"] });
    renderEditorWithGuard(<DocumentEditor {...EDIT_PROPS} />);

    await vi.advanceTimersByTimeAsync(60_000);

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("자동 저장이 성공하면 로컬 임시 저장본을 지우고 눈에 띄는 토스트를 띄운다", async () => {
    stubFetch(() => jsonResponse({ pageId: "page-1", version: 2 }));

    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval"] });
    const user = userEvent.setup({ delay: null });
    renderEditorWithGuard(<DocumentEditor {...EDIT_PROPS} />);
    await user.type(screen.getByLabelText("제목"), " (수정)");

    await vi.advanceTimersByTimeAsync(60_000);

    expect(readAutosaveSnapshot("page-1")).toBeNull();
    // 풋터의 조용한 상태 표시만으로는 놓치기 쉽다는 실사용 피드백(2026-08-27)으로
    // 성공 시에도 토스트를 띄우도록 바꿨다 — 풋터 상태 표시와 토스트가 같은 문구를
    // 쓰므로(둘 다 "자동 저장됨") getAllByText로 최소 1곳 이상 나타나는지 확인한다.
    expect((await screen.findAllByText("자동 저장됨")).length).toBeGreaterThan(0);
  });

  it("자동 저장이 실패하면 로컬 임시 저장본을 남겨두고 경고 토스트를 띄운다", async () => {
    stubFetch(() =>
      jsonResponse({ error: { code: "UPSTREAM_ERROR", message: "네트워크 오류" } }, 502)
    );

    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval"] });
    const user = userEvent.setup({ delay: null });
    renderEditorWithGuard(<DocumentEditor {...EDIT_PROPS} />);
    await user.type(screen.getByLabelText("제목"), " (수정)");

    await vi.advanceTimersByTimeAsync(60_000);

    expect(readAutosaveSnapshot("page-1")).not.toBeNull();
    expect(await screen.findByText(/자동 저장에 실패했습니다/)).toBeInTheDocument();
  });

  it("서버 최종 수정 시각보다 최신인 임시 저장본이 있으면 복구를 묻고, 복구하면 그 값으로 바뀐다", async () => {
    writeAutosaveSnapshot("page-1", {
      title: "복구된 제목",
      doc: {
        type: "doc",
        content: [{ type: "paragraph", content: [{ type: "text", text: "복구된 본문" }] }],
      },
      tags: [],
    });

    renderEditorWithGuard(
      <DocumentEditor
        {...EDIT_PROPS}
        initialUpdatedAt="2020-01-01T00:00:00.000Z"
      />
    );

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "복구" }));

    expect(screen.getByLabelText("제목")).toHaveValue("복구된 제목");
    expect(readAutosaveSnapshot("page-1")).toBeNull();
  });

  it("서버 최종 수정 시각보다 오래된 임시 저장본은 조용히 지우고 복구를 묻지 않는다", () => {
    writeAutosaveSnapshot("page-1", {
      title: "오래된 임시 저장본",
      doc: { type: "doc", content: [] },
      tags: [],
    });

    const farFuture = new Date(Date.now() + 60_000).toISOString();
    renderEditorWithGuard(
      <DocumentEditor {...EDIT_PROPS} initialUpdatedAt={farFuture} />
    );

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(readAutosaveSnapshot("page-1")).toBeNull();
  });
});
