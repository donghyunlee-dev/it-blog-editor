import type { ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider } from "@sfood/ui";
import { PublishForm } from "./PublishForm";

// next/navigation의 useRouter는 AppRouterContext 없이 호출하면 던지므로 직접 모킹한다.
// 게시 설정을 바꾸면 사이드바/문서 헤더의 게시 상태 표시가 함께 바뀌어야 하는데
// layout.tsx는 클라이언트 네비게이션에서 다시 실행되지 않으므로, 저장 성공 경로가
// router.refresh()를 호출하는지도 여기서 검증한다.
const { refresh } = vi.hoisted(() => ({ refresh: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}));

/**
 * useToast()는 Provider 없이도 no-op 컨텍스트 기본값으로 동작하므로 렌더 자체는
 * 성공하지만, 토스트 메시지를 화면에서 조회하려면 실제 Provider가 필요하다.
 */
function renderForm(ui: ReactElement) {
  return render(<ToastProvider>{ui}</ToastProvider>);
}

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status });

/**
 * fetch 대역을 설치하고 호출 기록용 mock을 돌려준다. 호출 인자 타입을 명시해야
 * mock.calls가 빈 튜플([])로 추론되지 않고 url/init을 꺼내 검증할 수 있다.
 */
function stubFetch(response: Response | (() => Response)) {
  const fetchMock = vi.fn<(url: string, init: RequestInit) => Promise<Response>>(
    async () => (typeof response === "function" ? response() : response)
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

/** PATCH 요청 본문을 파싱해 돌려준다(키 순서에 의존하지 않도록 문자열 비교를 피한다). */
function patchBodyOf(fetchMock: ReturnType<typeof stubFetch>) {
  const [, init] = fetchMock.mock.calls[0];
  return JSON.parse(init.body as string);
}

beforeEach(() => {
  vi.restoreAllMocks();
  refresh.mockClear();
});

describe("PublishForm", () => {
  it("뷰어 카드가 뷰어 이름과 저장된 slug/메타 설명을 담아 렌더된다", () => {
    renderForm(
      <PublishForm
        pageId="doc-1"
        initial={{
          isPublished: true,
          viewers: {
            "tech-blog": { slug: "saved-post", metaDescription: "저장된 설명" },
          },
        }}
      />
    );

    expect(screen.getByText("Tech Blog")).toBeInTheDocument();
    expect(screen.getByLabelText("Tech Blog 공개 경로(slug)")).toHaveValue(
      "saved-post"
    );
    expect(screen.getByLabelText("Tech Blog 메타 설명")).toHaveValue(
      "저장된 설명"
    );
    // 최상위 게시 토글은 initial.isPublished를 반영한다.
    expect(screen.getByRole("switch", { name: "게시함" })).toHaveAttribute(
      "aria-checked",
      "true"
    );
  });

  it("뷰어 카드마다 slug/메타 설명을 입력할 수 있고, 저장 시 viewers 구조로 전송한다", async () => {
    const fetchMock = stubFetch(jsonResponse({ isPublished: false }));

    renderForm(
      <PublishForm pageId="doc-1" initial={{ isPublished: false, viewers: {} }} />
    );

    await userEvent.type(
      screen.getByLabelText("Tech Blog 공개 경로(slug)"),
      "my-post"
    );
    await userEvent.type(screen.getByLabelText("Tech Blog 메타 설명"), "설명");
    await userEvent.click(screen.getByRole("button", { name: "게시 설정 저장" }));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe(
      "/api/editor/documents/doc-1/publish"
    );
    expect(fetchMock.mock.calls[0][1].method).toBe("PATCH");
    expect(patchBodyOf(fetchMock)).toEqual({
      isPublished: false,
      viewers: { "tech-blog": { slug: "my-post", metaDescription: "설명" } },
    });
  });

  it("게시함을 껐다가 저장해도 노출 중인 뷰어 설정은 그대로 전송한다", async () => {
    const fetchMock = stubFetch(jsonResponse({ isPublished: false }));

    renderForm(
      <PublishForm
        pageId="doc-1"
        initial={{
          isPublished: true,
          viewers: {
            "tech-blog": { slug: "saved-post", metaDescription: "저장된 설명" },
          },
        }}
      />
    );

    await userEvent.click(screen.getByRole("switch", { name: "게시함" }));
    await userEvent.click(screen.getByRole("button", { name: "게시 설정 저장" }));

    // isPublished만 false로 바뀌고, viewers는 노출 중인 뷰어 기준으로 유지된다.
    expect(patchBodyOf(fetchMock)).toEqual({
      isPublished: false,
      viewers: {
        "tech-blog": { slug: "saved-post", metaDescription: "저장된 설명" },
      },
    });
  });

  it("뷰어 노출을 끄면 해당 뷰어가 viewers에서 빠진다", async () => {
    const fetchMock = stubFetch(jsonResponse({ isPublished: false }));

    renderForm(
      <PublishForm
        pageId="doc-1"
        initial={{
          isPublished: true,
          viewers: {
            "tech-blog": { slug: "saved-post", metaDescription: "저장된 설명" },
          },
        }}
      />
    );

    await userEvent.click(
      screen.getByRole("switch", { name: "Tech Blog 노출" })
    );
    await userEvent.click(screen.getByRole("button", { name: "게시 설정 저장" }));

    expect(patchBodyOf(fetchMock)).toEqual({
      isPublished: true,
      viewers: {},
    });
  });

  it("저장에 성공하면 성공 토스트를 띄우고 router.refresh()로 서버 컴포넌트를 갱신한다", async () => {
    stubFetch(jsonResponse({ isPublished: true, publishedAt: "2026-08-24" }));

    renderForm(
      <PublishForm
        pageId="doc-1"
        initial={{
          isPublished: true,
          viewers: {
            "tech-blog": { slug: "saved-post", metaDescription: "저장된 설명" },
          },
        }}
      />
    );

    await userEvent.click(screen.getByRole("button", { name: "게시 설정 저장" }));

    expect(
      await screen.findByText("게시 설정이 저장되었습니다.")
    ).toBeInTheDocument();
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("저장에 실패하면 인라인 텍스트가 아니라 토스트로 서버 오류 메시지를 알린다", async () => {
    stubFetch(
      jsonResponse(
        { error: { code: "CONFLICT", message: "이미 사용 중인 slug입니다." } },
        409
      )
    );

    renderForm(
      <PublishForm
        pageId="doc-1"
        initial={{
          isPublished: true,
          viewers: {
            "tech-blog": { slug: "saved-post", metaDescription: "저장된 설명" },
          },
        }}
      />
    );

    await userEvent.click(screen.getByRole("button", { name: "게시 설정 저장" }));

    expect(
      await screen.findByText("이미 사용 중인 slug입니다.")
    ).toBeInTheDocument();
    // 실패했으므로 성공 토스트도, 서버 컴포넌트 갱신도 없어야 한다.
    expect(
      screen.queryByText("게시 설정이 저장되었습니다.")
    ).not.toBeInTheDocument();
    expect(refresh).not.toHaveBeenCalled();
    // 인라인 에러 문단(.error-text)은 더 이상 쓰지 않는다.
    expect(document.querySelector(".error-text")).toBeNull();
  });
});
