"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { Modal, Tag } from "@sfood/ui";
import { StatusIcon } from "./EditorSidebar";
import type { DocumentSummary } from "@/lib/editor/documents";

const DEBOUNCE_MS = 300;

type SearchState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "success"; documents: DocumentSummary[] };

/**
 * Ctrl+K(맥 Cmd+K) 전체 검색 팝업([Issue #7](https://github.com/sfood-pioneer-1st/sfood-it-editor/issues/7),
 * P1-1a 후속 — Notion과 같은 방식으로 개별 진행하기로 결정). 사이드바의 상시 필터(제목·태그만,
 * `EditorSidebar.tsx`)는 그대로 두고, 이 모달만 서버(`/api/editor/documents/search`)에서
 * 본문까지 포함해 검색한다 — `EditorShell.tsx`에 한 번만 마운트해 `/editor/*` 어느 화면에서든
 * 열 수 있게 한다.
 */
export function GlobalSearchModal() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [state, setState] = useState<SearchState>({ status: "idle" });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // 전역 단축키라 다른 입력 필드에 포커스가 있어도 열려야 한다 — target을 가리지 않는다.
  // 대신 브라우저 기본 동작(북마크 추가 등)과 겹치므로 반드시 preventDefault한다.
  useEffect(() => {
    function handleKeyDown(event: globalThis.KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // 닫힐 때 상태를 비워, 다음에 열었을 때 지난 검색어·결과가 잠깐 보이지 않게 한다 —
  // `open`이라는 외부 신호(키보드 단축키)가 바뀐 데 대한 의도된 동기화라
  // EditorShell.tsx의 isMobile/sidebarWidth 초기화와 같은 패턴이다.
  useEffect(() => {
    if (!open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setQuery("");
      setState({ status: "idle" });
      setSelectedIndex(0);
    }
  }, [open]);

  useEffect(() => {
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
          return (await response.json()) as { documents: DocumentSummary[] };
        })
        .then((data) => {
          if (cancelled) return;
          setState({ status: "success", documents: data.documents });
          setSelectedIndex(0);
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
  }, [query]);

  function openDocument(pageId: string) {
    setOpen(false);
    router.push(`/editor/${pageId}`);
  }

  function handleInputKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (state.status !== "success" || state.documents.length === 0) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % state.documents.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + state.documents.length) % state.documents.length);
    } else if (event.key === "Enter") {
      event.preventDefault();
      const selected = state.documents[selectedIndex];
      if (selected) openDocument(selected.pageId);
    }
  }

  return (
    <Modal open={open} onClose={() => setOpen(false)} size="lg">
      <div className="flex flex-col gap-3">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={handleInputKeyDown}
          placeholder="제목, 태그, 본문으로 문서를 검색하세요"
          aria-label="문서 전체 검색"
          className="w-full rounded-input border border-border bg-surface px-3 py-2 text-base text-foreground outline-none placeholder:text-placeholder focus:border-brand focus:ring-2 focus:ring-brand"
        />

        {state.status === "loading" && <p className="px-1 text-sm text-muted">검색 중...</p>}
        {state.status === "error" && (
          <p role="alert" className="px-1 text-sm text-danger">
            {state.message}
          </p>
        )}
        {state.status === "success" && state.documents.length === 0 && (
          <p className="px-1 text-sm text-muted">일치하는 문서가 없습니다.</p>
        )}
        {state.status === "success" && state.documents.length > 0 && (
          <ul className="flex max-h-96 flex-col gap-0.5 overflow-y-auto">
            {state.documents.map((document, index) => (
              <li key={document.pageId}>
                <button
                  type="button"
                  onClick={() => openDocument(document.pageId)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={
                    "flex w-full flex-col gap-1 rounded-btn px-3 py-2 text-left transition-colors duration-default " +
                    (index === selectedIndex ? "bg-brand-subtle" : "hover:bg-surface-raised")
                  }
                >
                  <span className="flex items-center gap-1.5">
                    <StatusIcon isPublished={document.isPublished} />
                    <span className="min-w-0 truncate text-sm font-medium text-foreground">
                      {document.title || "(제목 없음)"}
                    </span>
                  </span>
                  {document.tags.length > 0 && (
                    <span className="flex flex-wrap items-center gap-1.5 pl-[18px]">
                      {document.tags.map((tag) => (
                        <Tag key={tag}>{tag}</Tag>
                      ))}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Modal>
  );
}
