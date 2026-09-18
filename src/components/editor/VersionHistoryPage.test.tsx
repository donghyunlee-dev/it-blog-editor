import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { VersionHistoryPage } from "./VersionHistoryPage";

describe("VersionHistoryPage", () => {
  it("버전 목록을 최신순으로 보여주고 현재 버전을 표시한다", () => {
    render(
      <VersionHistoryPage
        initialVersions={[
          { number: 2, createdAt: "2026-08-27T10:00:00.000Z", isCurrent: true },
          { number: 1, createdAt: "2026-08-20T09:00:00.000Z", isCurrent: false },
        ]}
      />
    );

    expect(screen.getByText("버전 2")).toBeInTheDocument();
    expect(screen.getByText("버전 1")).toBeInTheDocument();
    expect(screen.getByText("현재 버전")).toBeInTheDocument();
  });

  it("버전이 없으면 안내 문구를 보여준다", () => {
    render(<VersionHistoryPage initialVersions={[]} />);

    expect(screen.getByText("버전 이력이 없습니다.")).toBeInTheDocument();
  });
});
