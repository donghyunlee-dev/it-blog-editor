import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  UnsavedChangesProvider,
  useUnsavedChanges,
} from "./UnsavedChangesContext";

const { push } = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

beforeEach(() => {
  push.mockClear();
});

/** guardNavigate/setDirty를 화면에서 직접 조작할 수 있게 노출하는 테스트용 컴포넌트. */
function Harness() {
  const { isDirty, setDirty, guardNavigate } = useUnsavedChanges();
  return (
    <div>
      <p data-testid="dirty-state">{isDirty ? "dirty" : "clean"}</p>
      <button type="button" onClick={() => setDirty(true)}>
        변경함
      </button>
      <button type="button" onClick={() => setDirty(false)}>
        저장됨
      </button>
      {/* 실제 페이지 이동이 목적이 아니라 guardNavigate가 받는 인터페이스(preventDefault를
          가진 이벤트)를 next/link 없이 최소 단위로 검증하기 위한 순수 <a>다 — next/link를
          쓰면 AppRouterContext가 필요해져 이 파일이 검증하려는 Context 로직 자체와
          무관한 라우터 마운트 문제가 섞인다. */}
      {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
      <a
        href="/editor/other"
        onClick={(event) => guardNavigate(event, "/editor/other")}
      >
        다른 문서로
      </a>
    </div>
  );
}

describe("useUnsavedChanges", () => {
  it("Provider 없이 쓰이면 no-op으로 동작해 이동을 막지 않는다", async () => {
    const onClick = vi.fn((event: React.MouseEvent) => event.preventDefault());
    function Standalone() {
      const { guardNavigate } = useUnsavedChanges();
      return (
        <a href="/x" onClick={(event) => { onClick(event); guardNavigate(event, "/x"); }}>
          이동
        </a>
      );
    }
    render(<Standalone />);

    // preventDefault를 호출하는 건 테스트 harness의 onClick뿐이고, guardNavigate 자체는
    // 아무 것도 하지 않는다는 것을 확인한다(예외를 던지지 않고 렌더링된다는 사실 자체가
    // no-op 기본값이 살아있다는 증거).
    await userEvent.click(screen.getByRole("link", { name: "이동" }));
    expect(onClick).toHaveBeenCalled();
  });

  it("dirty 상태에서만 beforeunload를 막는다", async () => {
    render(
      <UnsavedChangesProvider>
        <Harness />
      </UnsavedChangesProvider>
    );

    function dispatchBeforeUnload() {
      const event = new Event("beforeunload", { cancelable: true });
      window.dispatchEvent(event);
      return event.defaultPrevented;
    }

    expect(dispatchBeforeUnload()).toBe(false);

    await userEvent.click(screen.getByRole("button", { name: "변경함" }));
    expect(dispatchBeforeUnload()).toBe(true);

    await userEvent.click(screen.getByRole("button", { name: "저장됨" }));
    expect(dispatchBeforeUnload()).toBe(false);
  });

  it("guardNavigate는 dirty일 때만 이동을 막고 확인 Modal을 띄운다", async () => {
    render(
      <UnsavedChangesProvider>
        <Harness />
      </UnsavedChangesProvider>
    );

    // 변경 전: 바로 이동(막히지 않음) — Modal이 뜨지 않는다.
    await userEvent.click(screen.getByRole("link", { name: "다른 문서로" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "변경함" }));
    expect(screen.getByTestId("dirty-state")).toHaveTextContent("dirty");

    await userEvent.click(screen.getByRole("link", { name: "다른 문서로" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole("button", { name: "계속 편집" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole("link", { name: "다른 문서로" }));
    await userEvent.click(
      screen.getByRole("button", { name: "변경사항 버리고 이동" })
    );
    expect(push).toHaveBeenCalledWith("/editor/other");
    expect(screen.getByTestId("dirty-state")).toHaveTextContent("clean");
  });
});
