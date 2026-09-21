import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TagInput } from "./TagInput";

/**
 * P17-16부터 태그 입력창은 상시 노출되지 않고 "태그 추가" 트리거(Popover)를 눌러야
 * 나타난다 — 입력 관련 동작을 검증하는 테스트는 먼저 이 트리거를 열어야 한다.
 */
async function openTagPopover() {
  await userEvent.click(screen.getByRole("button", { name: "태그 추가" }));
}

describe("TagInput", () => {
  it("Enter를 누르면 태그가 추가된다", async () => {
    const onChange = vi.fn();
    render(<TagInput value={[]} onChange={onChange} suggestions={[]} />);
    await openTagPopover();

    const input = screen.getByRole("combobox", { name: "태그" });
    await userEvent.type(input, "React{Enter}");

    expect(onChange).toHaveBeenCalledWith(["React"]);
  });

  it("쉼표를 누르면 태그가 추가된다", async () => {
    const onChange = vi.fn();
    render(<TagInput value={["React"]} onChange={onChange} suggestions={[]} />);
    await openTagPopover();

    const input = screen.getByRole("combobox", { name: "태그" });
    await userEvent.type(input, "Backend,");

    expect(onChange).toHaveBeenCalledWith(["React", "Backend"]);
  });

  it("이미 존재하는 태그는 중복 추가되지 않는다", async () => {
    const onChange = vi.fn();
    render(<TagInput value={["React"]} onChange={onChange} suggestions={[]} />);
    await openTagPopover();

    const input = screen.getByRole("combobox", { name: "태그" });
    await userEvent.type(input, "React{Enter}");

    expect(onChange).not.toHaveBeenCalled();
  });

  it("칩의 삭제 버튼을 누르면 태그가 제거된다(팝오버를 열지 않아도 칩은 항상 보인다)", async () => {
    const onChange = vi.fn();
    render(<TagInput value={["React", "Backend"]} onChange={onChange} suggestions={[]} />);

    await userEvent.click(screen.getByRole("button", { name: "React 삭제" }));

    expect(onChange).toHaveBeenCalledWith(["Backend"]);
  });

  it("한글 조합 중 Enter는 태그를 추가하지 않는다 (IME composition)", async () => {
    const onChange = vi.fn();
    render(<TagInput value={[]} onChange={onChange} suggestions={[]} />);
    await openTagPopover();

    const input = screen.getByRole("combobox", { name: "태그" });
    fireEvent.change(input, { target: { value: "리액" } });
    // 한글 입력기가 마지막 음절을 조합하는 중에 Enter가 눌린 경우.
    fireEvent.keyDown(input, { key: "Enter", isComposing: true });

    expect(onChange).not.toHaveBeenCalled();

    // 조합이 끝난 뒤 다시 누른 Enter는 정상적으로 태그를 추가한다.
    fireEvent.change(input, { target: { value: "리액트" } });
    fireEvent.keyDown(input, { key: "Enter", isComposing: false });

    expect(onChange).toHaveBeenCalledWith(["리액트"]);
  });

  it("팝오버를 열면 이미 선택된 값을 제외한 추천 태그를 곧바로(입력 없이도) 보여준다", async () => {
    render(
      <TagInput value={["React"]} onChange={vi.fn()} suggestions={["React", "Redux", "Backend"]} />
    );

    await openTagPopover();

    expect(screen.getByRole("listbox")).toBeInTheDocument();
    expect(screen.getAllByRole("option")).toHaveLength(2);
    expect(screen.getByRole("option", { name: "Redux" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Backend" })).toBeInTheDocument();
  });

  it("입력한 글자로 추천 태그를 좁힌다", async () => {
    render(
      <TagInput value={[]} onChange={vi.fn()} suggestions={["Redux", "Backend"]} />
    );
    await openTagPopover();

    const input = screen.getByRole("combobox", { name: "태그" });
    await userEvent.type(input, "red");

    expect(screen.getAllByRole("option")).toHaveLength(1);
    expect(screen.getByRole("option", { name: "Redux" })).toBeInTheDocument();
  });

  it("추천 태그를 클릭하면 태그로 추가된다", async () => {
    const onChange = vi.fn();
    render(
      <TagInput value={[]} onChange={onChange} suggestions={["Redux", "Backend"]} />
    );
    await openTagPopover();

    const input = screen.getByRole("combobox", { name: "태그" });
    await userEvent.type(input, "red");
    await userEvent.click(screen.getByRole("option", { name: "Redux" }));

    expect(onChange).toHaveBeenCalledWith(["Redux"]);
  });

  it("추천 태그가 없으면(빈 suggestions) 목록 없이 입력창만 보인다", async () => {
    render(<TagInput value={[]} onChange={vi.fn()} suggestions={[]} />);
    await openTagPopover();

    expect(screen.getByRole("combobox", { name: "태그" })).toBeInTheDocument();
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });
});
