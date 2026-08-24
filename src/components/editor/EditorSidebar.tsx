"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import { ChipGroup, EmptyState, StatusBadge, Tag } from "@sfood/ui";
import type { DocumentSummary } from "@/lib/editor/documents";

export interface EditorSidebarProps {
  documents: DocumentSummary[];
  activePageId?: string;
}

/** `/editor/{pageId}` 형태의 경로에서 pageId만 추출한다(`/editor/new`, `/editor/{pageId}/publish`는 매칭하지 않는다). */
function extractPageIdFromPathname(pathname: string | null): string | undefined {
  if (!pathname) {
    return undefined;
  }
  const match = pathname.match(/^\/editor\/([^/]+)$/);
  const candidate = match?.[1];
  return candidate && candidate !== "new" ? candidate : undefined;
}

export function EditorSidebar({ documents, activePageId }: EditorSidebarProps) {
  // layout.tsx는 서버 컴포넌트라 현재 경로를 직접 알 수 없으므로, activePageId가
  // 명시적으로 주어지지 않으면(실제 앱에서는 항상 이 경우) 클라이언트에서
  // usePathname으로 현재 열려 있는 문서를 알아낸다. usePathname은 라우터 컨텍스트가
  // 없어도 null을 반환할 뿐 던지지 않으므로 라우터 프로바이더 없는 테스트에서도 안전하다.
  const pathname = usePathname();
  const currentPageId = activePageId ?? extractPageIdFromPathname(pathname);

  const [activeTag, setActiveTag] = useState<string | null>(null);

  const allTags = useMemo(
    () => Array.from(new Set(documents.flatMap((document) => document.tags))),
    [documents]
  );

  const visibleDocuments = activeTag
    ? documents.filter((document) => document.tags.includes(activeTag))
    : documents;

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r border-border bg-surface">
      <div className="border-b border-border p-3">
        {/*
          @sfood/ui의 Button은 <button>만 지원해 href를 받을 수 없다(ButtonHTMLAttributes 기반).
          실제 페이지 이동이 필요하므로 Link를 쓰되, 이 사이드바의 유일한 1차 액션이라는 의미를
          살리기 위해 Button variant="primary"와 동일한 토큰 클래스를 그대로 재사용한다.
        */}
        <Link
          href="/editor/new"
          className="inline-flex w-full items-center justify-center gap-2 rounded-btn bg-brand px-4 py-2 text-sm font-medium text-on-brand transition-colors duration-default hover:bg-brand-hover"
        >
          새 문서
        </Link>
      </div>

      {allTags.length > 0 && (
        <div className="border-b border-border p-3">
          <ChipGroup
            items={allTags.map((tag) => ({ id: tag, label: tag }))}
            value={activeTag ?? ""}
            onChange={(id) =>
              setActiveTag((current) => (current === id ? null : id))
            }
          />
        </div>
      )}

      <nav className="flex-1 overflow-y-auto p-3" aria-label="문서 목록">
        {documents.length === 0 ? (
          <EmptyState
            title="아직 작성한 문서가 없습니다."
            description='"새 문서"로 첫 글을 작성해 보세요.'
          />
        ) : visibleDocuments.length === 0 ? (
          <EmptyState title="이 태그가 붙은 문서가 없습니다." />
        ) : (
          <ul className="flex flex-col gap-1">
            {visibleDocuments.map((document) => {
              const isActive = document.pageId === currentPageId;
              return (
                <li key={document.pageId}>
                  <Link
                    href={`/editor/${document.pageId}`}
                    aria-current={isActive ? "page" : undefined}
                    className={
                      "block rounded-btn px-3 py-2 transition-colors duration-default " +
                      (isActive
                        ? "bg-surface-overlay text-foreground"
                        : "text-foreground hover:bg-surface-raised")
                    }
                  >
                    <p className="truncate text-sm font-medium">
                      {document.title}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      <StatusBadge
                        status={document.isPublished ? "success" : "inactive"}
                        label={document.isPublished ? "게시됨" : "초안"}
                      />
                      {document.tags.map((tag) => (
                        <Tag key={tag}>{tag}</Tag>
                      ))}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </nav>
    </aside>
  );
}
