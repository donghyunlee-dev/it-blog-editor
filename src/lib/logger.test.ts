import { beforeEach, describe, expect, it, vi } from "vitest";
import { logger, serializeError } from "./logger";

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("logger", () => {
  it("error()는 console.error에 level/message/timestamp를 담은 JSON 한 줄을 남긴다", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    logger.error("문제 발생");

    expect(spy).toHaveBeenCalledTimes(1);
    const entry = JSON.parse(spy.mock.calls[0][0] as string);
    expect(entry.level).toBe("error");
    expect(entry.message).toBe("문제 발생");
    expect(typeof entry.timestamp).toBe("string");
    expect(Number.isNaN(new Date(entry.timestamp).getTime())).toBe(false);
    expect(entry.context).toBeUndefined();
  });

  it("context를 넘기면 함께 직렬화된다", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    logger.error("문제 발생", { pageId: "doc-1", count: 3 });

    const entry = JSON.parse(spy.mock.calls[0][0] as string);
    expect(entry.context).toEqual({ pageId: "doc-1", count: 3 });
  });

  it("warn()은 console.warn을, info()는 console.log를 쓴다(레벨별로 올바른 메서드)", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    logger.warn("경고");
    logger.info("정보");

    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(JSON.parse(warnSpy.mock.calls[0][0] as string).level).toBe("warn");
    expect(logSpy).toHaveBeenCalledTimes(1);
    expect(JSON.parse(logSpy.mock.calls[0][0] as string).level).toBe("info");
  });
});

describe("serializeError", () => {
  it("Error의 message/stack을 평범한 객체 필드로 옮긴다(JSON.stringify(error)는 기본적으로 {}만 남기는 문제 회피)", () => {
    const error = new Error("실패");

    const serialized = serializeError(error);

    expect(serialized.name).toBe("Error");
    expect(serialized.message).toBe("실패");
    expect(typeof serialized.stack).toBe("string");
    // 직렬화 결과가 실제로 JSON.stringify를 통과해 내용을 유지하는지까지 확인한다.
    expect(JSON.parse(JSON.stringify(serialized)).message).toBe("실패");
  });

  it("Error에 덧붙은 커스텀 속성(예: ConfluenceApiError.status)도 함께 옮긴다", () => {
    class ConfluenceApiError extends Error {
      status: number;
      constructor(status: number, message: string) {
        super(message);
        this.name = "ConfluenceApiError";
        this.status = status;
      }
    }

    const serialized = serializeError(new ConfluenceApiError(502, "Bad Gateway"));

    expect(serialized).toMatchObject({
      name: "ConfluenceApiError",
      message: "Bad Gateway",
      status: 502,
    });
  });

  it("Error가 아닌 값은 문자열로 감싼다", () => {
    expect(serializeError("그냥 문자열")).toEqual({ value: "그냥 문자열" });
    expect(serializeError(undefined)).toEqual({ value: "undefined" });
  });
});
