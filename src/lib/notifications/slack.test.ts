import { beforeEach, describe, expect, it, vi } from "vitest";
import { sendSlackAlert } from "./slack";

beforeEach(() => {
  process.env.SLACK_WEBHOOK_URL = "https://hooks.slack.test/services/xxx";
  vi.restoreAllMocks();
});

describe("sendSlackAlert", () => {
  it("정상 응답이면 재시도 없이 바로 성공한다", async () => {
    const fetchMock = vi.fn(
      async (_url: string, _init?: RequestInit) => new Response(null, { status: 200 })
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(sendSlackAlert("테스트 메시지")).resolves.toBeUndefined();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://hooks.slack.test/services/xxx");
    expect(JSON.parse(init!.body as string)).toEqual({ text: "테스트 메시지" });
  });

  it("500을 두 번 받은 뒤 성공하면 재시도로 통과한다", async () => {
    vi.useFakeTimers();
    try {
      let call = 0;
      const fetchMock = vi.fn(async () => {
        call += 1;
        if (call < 3) {
          return new Response("boom", { status: 500, statusText: "Internal Server Error" });
        }
        return new Response(null, { status: 200 });
      });
      vi.stubGlobal("fetch", fetchMock);

      const promise = sendSlackAlert("테스트");
      await vi.runAllTimersAsync();
      await promise;

      expect(fetchMock).toHaveBeenCalledTimes(3);
    } finally {
      vi.useRealTimers();
    }
  });

  it("계속 503이면 최대 재시도(3회)를 소진한 뒤 예외를 던진다", async () => {
    vi.useFakeTimers();
    try {
      const fetchMock = vi.fn(
        async () => new Response("unavailable", { status: 503, statusText: "Service Unavailable" })
      );
      vi.stubGlobal("fetch", fetchMock);

      const promise = sendSlackAlert("테스트");
      const assertion = expect(promise).rejects.toThrow("Slack 알림 전송 실패");
      await vi.runAllTimersAsync();
      await assertion;

      expect(fetchMock).toHaveBeenCalledTimes(4); // 최초 1회 + 재시도 3회
    } finally {
      vi.useRealTimers();
    }
  });

  it("429 응답의 Retry-After 헤더(초) 값만큼 대기한 뒤에만 재시도한다", async () => {
    vi.useFakeTimers();
    try {
      let call = 0;
      const fetchMock = vi.fn(async () => {
        call += 1;
        if (call === 1) {
          return new Response("rate limited", {
            status: 429,
            statusText: "Too Many Requests",
            headers: { "Retry-After": "5" },
          });
        }
        return new Response(null, { status: 200 });
      });
      vi.stubGlobal("fetch", fetchMock);

      const promise = sendSlackAlert("테스트");
      await vi.advanceTimersByTimeAsync(4000);
      expect(fetchMock).toHaveBeenCalledTimes(1); // 아직 5초가 다 지나지 않음

      await vi.advanceTimersByTimeAsync(1000);
      await promise;

      expect(fetchMock).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it("400처럼 재시도해도 성공할 수 없는 4xx는 즉시 실패한다(재시도 없음)", async () => {
    const fetchMock = vi.fn(
      async () => new Response("bad request", { status: 400, statusText: "Bad Request" })
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(sendSlackAlert("테스트")).rejects.toThrow("Slack 알림 전송 실패");

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("fetch 자체가 던지는 네트워크 오류도 재시도 대상이다", async () => {
    vi.useFakeTimers();
    try {
      let call = 0;
      const fetchMock = vi.fn(async () => {
        call += 1;
        if (call < 2) {
          throw new Error("network error");
        }
        return new Response(null, { status: 200 });
      });
      vi.stubGlobal("fetch", fetchMock);

      const promise = sendSlackAlert("테스트");
      await vi.runAllTimersAsync();
      await promise;

      expect(fetchMock).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });
});
