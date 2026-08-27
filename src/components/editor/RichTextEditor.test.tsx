import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { ToastProvider } from "@sfood/ui";
import type { JSONContent } from "@tiptap/react";
import { RichTextEditor } from "./RichTextEditor";
import * as imageUpload from "@/lib/editor/image-upload";

/**
 * TipTap(ProseMirror)은 실제 렌더링된 contenteditable에 드래그/붙여넣기 DOM 이벤트를
 * 그대로 받는 구조라, RichTextEditor는 이번 작업 전까지 테스트가 없었다. 이 파일은
 * P0-4b(이미지 개수 상한)만 최소로 검증한다 — 전체 리치 편집 기능 테스트는 범위 밖이다.
 */

/** N개의 이미지 노드를 담은 TipTap doc을 만든다. */
function docWithImages(count: number): JSONContent {
  return {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: Array.from({ length: count }, (_, i) => ({
          type: "image",
          attrs: { src: `https://example.com/${i}.png`, filename: `${i}.png` },
        })),
      },
    ],
  };
}

function makeImageFile(name = "photo.png") {
  return new File(["fake-image-bytes"], name, { type: "image/png" });
}

/** jsdom의 DataTransfer는 files를 직접 대입할 수 없어, 최소 형태로 흉내 낸 대역을 쓴다. */
function fireDrop(container: HTMLElement, file: File) {
  const target = container.querySelector(".ProseMirror") as HTMLElement;
  const event = new Event("drop", { bubbles: true, cancelable: true }) as DragEvent;
  Object.defineProperty(event, "dataTransfer", {
    value: { files: [file], types: ["Files"], getData: () => "" },
  });
  Object.defineProperty(event, "clientX", { value: 0 });
  Object.defineProperty(event, "clientY", { value: 0 });
  target.dispatchEvent(event);
}

function firePaste(container: HTMLElement, file: File) {
  const target = container.querySelector(".ProseMirror") as HTMLElement;
  const event = new Event("paste", { bubbles: true, cancelable: true }) as ClipboardEvent;
  Object.defineProperty(event, "clipboardData", {
    value: { files: [file], types: ["Files"], getData: () => "" },
  });
  target.dispatchEvent(event);
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("RichTextEditor 이미지 개수 상한(P0-4b)", () => {
  it("이미지가 30장 미만이면 드래그앤드롭 업로드가 정상적으로 시작된다", async () => {
    const uploadSpy = vi
      .spyOn(imageUpload, "uploadImage")
      .mockResolvedValue({ url: "https://example.com/new.png", filename: "new.png" });

    const { container } = render(
      <ToastProvider>
        <RichTextEditor content={docWithImages(29)} onChange={vi.fn()} pageId="doc-1" />
      </ToastProvider>
    );

    fireDrop(container, makeImageFile());

    await waitFor(() => expect(uploadSpy).toHaveBeenCalledTimes(1));
  });

  it("이미지가 이미 30장이면 드래그앤드롭 업로드를 시작하지 않고 안내 토스트를 띄운다", async () => {
    const uploadSpy = vi.spyOn(imageUpload, "uploadImage");

    const { container } = render(
      <ToastProvider>
        <RichTextEditor content={docWithImages(30)} onChange={vi.fn()} pageId="doc-1" />
      </ToastProvider>
    );

    fireDrop(container, makeImageFile());

    expect(
      await screen.findByText("이미지는 문서당 최대 30장까지 첨부할 수 있습니다.")
    ).toBeInTheDocument();
    expect(uploadSpy).not.toHaveBeenCalled();
  });

  it("이미지가 이미 30장이면 붙여넣기 업로드도 시작하지 않는다", async () => {
    const uploadSpy = vi.spyOn(imageUpload, "uploadImage");

    const { container } = render(
      <ToastProvider>
        <RichTextEditor content={docWithImages(30)} onChange={vi.fn()} pageId="doc-1" />
      </ToastProvider>
    );

    firePaste(container, makeImageFile());

    expect(
      await screen.findByText("이미지는 문서당 최대 30장까지 첨부할 수 있습니다.")
    ).toBeInTheDocument();
    expect(uploadSpy).not.toHaveBeenCalled();
  });
});
