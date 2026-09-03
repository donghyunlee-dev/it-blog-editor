"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { Tag } from "@sfood/ui";
import { StatusIcon } from "./EditorSidebar";
import type { DocumentSearchResult } from "@/lib/editor/documents";

const DEBOUNCE_MS = 300;
const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

type SearchState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "success"; documents: DocumentSearchResult[] };

/** Notion의 Ctrl+K 검색 팝업을 참고해 하루/어제/최근 7일/이전으로 결과를 묶는다. */
function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function groupByRecency(
  documents: DocumentSearchResult[]
): { label: string; documents: DocumentSearchResult[] }[] {
  const today = startOfDay(new Date());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);

  const buckets: { label: string; documents: DocumentSearchResult[] }[] = [
    { label: "오늘", documents: [] },
    { label: "어제", documents: [] },
    { label: "최근 7일", documents: [] },
    { label: "이전", documents: [] },
  ];

  for (const doc of documents) {
    const updatedDay = startOfDay(new Date(doc.updatedAt));
    if (updatedDay.getTime() === today.getTime()) buckets[0].documents.push(doc);
    else if (updatedDay.getTime() === yesterday.getTime()) buckets[1].documents.push(doc);
    else if (updatedDay.getTime() > weekAgo.getTime()) buckets[2].documents.push(doc);
    else buckets[3].documents.push(doc);
  }

  return buckets.filter((bucket) => bucket.documents.length > 0);
}

function SearchIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5 shrink-0 text-muted"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="7" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

/**
 * `Ctrl+K`(맥 `Cmd+K`) 전체 검색 팝업([Issue #7](https://github.com/sfood-pioneer-1st/sfood-it-editor/issues/7),
 * P1-1a 후속). 처음엔 `@sfood/ui`의 `Modal`로 만들었으나, 2026-09-03 사용자가 Notion의 검색
 * 팝업(좌측 결과 목록 + 우측 미리보기 2단 구성, 오늘/어제 등 날짜별 그룹, "제목만" 필터)을
 * 참고 화면으로 제시하며 그에 가깝게 다시 만들어달라고 요청했다 — `Modal`은 `size` prop이
 * `sm/md/lg`(최대 `max-w-2xl`) 프리셋만 지원해 이 레이아웃(더 넓은 폭 + 내부 2단 분할)을
 * 담을 수 없어(`node_modules/@sfood/ui/dist/index.d.ts`/컴파일된 소스 확인), design.md의
 * "① 대응 요소 없으면 대체 구성" 원칙에 따라 이 컴포넌트에 한해 직접 오버레이를 만들고
 * `Modal`이 내부적으로 쓰는 것과 같은 방식(포커스 트랩·바디 스크롤 잠금·Escape 닫기·backdrop
 * 클릭 닫기)을 그대로 재현한다 — `docs/product/design.md` "Ctrl+K 검색 팝업" 절 참고.
 *
 * Notion과 달리 이 앱은 문서 계층(브레드크럼)·다른 사용자 문서 열람·북마크가 없어, 그 자리는
 * 태그로 대신하고 "생성자"/"검색 범위" 필터는 두지 않는다(계정당 본인 문서만 대상이라 필터할
 * 대상 자체가 없다).
 */
