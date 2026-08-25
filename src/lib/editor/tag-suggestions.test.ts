import { beforeEach, describe, expect, it, vi } from "vitest";
import * as documents from "./documents";
import * as folder from "./folder";
import { listTagSuggestions } from "./tag-suggestions";

function documentSummary(pageId: string, tags: string[]) {
  return {
    pageId,
    title: pageId,
    updatedAt: "2026-08-24T00:00:00Z",
    isPublished: false,
    tags,
  };
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("listTagSuggestions", () => {
  it("문서들의 태그를 중복 없이 모아 정렬해서 돌려준다", async () => {
    vi.spyOn(folder, "findPersonalFolder").mockResolvedValue({
      accountFolderId: "account-1",
      draftFolderId: "draft-1",
      publishedFolderId: "published-1",
      spaceKey: "SPACE",
    });
    const listSpy = vi
      .spyOn(documents, "listDocuments")
      .mockResolvedValue([
        documentSummary("doc-1", ["React", "Backend"]),
        documentSummary("doc-2", ["Backend", "Infra"]),
      ]);

    expect(await listTagSuggestions("pioneer@s-food.com")).toEqual([
      "Backend",
      "Infra",
      "React",
    ]);
    expect(listSpy).toHaveBeenCalledWith("draft-1", "published-1");
  });

  it("개인 폴더가 없으면 빈 목록을 돌려준다", async () => {
    vi.spyOn(folder, "findPersonalFolder").mockResolvedValue(null);
    const listSpy = vi.spyOn(documents, "listDocuments");

    expect(await listTagSuggestions("pioneer@s-food.com")).toEqual([]);
    expect(listSpy).not.toHaveBeenCalled();
  });

  // 자동완성 조회 실패가 편집 화면 전체를 500으로 만들면 안 되고, 무엇보다
  // /editor/[pageId]의 NotFoundError/UnauthorizedError → notFound() 매핑에 끼어들어
  // 엉뚱한 404를 만들면 안 된다. 그래서 이 함수는 어떤 경우에도 던지지 않는다.
  it("태그 목록 조회가 실패해도 던지지 않고 빈 목록으로 물러난다", async () => {
    vi.spyOn(folder, "findPersonalFolder").mockRejectedValue(
      new Error("Confluence 연동 실패")
    );
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(
      listTagSuggestions("pioneer@s-food.com")
    ).resolves.toEqual([]);
    expect(errorSpy).toHaveBeenCalled();
  });

  it("문서 목록 조회가 실패해도 던지지 않는다", async () => {
    vi.spyOn(folder, "findPersonalFolder").mockResolvedValue({
      accountFolderId: "account-1",
      draftFolderId: "draft-1",
      publishedFolderId: "published-1",
      spaceKey: "SPACE",
    });
    vi.spyOn(documents, "listDocuments").mockRejectedValue(
      new Error("Confluence 연동 실패")
    );
    vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(
      listTagSuggestions("pioneer@s-food.com")
    ).resolves.toEqual([]);
  });
});
