import { beforeEach, describe, expect, it, vi } from "vitest";
import * as client from "@/lib/confluence/client";
import { NotFoundError } from "./errors";
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

  it("문서가 삭제(휴지통 이동)됐으면(404) NotFoundError를 던진다", async () => {
    vi.spyOn(client, "listLabels").mockRejectedValue(
      new client.ConfluenceApiError(404, "Not Found")
    );

    await expect(getTags("doc-1")).rejects.toThrow(NotFoundError);
  });

  it("404가 아닌 오류는 그대로 전파한다", async () => {
    vi.spyOn(client, "listLabels").mockRejectedValue(
      new client.ConfluenceApiError(502, "Bad Gateway")
    );

    await expect(getTags("doc-1")).rejects.toThrow(client.ConfluenceApiError);
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
    // 반환값은 입력을 되풀이하지 않고 Confluence의 최신 상태(getTags 재조회)를 쓴다
    expect(result).toEqual(["React", "Old"]);
  });

  it("Confluence가 라벨을 소문자로 저장해도 같은 태그를 다시 저장하면 아무 변경이 없다", async () => {
    // Confluence는 라벨을 소문자로 저장하므로, 두 번째 저장 시 current는 ["react"]가 된다
    vi.spyOn(client, "listLabels").mockResolvedValue([{ id: "1", name: "react" }]);
    const addSpy = vi.spyOn(client, "addLabels").mockResolvedValue(undefined);
    const removeSpy = vi.spyOn(client, "removeLabel").mockResolvedValue(undefined);

    const result = await setTags("doc-1", ["React"]);

    expect(addSpy).not.toHaveBeenCalled();
    expect(removeSpy).not.toHaveBeenCalled();
    expect(result).toEqual(["react"]);
  });

  it("추가 요청은 호출자가 준 원래 대소문자로 보낸다", async () => {
    vi.spyOn(client, "listLabels").mockResolvedValue([]);
    const addSpy = vi.spyOn(client, "addLabels").mockResolvedValue(undefined);
    vi.spyOn(client, "removeLabel").mockResolvedValue(undefined);

    await setTags("doc-1", ["React"]);

    expect(addSpy).toHaveBeenCalledWith("doc-1", ["React"]);
  });
});