export function GlobalSearchModal() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [titleOnly, setTitleOnly] = useState(false);
  const [state, setState] = useState<SearchState>({ status: "idle" });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // 전역 단축키라 다른 입력 필드에 포커스가 있어도 열려야 한다 — target을 가리지 않는다.
  // 대신 브라우저 기본 동작(북마크 추가 등)과 겹치므로 반드시 preventDefault한다.
  useEffect(() => {
    function handleKeyDown(event: globalThis.KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((prev) => !prev);
      }
      if (event.key === "Escape") {
        setOpen(false);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // `Modal`의 `Ns`/`ys` 헬퍼(포커스 트랩·바디 스크롤 잠금)와 동일한 동작을 재현한다 —
  // 이 컴포넌트만 `Modal`을 안 쓰므로 그 두 가지 접근성 보장을 스스로 책임져야 한다.
  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    if (!panel) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    (panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)[0] ?? panel).focus();

    function handleTabKey(event: globalThis.KeyboardEvent) {
      if (event.key !== "Tab" || !panel) return;
      const focusables = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panel.addEventListener("keydown", handleTabKey);
    return () => {
      panel.removeEventListener("keydown", handleTabKey);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus?.();
    };
  }, [open]);

  // 닫힐 때 상태를 비워, 다음에 열었을 때 지난 검색어·결과가 잠깐 보이지 않게 한다 —
  // `open`이라는 외부 신호(키보드 단축키)가 바뀐 데 대한 의도된 동기화라
  // EditorShell.tsx의 isMobile/sidebarWidth 초기화와 같은 패턴이다.
  useEffect(() => {
    if (!open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setQuery("");
      setState({ status: "idle" });
      setSelectedIndex(0);
      setTitleOnly(false);
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
          return (await response.json()) as { documents: DocumentSearchResult[] };
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

  // "제목만"은 서버에 다시 묻지 않고, 이미 받아온 결과(제목·태그·본문 통합 매칭)를 제목
  // 기준으로만 다시 걸러낸다 — 별도 API 왕복 없이 즉시 반영된다.
  const normalizedQuery = query.trim().toLowerCase();
  const visibleDocuments = useMemo(() => {
    if (state.status !== "success") return [];
    if (!titleOnly) return state.documents;
    return state.documents.filter((doc) => doc.title.toLowerCase().includes(normalizedQuery));
  }, [state, titleOnly, normalizedQuery]);

  const groups = useMemo(() => groupByRecency(visibleDocuments), [visibleDocuments]);
  const selectedDocument = visibleDocuments[selectedIndex];
  // 그룹으로 나뉜 뒤에도 키보드 탐색(ArrowUp/Down)은 날짜 그룹을 가로지르는 하나의 순서로
  // 동작해야 한다 — 렌더 중에 변수를 직접 증가시키는 대신, 그룹핑 전 원래 배열의 위치를
  // 그대로 조회 테이블로 만들어 각 행이 자기 인덱스를 순수하게 조회하게 한다.
  const flatIndexByPageId = useMemo(
    () => new Map(visibleDocuments.map((document, index) => [document.pageId, index])),
    [visibleDocuments]
  );

  function openDocument(pageId: string) {
    setOpen(false);
    router.push(`/editor/${pageId}`);
  }

  function handleInputKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (visibleDocuments.length === 0) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % visibleDocuments.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + visibleDocuments.length) % visibleDocuments.length);
    } else if (event.key === "Enter") {
      event.preventDefault();
      if (selectedDocument) openDocument(selectedDocument.pageId);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[10vh]">
      <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} aria-hidden="true" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="전체 검색"
        className="relative flex h-[70vh] w-full max-w-4xl flex-col overflow-hidden rounded-card bg-surface shadow-overlay"
      >
        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          <SearchIcon />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={handleInputKeyDown}
            placeholder="제목, 태그, 본문으로 문서를 검색하세요"
            aria-label="문서 전체 검색"
            className="w-full bg-transparent text-base text-foreground outline-none placeholder:text-placeholder"
          />
        </div>

        <div className="flex items-center gap-2 border-b border-border px-4 py-2">
          <button
            type="button"
            onClick={() => setTitleOnly((prev) => !prev)}
            aria-pressed={titleOnly}
            className={
              "rounded-btn px-2.5 py-1 text-xs font-medium transition-colors duration-default " +
              (titleOnly ? "bg-brand-subtle text-brand" : "text-muted hover:bg-surface-raised")
            }
          >
            Aa 제목만
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          <div className="flex w-2/5 min-w-[220px] flex-col overflow-y-auto border-r border-border p-2">
            {state.status === "loading" && <p className="px-2 py-1 text-sm text-muted">검색 중...</p>}
            {state.status === "error" && (
              <p role="alert" className="px-2 py-1 text-sm text-danger">
                {state.message}
              </p>
            )}
            {state.status === "success" && visibleDocuments.length === 0 && (
              <p className="px-2 py-1 text-sm text-muted">일치하는 문서가 없습니다.</p>
            )}
            {groups.map((group) => (
              <div key={group.label} className="flex flex-col">
                <p className="px-2 pb-1 pt-2 text-xs font-medium text-muted first:pt-0">{group.label}</p>
                {group.documents.map((document) => {
                  const index = flatIndexByPageId.get(document.pageId) ?? 0;
                  return (
                    <button
                      key={document.pageId}
                      type="button"
                      onClick={() => openDocument(document.pageId)}
                      onMouseEnter={() => setSelectedIndex(index)}
                      className={
                        "flex items-center gap-1.5 rounded-btn px-2 py-1.5 text-left transition-colors duration-default " +
                        (index === selectedIndex ? "bg-brand-subtle" : "hover:bg-surface-raised")
                      }
                    >
                      <StatusIcon isPublished={document.isPublished} />
                      <span className="min-w-0 truncate text-sm font-medium text-foreground">
                        {document.title || "(제목 없음)"}
                      </span>
                      {document.tags.length > 0 && (
                        <span className="min-w-0 truncate text-xs text-muted">
                          {" "}
                          — {document.tags.join(", ")}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {!selectedDocument ? (
              <div className="flex h-full items-center justify-center text-sm text-muted">
                {query.trim() ? "결과를 선택하면 미리보기가 여기에 보입니다." : "검색어를 입력해 문서를 찾아보세요."}
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {selectedDocument.tags.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    {selectedDocument.tags.map((tag) => (
                      <Tag key={tag}>{tag}</Tag>
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <StatusIcon isPublished={selectedDocument.isPublished} />
                  <h2 className="min-w-0 truncate text-2xl font-semibold text-foreground">
                    {selectedDocument.title || "(제목 없음)"}
                  </h2>
                </div>
                <div className="rounded-btn border border-border bg-surface-subtle p-4 text-sm text-foreground">
                  {selectedDocument.snippet || "본문 미리보기가 없습니다."}
                </div>
                <p className="text-xs text-muted">Enter를 누르거나 클릭하면 이 문서를 엽니다.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
