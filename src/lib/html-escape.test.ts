import { describe, expect, it } from "vitest";
import { escapeHtml } from "./html-escape";

describe("escapeHtml", () => {
  it("&, <, >, \", '를 각각 HTML 엔티티로 바꾼다", () => {
    expect(escapeHtml(`AT&T <b>"bold"</b> it's`)).toBe(
      "AT&amp;T &lt;b&gt;&quot;bold&quot;&lt;/b&gt; it&#39;s"
    );
  });

  it("특수문자가 없는 문자열은 그대로 둔다", () => {
    expect(escapeHtml("홍길동")).toBe("홍길동");
  });

  it("빈 문자열은 빈 문자열을 반환한다", () => {
    expect(escapeHtml("")).toBe("");
  });
});
