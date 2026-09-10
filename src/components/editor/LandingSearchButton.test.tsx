import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LandingSearchButton } from "./LandingSearchButton";
import { GlobalSearchProvider } from "./GlobalSearchContext";

describe("LandingSearchButton", () => {
  it("Provider 없이 렌더링해도 클릭 시 에러 없이 아무 일도 하지 않는다", async () => {
    const user = userEvent.setup();
    render(<LandingSearchButton />);

    await user.click(screen.getByRole("button", { name: "전체 검색 (Ctrl+K)" }));

    expect(screen.getByText("문서 검색...")).toBeInTheDocument();
  });

  it("클릭하면 GlobalSearchProvider의 triggerSearch를 호출한다(P8-4)", async () => {
    const triggerSearch = vi.fn();
    const user = userEvent.setup();
    render(
      <GlobalSearchProvider value={{ triggerSearch }}>
        <LandingSearchButton />
      </GlobalSearchProvider>
    );

    await user.click(screen.getByRole("button", { name: "전체 검색 (Ctrl+K)" }));

    expect(triggerSearch).toHaveBeenCalledTimes(1);
  });

  it("Enter 키로도 열 수 있다(수용 기준 — 버튼 포커스 후 Enter)", async () => {
    const triggerSearch = vi.fn();
    const user = userEvent.setup();
    render(
      <GlobalSearchProvider value={{ triggerSearch }}>
        <LandingSearchButton />
      </GlobalSearchProvider>
    );

    screen.getByRole("button", { name: "전체 검색 (Ctrl+K)" }).focus();
    await user.keyboard("{Enter}");

    expect(triggerSearch).toHaveBeenCalledTimes(1);
  });
});
