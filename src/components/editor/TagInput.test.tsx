import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TagInput } from "./TagInput";

describe("TagInput", () => {
  it("Enter를 누르면 태그가 추가된다", async () => {
    const onChange = vi.fn();
    render(<TagInput value={[]} onChange={onChange} suggestions={[]} />);

    const input = screen.getByPlaceholderText("태그 입력");
    await userEvent.type(input, "React{Enter}");

    expect(onChange).toHaveBeenCalledWith(["React"]);
  });

  it("쉼표를 누르면 태그가 추가된다", async () => {
    const onChange = vi.fn();
    render(<TagInput value={["React"]} onChange={onChange} suggestions={[]} />);

    const input = screen.getByPlaceholderText("태그 입력");
    await userEvent.type(input, "Backend,");

    expect(onChange).toHaveBeenCalledWith(["React", "Backend"]);
  });

  it("이미 존재하는 태그는 중복 추가되지 않는다", async () => {
    const onChange = vi.fn();
    render(<TagInput value={["React"]} onChange={onChange} suggestions={[]} />);

    const input = screen.getByPlaceholderText("태그 입력");
    await userEvent.type(input, "React{Enter}");

    expect(onChange).not.toHaveBeenCalled();
  });

  it("칩의 삭제 버튼을 누르면 태그가 제거된다", async () => {
    const onChange = vi.fn();
    render(<TagInput value={["React", "Backend"]} onChange={onChange} suggestions={[]} />);

    await userEvent.click(screen.getByRole("button", { name: "React 삭제" }));

    expect(onChange).toHaveBeenCalledWith(["Backend"]);
  });

  it("한글 조합 중 Enter는 태그를 추가하지 않는다 (IME composition)", () => {
    const onChange = vi.fn();
    render(<TagInput value={[]} onChange={onChange} suggestions={[]} />);

    const input = screen.getByPlaceholderText("태그 입력");
    fireEvent.change(input, { target: { value: "리액" } });
    // 한글 입력기가 마지막 음절을 조합하는 중에 Enter가 눌린 경우.
    fireEvent.keyDown(input, { key: "Enter", isComposing: true });

    expect(onChange).not.toHaveBeenCalled();

    // 조합이 끝난 뒤 다시 누른 Enter는 정상적으로 태그를 추가한다.
    fireEvent.change(input, { target: { value: "리액트" } });
    fireEvent.keyDown(input, { key: "Enter", isComposing: false });

    expect(onChange).toHaveBeenCalledWith(["리액트"]);
  });

  it("이미 선택된 값과 입력한 초안을 제외한 추천 태그를 제공한다", () => {
    render(
      <TagInput value={["React"]} onChange={vi.fn()} suggestions={["React", "Redux", "Backend"]} />
    );

    const input = screen.getByPlaceholderText("태그 입력") as HTMLInputElement;
    const datalist = document.getElementById(input.getAttribute("list") ?? "");

    expect(datalist).not.toBeNull();
    expect(datalist?.querySelectorAll("option")).toHaveLength(2);
  });
});
