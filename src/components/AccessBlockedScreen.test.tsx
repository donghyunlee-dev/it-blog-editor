import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AccessBlockedScreen } from "./AccessBlockedScreen";

describe("AccessBlockedScreen", () => {
  it("차단 안내와 계정 이메일, 로그아웃 진입점을 보여준다", () => {
    render(<AccessBlockedScreen email="user@s-food.com" onLogout={() => {}} />);

    expect(screen.getByText("접속이 제한되었어요")).toBeInTheDocument();
    expect(screen.getByText("user@s-food.com")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "로그아웃" })).toBeInTheDocument();
  });

  it("로그아웃 버튼을 누르면 onLogout 폼 액션이 호출된다", async () => {
    const user = userEvent.setup();
    const onLogout = vi.fn();

    render(<AccessBlockedScreen email="user@s-food.com" onLogout={onLogout} />);
    await user.click(screen.getByRole("button", { name: "로그아웃" }));

    expect(onLogout).toHaveBeenCalled();
  });
});
