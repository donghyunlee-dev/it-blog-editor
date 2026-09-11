"use client";

import { useEffect, useState } from "react";
import { Modal } from "@sfood/ui";
import type { DocumentSearchResult } from "@/lib/editor/documents";

const DEBOUNCE_MS = 300;

type SearchState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "success"; documents: DocumentSearchResult[] };

/**
 * 슬래시 메뉴 "문서 링크"(P10-1)가 여는 검색 피커. `GlobalSearchModal.tsx`의 디바운스
 * 검색 패턴(300ms, 같은 검색 API)을 재사용하되, 목적이 "문서로 이동"이 아니라
 * "카드를 삽입할 문서 고르기"라 미리보기 패널·날짜별 그룹핑 없이 결과 목록만 보여준다.
 */
export function DocumentLinkPickerModal({
  open,
  onClose,
  onSelect,
  excludePageId,
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (document: { pageId: string; title: string }) => void;
  excludePageId?: string;
}) {
  const [query, setQuery] = useState("");
  const [state, setState] = useState<SearchState>({ status: "idle" });

  // 닫힐 때 상태를 비워, 다음에 열었을 때 지난 검색어·결과가 잠깐 보이지 않게 한다
  // (GlobalSearchModal.tsx와 동일한 이유).
  useEffect(() => {
    if (!open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setQuery("");
      setState({ status: "idle" });
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const trimmed = query.trim();
    if (!trimmed) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setState({ status: "idle" });
      return;
    }

    let cancelled = false;
    setState({ status: "loading" });
    const timer = window.setTimeout(() => {
      fetch(`/api/editor/documents/search?q=${encodeURIComponent(trimmed)}`)
        .then(async (response) => {
          if (!response.ok) {
            const data = (await response.json().catch(() => null)) as {
              error?: { message?: string };
            } | null;
            throw new Error(data?.error?.message ?? "검색에 실패했습니다.");
          }
          return (await response.json()) as { documents: DocumentSearchResult[] };
        })
        .then((data) => {
          if (cancelled) return;
          setState({
            status: "success",
            documents: data.documents.filter((document) => document.pageId !== excludePageId),
          });
        })
        .catch((error: unknown) => {
          if (cancelled) return;
          setState({
            status: "error",
            message: error instanceof Error ? error.message : "검색에 실패했습니다.",
          });
        });
    }, DEBOUNCE_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query, open, excludePageId]);

  return (
    <Modal open={open} onClose={onClose} title="문서 링크 삽입" size="md">
      <div className="flex flex-col gap-3">
        <input
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="제목, 태그, 본문으로 문서를 검색하세요"
          aria-label="삽입할 문서 검색"
          autoFocus
          className="w-full rounded-btn border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-brand"
        />
        <div className="flex max-h-80 flex-col gap-0.5 overflow-y-auto">
          {state.status === "idle" && (
            <p className="px-2 py-1 text-sm text-muted">검색어를 입력해 문서를 찾아보세요.</p>
          )}
          {state.status === "loading" && <p className="px-2 py-1 text-sm text-muted">검색 중...</p>}
          {state.status === "error" && (
            <p role="alert" className="px-2 py-1 text-sm text-danger">
              {state.message}
            </p>
          )}
          {state.status === "success" && state.documents.length === 0 && (
            <p className="px-2 py-1 text-sm text-muted">일치하는 문서가 없습니다.</p>
          )}
          {state.status === "success" &&
            state.documents.map((document) => (
              <button
                key={document.pageId}
                type="button"
                onClick={() => onSelect({ pageId: document.pageId, title: document.title })}
                className="flex items-center gap-2 rounded-btn px-2 py-2 text-left transition-colors duration-default hover:bg-surface-raised"
              >
                <span aria-hidden="true">📄</span>
                <span className="min-w-0 truncate text-sm font-medium text-foreground">
                  {document.title || "(제목 없음)"}
                </span>
              </button>
            ))}
        </div>
      </div>
    </Modal>
  );
}
