"use client";

import { useEffect, useState } from "react";
import { Button, useToast } from "@sfood/ui";
import type { DeletedDocumentEntry } from "@/lib/editor/documents";

export interface DeletedDocumentsModalProps {
  /** 문서 하나를 성공적으로 복구했을 때 호출한다(목록 새로고침 등은 호출부 책임). */
  onRestored?: () => void;
}

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "success"; documents: DeletedDocumentEntry[] };

/** `YYYY.MM.DD HH:mm` */
function formatDeletedAt(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}.${month}.${day} ${hours}:${minutes}`;
}

/**
 * 로그인한 사용자가 삭제한 문서 목록을 보여주고, 각 항목을 "초안"으로 복구할 수 있게
 * 한다(P1-2b). `EditorSidebar.tsx`의 "삭제된 문서" Modal 안에서만 쓰인다.
 */
export function DeletedDocumentsModal({ onRestored }: DeletedDocumentsModalProps) {
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [restoringPageId, setRestoringPageId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    let cancelled = false;

    fetch("/api/editor/documents/deleted")
      .then(async (response) => {
        if (!response.ok) {
          const data = (await response.json().catch(() => null)) as {
            error?: { message?: string };
          } | null;
          throw new Error(
            data?.error?.message ?? "삭제된 문서 목록을 불러오지 못했습니다."
          );
        }
        return (await response.json()) as { documents: DeletedDocumentEntry[] };
      })
      .then((data) => {
        if (!cancelled) {
          setState({ status: "success", documents: data.documents });
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setState({
            status: "error",
            message:
              error instanceof Error
                ? error.message
                : "삭제된 문서 목록을 불러오지 못했습니다.",
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleRestore(pageId: string) {
    setRestoringPageId(pageId);
    try {
      const response = await fetch(`/api/editor/documents/${pageId}/restore`, {
        method: "POST",
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as {
          error?: { message?: string };
        } | null;
        throw new Error(data?.error?.message ?? "문서를 복구하지 못했습니다.");
      }

      setState((current) =>
        current.status === "success"
          ? {
              status: "success",
              documents: current.documents.filter((doc) => doc.pageId !== pageId),
            }
          : current
      );
      toast("문서를 복구했습니다.", "success");
      onRestored?.();
    } catch (error) {
      toast(
        error instanceof Error ? error.message : "문서를 복구하지 못했습니다.",
        "danger"
      );
    } finally {
      setRestoringPageId(null);
    }
  }

  if (state.status === "loading") {
    return (
      <p role="status" aria-live="polite" className="text-sm text-muted">
        불러오는 중...
      </p>
    );
  }

  if (state.status === "error") {
    return (
      <p role="alert" className="text-sm text-danger">
        {state.message}
      </p>
    );
  }

  if (state.documents.length === 0) {
    return <p className="text-sm text-muted">삭제된 문서가 없습니다.</p>;
  }

  return (
    <ul className="flex flex-col gap-2">
      {state.documents.map((document) => (
        <li
          key={document.pageId}
          className="flex items-center justify-between gap-3 rounded-btn border border-border px-3 py-2"
        >
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">
              {document.title}
            </p>
            <p className="text-xs text-muted">
              {formatDeletedAt(document.deletedAt)} 삭제됨
            </p>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={restoringPageId === document.pageId}
            onClick={() => handleRestore(document.pageId)}
          >
            {restoringPageId === document.pageId ? "복구 중..." : "복구"}
          </Button>
        </li>
      ))}
    </ul>
  );
}
