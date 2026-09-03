import { describe, expect, it } from "vitest";
import { enforceRateLimit } from "./rate-limit";
import { RateLimitError } from "./editor/errors";

describe("enforceRateLimit", () => {
  it("limit 미만이면 계속 통과시킨다", () => {
    for (let i = 0; i < 5; i++) {
      expect(() => enforceRateLimit("action-a", "user@s-food.com", 5)).not.toThrow();
    }
  });

  it("같은 윈도우 안에서 limit을 넘기면 RateLimitError를 던진다", () => {
    const now = 0;
    for (let i = 0; i < 3; i++) {
      enforceRateLimit("action-b", "user@s-food.com", 3, now);
    }
    expect(() => enforceRateLimit("action-b", "user@s-food.com", 3, now)).toThrow(RateLimitError);
  });

  it("RateLimitError는 다음 윈도우까지 남은 초를 retryAfterSeconds로 담는다", () => {
    const windowStart = 60_000;
    const now = windowStart + 10_000; // 윈도우 시작 10초 후
    for (let i = 0; i < 2; i++) {
      enforceRateLimit("action-c", "user@s-food.com", 2, now);
    }

    try {
      enforceRateLimit("action-c", "user@s-food.com", 2, now);
      throw new Error("RateLimitError가 던져지지 않았다");
    } catch (error) {
      expect(error).toBeInstanceOf(RateLimitError);
      expect((error as RateLimitError).retryAfterSeconds).toBe(50); // 남은 50초
    }
  });

  it("윈도우가 지나면 카운트가 초기화된다", () => {
    const identifier = "user@s-food.com";
    for (let i = 0; i < 3; i++) {
      enforceRateLimit("action-d", identifier, 3, 0);
    }
    expect(() => enforceRateLimit("action-d", identifier, 3, 0)).toThrow(RateLimitError);

    // 다음 분(윈도우)으로 넘어가면 다시 허용된다.
    expect(() => enforceRateLimit("action-d", identifier, 3, 60_000)).not.toThrow();
  });

  it("action이나 identifier가 다르면 서로 독립적으로 집계한다", () => {
    for (let i = 0; i < 3; i++) {
      enforceRateLimit("action-e", "user-1@s-food.com", 3, 0);
    }
    expect(() => enforceRateLimit("action-e", "user-1@s-food.com", 3, 0)).toThrow(RateLimitError);

    // 다른 사용자는 영향받지 않는다.
    expect(() => enforceRateLimit("action-e", "user-2@s-food.com", 3, 0)).not.toThrow();
    // 같은 사용자라도 다른 action은 영향받지 않는다.
    expect(() => enforceRateLimit("action-f", "user-1@s-food.com", 3, 0)).not.toThrow();
  });
});
