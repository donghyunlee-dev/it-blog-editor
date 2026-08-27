import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearAutosaveSnapshot,
  readAutosaveSnapshot,
  writeAutosaveSnapshot,
} from "./autosave-storage";

// 이 모듈은 window.localStorage에 의존하므로(브라우저 전용), 프로젝트 컨벤션대로
// `.test.tsx`(happy-dom 환경)로 둔다 — `.test.ts`는 Node 환경이라 `window`가 없다
// (vitest.config.ts 참고, JSX는 쓰지 않지만 확장자만으로 환경이 갈린다).
beforeEach(() => {
  window.localStorage.clear();
  vi.restoreAllMocks();
});

describe("writeAutosaveSnapshot / readAutosaveSnapshot", () => {
  it("문서별로 구분된 키에 제목·본문·태그·저장 시각을 담는다", () => {
    writeAutosaveSnapshot("doc-1", {
      title: "임시 제목",
      doc: { type: "doc", content: [] },
      tags: ["React"],
    });

    const snapshot = readAutosaveSnapshot("doc-1");

    expect(snapshot).not.toBeNull();
    expect(snapshot?.title).toBe("임시 제목");
    expect(snapshot?.tags).toEqual(["React"]);
    expect(typeof snapshot?.savedAt).toBe("string");
    expect(Number.isNaN(Date.parse(snapshot!.savedAt))).toBe(false);
  });

  it("서로 다른 문서는 서로의 임시 저장본에 영향을 주지 않는다", () => {
    writeAutosaveSnapshot("doc-1", { title: "A", doc: { type: "doc", content: [] }, tags: [] });
    writeAutosaveSnapshot("doc-2", { title: "B", doc: { type: "doc", content: [] }, tags: [] });

    expect(readAutosaveSnapshot("doc-1")?.title).toBe("A");
    expect(readAutosaveSnapshot("doc-2")?.title).toBe("B");
  });

  it("저장된 적 없으면 null을 반환한다", () => {
    expect(readAutosaveSnapshot("never-saved")).toBeNull();
  });

  it("localStorage 접근이 예외를 던지는 환경(프라이빗 브라우징 등)에서도 조용히 실패한다", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });

    expect(() =>
      writeAutosaveSnapshot("doc-1", { title: "A", doc: { type: "doc", content: [] }, tags: [] })
    ).not.toThrow();
  });

  it("저장된 값이 손상된 JSON이면 null을 반환한다(무시)", () => {
    window.localStorage.setItem("sfood-editor-autosave:doc-1", "{이건 JSON이 아님");

    expect(readAutosaveSnapshot("doc-1")).toBeNull();
  });
});

describe("clearAutosaveSnapshot", () => {
  it("해당 문서의 임시 저장본만 지운다", () => {
    writeAutosaveSnapshot("doc-1", { title: "A", doc: { type: "doc", content: [] }, tags: [] });
    writeAutosaveSnapshot("doc-2", { title: "B", doc: { type: "doc", content: [] }, tags: [] });

    clearAutosaveSnapshot("doc-1");

    expect(readAutosaveSnapshot("doc-1")).toBeNull();
    expect(readAutosaveSnapshot("doc-2")).not.toBeNull();
  });
});
