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
function patchBodyOf(fetchMock: ReturnType<typeof stubFetch>, callIndex = 0) {
  const [, init] = fetchMock.mock.calls[callIndex];
  return JSON.parse(init.body as string);
}

beforeEach(() => {
  vi.restoreAllMocks();
  refresh.mockClear();
});

describe("PublishForm", () => {
  it("뷰어 섹션이 뷰어 이름과 저장된 slug/메타 설명을 담아 렌더된다", () => {
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
    expect(screen.getByLabelText("공개 주소 키워드")).toHaveValue("saved-post");
    expect(screen.getByLabelText("메타 설명")).toHaveValue("저장된 설명");
    // 최상위 게시 스위치는 initial.isPublished를 반영한다. Checkbox로 바꿨다가
    // "설정 팝업에 체크박스는 안 맞다"는 피드백으로 다시 Switch로 되돌렸다
    // (2026-08-26) — 대신 토글 즉시 저장되도록 만들어 Switch의 "바로 적용된다"는
    // 신호와 실제 동작을 일치시켰다(아래 자동 저장 테스트 참고).
    expect(screen.getByRole("switch", { name: "게시함" })).toHaveAttribute(
      "aria-checked",
      "true"
    );
  });

  it("두 스위치 모두 안내 문구를 aria-describedby로 연결한다", () => {
    renderForm(
      <PublishForm pageId="doc-1" initial={{ isPublished: false, viewers: {} }} />
    );

    expect(
      screen.getByRole("switch", { name: "게시함" })
    ).toHaveAccessibleDescription();
    expect(
      screen.getByRole("switch", { name: "Tech Blog 노출" })
    ).toHaveAccessibleDescription();
  });

  it("게시함 스위치를 누르면 버튼을 누르지 않아도 곧바로 저장 요청을 보낸다", async () => {
    const fetchMock = stubFetch(jsonResponse({ isPublished: true }));

    renderForm(
      <PublishForm pageId="doc-1" initial={{ isPublished: false, viewers: {} }} />
    );

    await userEvent.click(screen.getByRole("switch", { name: "게시함" }));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe(
      "/api/editor/documents/doc-1/publish"
    );
    expect(fetchMock.mock.calls[0][1].method).toBe("PATCH");
    expect(patchBodyOf(fetchMock)).toEqual({
      isPublished: true,
      // 두 뷰어 옵션 중 하나도 저장된 적 없는 새 문서는 모든 뷰어를 노출 대상으로
      // 시작하는 기존 동작을 유지한다.
      viewers: { "tech-blog": { slug: "", metaDescription: "" } },
    });
    // 저장 성공 시 서버 컴포넌트(사이드바 등)를 갱신한다.
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(await screen.findByText("모든 변경 사항이 저장됨")).toBeInTheDocument();
  });

  it("뷰어 노출 스위치를 끄면 곧바로 그 뷰어가 viewers에서 빠진 상태로 저장된다", async () => {
    const fetchMock = stubFetch(jsonResponse({ isPublished: true }));

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

    await userEvent.click(screen.getByRole("switch", { name: "Tech Blog 노출" }));

    expect(patchBodyOf(fetchMock)).toEqual({
      isPublished: true,
      viewers: {},
    });
  });

  it("slug/메타 설명은 입력을 벗어날 때(blur) 현재 전체 상태를 저장한다", async () => {
    const fetchMock = stubFetch(jsonResponse({ isPublished: false }));

    renderForm(
      <PublishForm pageId="doc-1" initial={{ isPublished: false, viewers: {} }} />
    );

    await userEvent.type(screen.getByLabelText("공개 주소 키워드"), "my-post");
    expect(fetchMock).not.toHaveBeenCalled();
    await userEvent.tab(); // blur

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(patchBodyOf(fetchMock)).toEqual({
      isPublished: false,
      viewers: { "tech-blog": { slug: "my-post", metaDescription: "" } },
    });
  });

  it("저장에 실패하면 토스트로 서버 오류 메시지를 알리고 서버 컴포넌트는 갱신하지 않는다", async () => {
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

    // 이미 게시된 문서를 끄는 시도라 확인 모달을 거쳐야 한다(P0-2).
    await userEvent.click(screen.getByRole("switch", { name: "게시함" }));
    await userEvent.click(screen.getByRole("button", { name: "게시 취소" }));

    expect(
      await screen.findByText("이미 사용 중인 slug입니다.")
    ).toBeInTheDocument();
    expect(refresh).not.toHaveBeenCalled();
  });

  it("이미 게시된 문서의 게시함 스위치를 끄면 곧바로 저장하지 않고 확인 모달을 띄운다(P0-2)", async () => {
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

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
    // 확인 전에는 스위치도 여전히 켜진 상태로 남는다.
    expect(screen.getByRole("switch", { name: "게시함" })).toHaveAttribute(
      "aria-checked",
      "true"
    );

    await userEvent.click(screen.getByRole("button", { name: "게시 취소" }));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(patchBodyOf(fetchMock)).toEqual({
      isPublished: false,
      viewers: { "tech-blog": { slug: "saved-post", metaDescription: "저장된 설명" } },
    });
  });

  it("게시취소 확인 모달에서 취소하면 요청을 보내지 않고 스위치도 켜진 채로 남는다(P0-2)", async () => {
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
    await userEvent.click(screen.getByRole("button", { name: "취소" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.getByRole("switch", { name: "게시함" })).toHaveAttribute(
      "aria-checked",
      "true"
    );
  });

  it("게시함 스위치를 켰다가 저장이 실패하면(예: slug/메타 설명 누락) 스위치를 다시 꺼진 상태로 되돌린다", async () => {
    // 2026-08-28, 실사용 확인 중 발견한 버그: 낙관적으로 먼저 켜놓고 실패해도
    // 되돌리지 않아 서버는 거부했는데 화면은 "켜짐"으로 남아있었다.
    stubFetch(
      jsonResponse(
        {
          error: {
            code: "INVALID_REQUEST",
            message: "뷰어(tech-blog)의 slug와 metaDescription은 필수입니다.",
          },
        },
        400
      )
    );

    renderForm(
      <PublishForm pageId="doc-1" initial={{ isPublished: false, viewers: {} }} />
    );

    await userEvent.click(screen.getByRole("switch", { name: "게시함" }));

    expect(
      await screen.findByText("뷰어(tech-blog)의 slug와 metaDescription은 필수입니다.")
    ).toBeInTheDocument();
    expect(screen.getByRole("switch", { name: "게시함" })).toHaveAttribute(
      "aria-checked",
      "false"
    );
  });

  it("뷰어 노출 스위치를 껐다가 저장이 실패하면 다시 켜진 상태로 되돌린다", async () => {
    stubFetch(jsonResponse({ error: { code: "INVALID_REQUEST", message: "저장 실패" } }, 400));

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

    await userEvent.click(screen.getByRole("switch", { name: "Tech Blog 노출" }));

    expect(await screen.findByText("저장 실패")).toBeInTheDocument();
    expect(screen.getByRole("switch", { name: "Tech Blog 노출" })).toHaveAttribute(
      "aria-checked",
      "true"
    );
  });

  it("아직 게시되지 않은 문서에서 게시함 스위치를 켤 때는 확인 절차 없이 즉시 저장한다(P0-2)", async () => {
    const fetchMock = stubFetch(jsonResponse({ isPublished: true }));

    renderForm(
      <PublishForm pageId="doc-1" initial={{ isPublished: false, viewers: {} }} />
    );

    await userEvent.click(screen.getByRole("switch", { name: "게시함" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
