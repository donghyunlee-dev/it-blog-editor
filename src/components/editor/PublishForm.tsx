"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

interface PublishFormProps {
  pageId: string;
  initial: {
    isPublished: boolean;
    targetViewers: string[];
    slug?: string;
    metaDescription?: string;
  };
}

const VIEWER_OPTIONS = [{ value: "tech-blog", label: "Tech Blog" }];

export function PublishForm({ pageId, initial }: PublishFormProps) {
  const router = useRouter();
  const [isPublished, setIsPublished] = useState(initial.isPublished);
  const [targetViewers, setTargetViewers] = useState<string[]>(
    initial.targetViewers.length ? initial.targetViewers : ["tech-blog"]
  );
  const [slug, setSlug] = useState(initial.slug ?? "");
  const [metaDescription, setMetaDescription] = useState(
    initial.metaDescription ?? ""
  );
  const [status, setStatus] = useState<"idle" | "saving">("idle");
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setStatus("saving");
    setError(null);
    setSavedAt(null);

    try {
      const response = await fetch(`/api/editor/documents/${pageId}/publish`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isPublished,
          targetViewers,
          slug,
          metaDescription,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error?.message ?? "게시 설정 저장에 실패했습니다.");
      }
      setSavedAt(data.publishedAt ?? "저장됨");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다."
      );
    } finally {
      setStatus("idle");
    }
  }

  return (
    <form className="stack" onSubmit={handleSubmit}>
      <div className="field">
        <label>
          <input
            type="checkbox"
            checked={isPublished}
            onChange={(event) => setIsPublished(event.target.checked)}
          />{" "}
          게시함
        </label>
      </div>

      <div className="field">
        <label htmlFor="slug">공개 경로(slug)</label>
        <input
          id="slug"
          type="text"
          value={slug}
          onChange={(event) => setSlug(event.target.value)}
          placeholder="예: my-first-post"
        />
      </div>

      <div className="field">
        <label htmlFor="metaDescription">메타 설명</label>
        <textarea
          id="metaDescription"
          value={metaDescription}
          onChange={(event) => setMetaDescription(event.target.value)}
          style={{ minHeight: 80 }}
        />
      </div>

      <div className="field">
        <label>노출 Viewer</label>
        {VIEWER_OPTIONS.map((option) => (
          <label key={option.value} style={{ fontWeight: 400 }}>
            <input
              type="checkbox"
              checked={targetViewers.includes(option.value)}
              onChange={(event) => {
                setTargetViewers((prev) =>
                  event.target.checked
                    ? [...prev, option.value]
                    : prev.filter((value) => value !== option.value)
                );
              }}
            />{" "}
            {option.label}
          </label>
        ))}
      </div>

      {error && <p className="error-text">{error}</p>}
      {savedAt && !error && (
        <p className="page-subtitle" style={{ margin: 0 }}>
          게시 설정이 저장되었습니다.
        </p>
      )}

      <div>
        <button
          type="submit"
          className="button button-primary"
          disabled={status === "saving"}
        >
          {status === "saving" ? "저장 중..." : "게시 설정 저장"}
        </button>
      </div>
    </form>
  );
}
