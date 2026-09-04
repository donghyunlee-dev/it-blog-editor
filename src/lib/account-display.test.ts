import { describe, expect, it } from "vitest";
import { formatAccountLabel } from "./account-display";

describe("formatAccountLabel", () => {
  it("이름이 있으면 '이름(이메일)' 형식으로 반환한다", () => {
    expect(formatAccountLabel("user@s-food.com", "홍길동")).toBe("홍길동(user@s-food.com)");
  });

  it("이름이 없으면 이메일만 반환한다(하위 호환)", () => {
    expect(formatAccountLabel("user@s-food.com")).toBe("user@s-food.com");
    expect(formatAccountLabel("user@s-food.com", "")).toBe("user@s-food.com");
    expect(formatAccountLabel("user@s-food.com", "   ")).toBe("user@s-food.com");
  });
});
