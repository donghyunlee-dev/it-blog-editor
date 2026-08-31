import { beforeEach, describe, expect, it, vi } from "vitest";
import * as client from "@/lib/confluence/client";
import * as access from "./access";
import { getPublishState, setPublishState } from "./publish";
import { ValidationError } from "./errors";

/** setPublishState는 게시 시 내부 고유키(publicSlug 계산용)를 얻기 위해 getPage를 조회한다. */
function stubCurrentPage() {
  return vi.spyOn(client, "getPage").mockResolvedValue({
    id: "doc-1",
    status: "current",
    title: "제목",
    spaceId: "space-1",
    parentId: "account-1",
    version: { number: 1, createdAt: "" },
  });
}

function stubPublishProperty(publishMetadataValue: unknown) {
  return vi.spyOn(client, "getPageProperty").mockResolvedValue(
    publishMetadataValue
      ? { id: "prop-1", key: "publishMetadata", value: publishMetadataValue, version: { number: 1 } }
      : null
  );
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("getPublishState", () => {
  it("설정이 없으면 기본값(미게시, 빈 viewers)을 반환한다", async () => {
    vi.spyOn(client, "getPageProperty").mockResolvedValue(null);

    const state = await getPublishState("doc-1");

    expect(state).toEqual({ isPublished: false, viewers: {} });
  });
});

describe("setPublishState", () => {
  it("게시 시 뷰어 설정이 하나도 없으면 ValidationError를 던진다", async () => {
    stubPublishProperty(null);
    stubCurrentPage();

    await expect(
      setPublishState({ pageId: "doc-1", isPublished: true, viewers: {} })
    ).rejects.toThrow(ValidationError);
  });

  it("내부 고유키(페이지 title)를 slug 뒤에 붙인 publicSlug를 계산해 저장한다(P0-5b/P0-7)", async () => {
    stubPublishProperty(null);
    stubCurrentPage(); // title이 곧 이 문서의 내부 고유키다.
    vi.spyOn(access, "revealPageToSpace").mockResolvedValue(undefined);
    const upsertSpy = vi.spyOn(client, "upsertPageProperty").mockResolvedValue({
      id: "prop-1",
      key: "publishMetadata",
      value: {},
      version: { number: 1 },
    });

    const result = await setPublishState({
      pageId: "doc-1",
      isPublished: true,
      viewers: { "tech-blog": { slug: "my-post", metaDescription: "설명" } },
    });

    expect(result.viewers["tech-blog"].publicSlug).toBe("my-post-제목");
    expect(upsertSpy).toHaveBeenCalledWith(
      "doc-1",
      "publishMetadata",
      expect.objectContaining({
        viewers: { "tech-blog": { slug: "my-post", metaDescription: "설명", publicSlug: "my-post-제목" } },
      })
    );
  });
});

describe("setPublishState — slug 형식 검증(P1-6c)", () => {
  it.each([
    ["/root", "슬래시가 섞인 값(P1-11에서 실제로 발견된 사례)"],
    ["My-Post", "대문자"],
    ["my_post", "언더스코어"],
    ["my post", "공백"],
    ["-my-post", "하이픈으로 시작"],
    ["my-post-", "하이픈으로 끝남"],
    ["my--post", "하이픈 연속"],
  ])("%s(%s)는 ValidationError로 거부한다", async (slug) => {
    stubPublishProperty(null);
    stubCurrentPage();

    await expect(
      setPublishState({
        pageId: "doc-1",
        isPublished: true,
        viewers: { "tech-blog": { slug, metaDescription: "설명" } },
      })
    ).rejects.toThrow(ValidationError);
  });

  it.each(["my-post", "a", "react-19-review"])(
    "%s처럼 kebab-case 규칙을 만족하는 slug는 정상 처리된다",
    async (slug) => {
      stubPublishProperty(null);
      stubCurrentPage();
      vi.spyOn(access, "revealPageToSpace").mockResolvedValue(undefined);
      vi.spyOn(client, "upsertPageProperty").mockResolvedValue({
        id: "prop-1",
        key: "publishMetadata",
        value: {},
        version: { number: 1 },
      });

      const result = await setPublishState({
        pageId: "doc-1",
        isPublished: true,
        viewers: { "tech-blog": { slug, metaDescription: "설명" } },
      });

      expect(result.viewers["tech-blog"].slug).toBe(slug);
    }
  );
});

describe("setPublishState — 생명주기(P0-8: 폴더 이동 없이 restriction 토글만으로 관리)", () => {
  it("게시 시 제한을 해제한 뒤 메타데이터를 쓴다(제한 해제가 먼저)", async () => {
    stubPublishProperty(null);
    stubCurrentPage();
    const calls: string[] = [];
    const upsertSpy = vi
      .spyOn(client, "upsertPageProperty")
      .mockImplementation(async () => {
        calls.push("upsert");
        return {
          id: "prop-1",
          key: "publishMetadata",
          value: { isPublished: true, viewers: {} },
          version: { number: 1 },
        };
      });
    const revealSpy = vi
      .spyOn(access, "revealPageToSpace")
      .mockImplementation(async () => {
        calls.push("reveal");
      });

    await setPublishState({
      pageId: "doc-1",
      isPublished: true,
      viewers: { "tech-blog": { slug: "my-post", metaDescription: "설명" } },
    });

    expect(revealSpy).toHaveBeenCalledWith("doc-1");
    expect(upsertSpy).toHaveBeenCalled();
    // 제한 해제가 메타데이터 기록보다 먼저 일어나야 재시도가 안전하다(P0-8).
    expect(calls).toEqual(["reveal", "upsert"]);
  });

  it("이미 게시된 문서를 다시 저장해도 동일하게 동작한다(제한 해제는 멱등 연산이라 매번 호출해도 안전)", async () => {
    stubPublishProperty({
      isPublished: true,
      viewers: { "tech-blog": { slug: "my-post", metaDescription: "설명", publicSlug: "my-post-제목" } },
    });
    stubCurrentPage();
    const upsertSpy = vi.spyOn(client, "upsertPageProperty").mockResolvedValue({
      id: "prop-1",
      key: "publishMetadata",
      value: {
        isPublished: true,
        viewers: { "tech-blog": { slug: "my-post-updated", metaDescription: "새 설명" } },
      },
      version: { number: 2 },
    });
    const revealSpy = vi.spyOn(access, "revealPageToSpace").mockResolvedValue(undefined);

    await setPublishState({
      pageId: "doc-1",
      isPublished: true,
      viewers: { "tech-blog": { slug: "my-post-updated", metaDescription: "새 설명" } },
    });

    expect(revealSpy).toHaveBeenCalledWith("doc-1");
    expect(upsertSpy).toHaveBeenCalled();
  });

  it("게시 취소 시 제한을 먼저 걸고 나서 메타데이터를 쓴다", async () => {
    stubPublishProperty({
      isPublished: true,
      viewers: { "tech-blog": { slug: "my-post", metaDescription: "설명", publicSlug: "my-post-제목" } },
    });
    const calls: string[] = [];
    vi.spyOn(client, "upsertPageProperty").mockImplementation(async () => {
      calls.push("upsert");
      return {
        id: "prop-1",
        key: "publishMetadata",
        value: { isPublished: false, viewers: {} },
        version: { number: 2 },
      };
    });
    const hideSpy = vi
      .spyOn(access, "hidePageFromOthers")
      .mockImplementation(async () => {
        calls.push("hide");
      });

    await setPublishState({ pageId: "doc-1", isPublished: false });

    expect(hideSpy).toHaveBeenCalledWith("doc-1");
    expect(calls).toEqual(["hide", "upsert"]);
  });

  it("게시 중 제한 해제가 실패하면 메타데이터를 기록하지 않는다(재시도 안전)", async () => {
    stubPublishProperty(null);
    stubCurrentPage();
    const upsertSpy = vi.spyOn(client, "upsertPageProperty");
    vi.spyOn(access, "revealPageToSpace").mockRejectedValue(new Error("Confluence 제한 해제 실패"));

    await expect(
      setPublishState({
        pageId: "doc-1",
        isPublished: true,
        viewers: { "tech-blog": { slug: "my-post", metaDescription: "설명" } },
      })
    ).rejects.toThrow("Confluence 제한 해제 실패");

    expect(upsertSpy).not.toHaveBeenCalled();
  });

  it("게시 취소 중 제한 적용이 실패하면 메타데이터를 기록하지 않는다(재시도 안전)", async () => {
    stubPublishProperty({ isPublished: true, viewers: {} });
    const upsertSpy = vi.spyOn(client, "upsertPageProperty");
    vi.spyOn(access, "hidePageFromOthers").mockRejectedValue(new Error("Confluence 제한 적용 실패"));

    await expect(
      setPublishState({ pageId: "doc-1", isPublished: false })
    ).rejects.toThrow("Confluence 제한 적용 실패");

    expect(upsertSpy).not.toHaveBeenCalled();
  });
});
