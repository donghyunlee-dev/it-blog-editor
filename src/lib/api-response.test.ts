import { beforeEach, describe, expect, it, vi } from "vitest";
import * as slack from "@/lib/notifications/slack";
import { toErrorResponse } from "./api-response";
import {
  ConflictError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from "./editor/errors";

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("toErrorResponse — 도메인 에러", () => {
  it("UnauthorizedError를 401 UNAUTHORIZED로 매핑한다", async () => {
    const response = await toErrorResponse(new UnauthorizedError("로그인이 필요합니다."));
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      error: { code: "UNAUTHORIZED", message: "로그인이 필요합니다." },
    });
  });

  it("ValidationError를 400 INVALID_REQUEST로 매핑한다", async () => {
    const response = await toErrorResponse(new ValidationError("제목이 누락되었습니다."));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: { code: "INVALID_REQUEST", message: "제목이 누락되었습니다." },
    });
  });

  it("NotFoundError를 404 NOT_FOUND로 매핑한다", async () => {
    const response = await toErrorResponse(new NotFoundError("문서를 찾을 수 없습니다."));
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({
      error: { code: "NOT_FOUND", message: "문서를 찾을 수 없습니다." },
    });
  });

  it("ConflictError를 409 CONFLICT로 매핑한다", async () => {
    const response = await toErrorResponse(new ConflictError("이미 사용 중인 slug입니다."));
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      error: { code: "CONFLICT", message: "이미 사용 중인 slug입니다." },
    });
  });
});

describe("toErrorResponse — 분류되지 않은 오류(P0-6 새니타이즈)", () => {
  it("원문 메시지를 클라이언트에 노출하지 않고 고정 문구를 돌려준다", async () => {
    const sensitive = new Error(
      "Confluence API 호출 실패: 500 Internal Server Error - {\"internalHost\":\"confluence-prod-7.internal\"}"
    );

    const response = await toErrorResponse(sensitive);

    expect(response.status).toBe(502);
    const body = await response.json();
    expect(body.error.code).toBe("UPSTREAM_ERROR");
    expect(body.error.message).not.toContain("internalHost");
    expect(body.error.message).not.toContain("confluence-prod-7.internal");
    expect(body.error.message).toBe(
      "일시적인 오류로 요청을 처리하지 못했습니다. 잠시 후 다시 시도해주세요."
    );
  });

  it("원문 상세는 서버 로그(console.error)에 남긴다", async () => {
    vi.spyOn(slack, "sendSlackAlert").mockResolvedValue(undefined);
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await toErrorResponse(new Error("원본 상세 메시지"));

    expect(
      consoleSpy.mock.calls.some((call) =>
        call.some((arg) => typeof arg === "string" && arg.includes("원본 상세 메시지"))
      )
    ).toBe(true);
  });

  it("Slack 알림에는 지금처럼 원문 상세를 그대로 보낸다", async () => {
    const alertSpy = vi.spyOn(slack, "sendSlackAlert").mockResolvedValue(undefined);
    vi.spyOn(console, "error").mockImplementation(() => {});

    await toErrorResponse(new Error("원본 상세 메시지"));

    expect(alertSpy).toHaveBeenCalledWith(
      expect.stringContaining("원본 상세 메시지")
    );
  });

  it("문자열이 아닌 값을 던져도 500류로 안전하게 처리한다", async () => {
    vi.spyOn(slack, "sendSlackAlert").mockResolvedValue(undefined);
    vi.spyOn(console, "error").mockImplementation(() => {});

    const response = await toErrorResponse("문자열 그대로 던진 오류");

    expect(response.status).toBe(502);
    const body = await response.json();
    expect(body.error.message).toBe(
      "일시적인 오류로 요청을 처리하지 못했습니다. 잠시 후 다시 시도해주세요."
    );
  });
});
