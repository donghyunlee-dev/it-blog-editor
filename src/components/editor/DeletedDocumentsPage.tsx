"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, EmptyState, Tag, useToast } from "@sfood/ui";
import { StatusIcon } from "./EditorSidebar";
import type { DeletedDocumentSummary } from "@/lib/editor/deleted-documents";

export interface DeletedDocumentsPageProps {
  initialDocuments: DeletedDocumentSummary[];
}

/** `YYYY.MM.DD HH:mm` — `DeletedDocumentsModal.tsx`(P1-2b)에서 그대로 옮겨온 포맷. */
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
 * "삭제된 문서" 전용 페이지(P16-1) — 삭제된 문서가 늘어날수록 팝업(`Modal`)으로는 감당이
 * 안 된다는 지적으로, 사이드바 버튼이 이 페이지(`/editor/trash`)로 이동하도록 바뀌었다.
 * 데이터는 서버 컴포넌트(`src/app/editor/trash/page.tsx`)가 미리 조회해 `initialDocuments`로
 * 내려준다 — 이전 `DeletedDocumentsModal`처럼 마운트 후 클라이언트에서 fetch하지 않는다
 * (다른 `/editor/*` 페이지와 같은 패턴).
 */
export function DeletedDocumentsPage({ initialDocuments }: DeletedDocumentsPageProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [documents, setDocuments] = useState(initialDocuments);
  const [query, setQuery] = useState("");
  const [restoringPageId, setRestoringPageId] = useState<string | null>(null);

  // 사이드바 문서 검색(EditorSidebar.tsx)과 같은 방식 — 제목·태그를 대상으로 한다.
  const filteredDocuments = documents.filter((document) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      document.title.toLowerCase().includes(q) ||
      document.tags.some((tag) => tag.toLowerCase().includes(q))
    );
  });

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

      setDocuments((current) => current.filter((document) => document.pageId !== pageId));
      toast("문서를 복구했습니다.", "success");
      // 사이드바(layout.tsx)는 클라이언트 네비게이션에서 다시 실행되지 않으므로,
      // 복구된 문서가 사이드바 목록에 곧바로 나타나도록 명시적으로 새로고침한다
      // (DocumentEditor.tsx의 저장/삭제 흐름과 같은 이유).
      router.refresh();
    } catch (error) {
      toast(error instanceof Error ? error.message : "문서를 복구하지 못했습니다.", "danger");
    } finally {
      setRestoringPageId(null);
    }
  }

  return (
    <div className="flex justify-center px-6">
      <div className="flex w-full max-w-[830px] flex-col gap-6 py-10">
        <div>
          <h1 className="text-2xl font-bold text-foreground">삭제된 문서</h1>
          <p className="mt-1 text-sm text-muted">
            삭제한 문서를 검색해서 다시 복구할 수 있습니다.
          </p>
        </div>

        {documents.length > 0 && (
          <div>
            <label className="sr-only" htmlFor="trash-search">
              삭제된 문서 제목·태그 검색
            </label>
            <input
              id="trash-search"
              type="search"
              placeholder="삭제된 문서 검색"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="w-full rounded-input border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none placeholder:text-placeholder focus:border-brand focus:ring-2 focus:ring-brand"
            />
          </div>
        )}

        {documents.length === 0 ? (
          <EmptyState title="삭제된 문서가 없습니다." />
        ) : filteredDocuments.length === 0 ? (
          <EmptyState title="조건에 맞는 문서가 없습니다." />
        ) : (
          <ul className="flex flex-col gap-2">
            {filteredDocuments.map((document) => (
              <li
                key={document.pageId}
                className="flex items-start justify-between gap-4 rounded-card border border-border p-4"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <StatusIcon isPublished={document.isPublished} />
                    <p className="min-w-0 truncate text-sm font-medium text-foreground">
                      {document.title}
                    </p>
                  </div>
                  <p className="mt-1 text-xs text-muted">
                    {formatDeletedAt(document.deletedAt)} 삭제됨 · {document.folderName ?? "미분류"}
                  </p>
                  {document.tags.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {document.tags.map((tag) => (
                        <Tag key={tag}>{tag}</Tag>
                      ))}
                    </div>
                  )}
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
        )}
      </div>
    </div>
  );
}
