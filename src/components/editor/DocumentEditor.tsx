"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { buildAttachmentImageReference } from "@/lib/editor/markdown";

interface DocumentEditorProps {
  mode: "create" | "edit";
  pageId?: string;
  initialTitle?: string;
  initialMarkdown?: string;
  initialVersion?: number;
}

export function DocumentEditor({
  mode,
  pageId,
  initialTitle = "",
  initialMarkdown = "",
  initialVersion,
}: DocumentEditorProps) {
  const router = useRouter();
  const [title, setTitle] = useState(initialTitle);
  const [markdown, setMarkdown] = useState(initialMarkdown);
  const [version, setVersion] = useState(initialVersion);
  const [status, setStatus] = useState<
    "idle" | "saving" | "uploading" | "deleting"
  >("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    setStatus("saving");
    setError(null);

    try {
      if (mode === "create") {
        const response = await fetch("/api/editor/documents", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, body: markdown }),
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error?.message ?? "저장에 실패했습니다.");
        }
        // layout.tsx(사이드바)는 클라이언트 네비게이션에서 다시 실행되지 않으므로,
        // 새 문서가 목록에 즉시 나타나도록 명시적으로 새로고침한다.
        router.refresh();
        router.push(`/editor/${data.pageId}`);
        return;
      }

      const response = await fetch(`/api/editor/documents/${pageId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, body: markdown, version }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error?.message ?? "저장에 실패했습니다.");
      }
      setVersion(data.version);
      // 제목이 바뀌었을 수 있으므로 사이드바 목록도 새로고침한다(페이지 이동은 없음).
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다."
      );
    } finally {
      setStatus("idle");
    }
  }

  async function handleDelete() {
    if (!pageId) {
      return;
    }
    if (!window.confirm("이 문서를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.")) {
      return;
    }

    setStatus("deleting");
    setError(null);

    try {
      const response = await fetch(`/api/editor/documents/${pageId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error?.message ?? "삭제에 실패했습니다.");
      }
      // 삭제된 문서가 사이드바 목록에서 즉시 사라지도록 새로고침한다.
      router.refresh();
      router.push("/editor");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다."
      );
      setStatus("idle");
    }
  }

  async function handleImageUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !pageId) {
      return;
    }

    setStatus("uploading");
    setError(null);

    try {
      const form = new FormData();
      form.append("file", file);
      const response = await fetch(`/api/editor/documents/${pageId}/images`, {
        method: "POST",
        body: form,
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error?.message ?? "이미지 업로드에 실패했습니다.");
      }
      setMarkdown(
        (prev) =>
          `${prev}\n\n![${file.name}](${buildAttachmentImageReference(file.name)})\n`
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다."
      );
    } finally {
      setStatus("idle");
    }
  }

  return (
    <form className="stack" onSubmit={handleSave}>
      <div className="field">
        <label htmlFor="title">제목</label>
        <input
          id="title"
          type="text"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />
      </div>

      <div className="field">
        <label htmlFor="body">본문 (Markdown)</label>
        <textarea
          id="body"
          value={markdown}
          onChange={(event) => setMarkdown(event.target.value)}
        />
      </div>

      <div className="toolbar">
        <div>
          <label
            className="button button-secondary"
            style={{
              cursor: pageId ? "pointer" : "not-allowed",
              opacity: pageId ? 1 : 0.5,
            }}
          >
            이미지 등록
            <input
              type="file"
              accept="image/png,image/jpeg,image/gif,image/webp"
              style={{ display: "none" }}
              onChange={handleImageUpload}
              disabled={!pageId || status !== "idle"}
            />
          </label>
          {!pageId && (
            <p className="page-subtitle" style={{ margin: "4px 0 0" }}>
              문서를 먼저 저장하면 이미지를 등록할 수 있습니다.
            </p>
          )}
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          {mode === "edit" && pageId && (
            <>
              <button
                type="button"
                className="button button-danger-outline"
                onClick={handleDelete}
                disabled={status !== "idle"}
              >
                {status === "deleting" ? "삭제 중..." : "삭제"}
              </button>
              <Link href={`/editor/${pageId}/publish`} className="button button-secondary">
                게시 설정
              </Link>
            </>
          )}
          <button
            type="submit"
            className="button button-primary"
            disabled={status !== "idle"}
          >
            {status === "saving" ? "저장 중..." : "저장"}
          </button>
        </div>
      </div>

      {error && <p className="error-text">{error}</p>}
    </form>
  );
}
