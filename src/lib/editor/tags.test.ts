import { beforeEach, describe, expect, it, vi } from "vitest";
import * as client from "@/lib/confluence/client";
import { getTags, setTags } from "./tags";

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("getTags", () => {
  it("페이지 라벨 이름 목록을 반환한다", async () => {
    vi.spyOn(client, "listLabels").mockResolvedValue([
      { id: "1", name: "React" },
      { id: "2", name: "Backend" },
    ]);

    const tags = await getTags("doc-1");

    expect(tags).toEqual(["React", "Backend"]);
  });
});

describe("setTags", () => {
  it("새로 추가된 태그만 추가하고, 빠진 태그만 삭제한다", async () => {
    vi.spyOn(client, "listLabels").mockResolvedValue([
      { id: "1", name: "React" },
      { id: "2", name: "Old" },
    ]);
    const addSpy = vi.spyOn(client, "addLabels").mockResolvedValue(undefined);
    const removeSpy = vi.spyOn(client, "removeLabel").mockResolvedValue(undefined);

    const result = await setTags("doc-1", ["React", "Backend"]);

    expect(addSpy).toHaveBeenCalledWith("doc-1", ["Backend"]);
    expect(removeSpy).toHaveBeenCalledWith("doc-1", "Old");
    expect(result).toEqual(["React", "Backend"]);
  });
});
