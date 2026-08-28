"use client";

import { useEffect, useState } from "react";
import type { DocumentVersion } from "@/lib/editor/documents";

export interface VersionHistoryProps {
  pageId: string;
}

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "success"; versions: DocumentVersion[] };

/** `YYYY.MM.DD HH:mm` — 같은 날짜에 여러 버전이 생길 수 있어 시각까지 보여준다. */
function formatVersionTimestamp(iso: string): string {
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
 * 문서의 Confluence 버전 이력을 읽기 전용으로 보여준다(P1-2a). 되돌리기(restore) 등
 * 쓰기 동작은 없다 — docs/superpowers/tasks/P1-2a-revision-history-view/task.md 참고.
 * `DocumentEditor.tsx`의 "이력" Modal 안에서만 쓰인다.
 */
export function VersionHistory({ pageId }: VersionHistoryProps) {
  const [state, setState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    // 데이터 가져오기는 React 문서가 useEffect의 정당한 용도로 직접 드는 두 사례 중
    // 하나다(외부 시스템과의 동기화) — pageId가 바뀌어 다시 가져올 때 이전 결과가
    // 잠깐 남아있지 않도록 로딩 상태로 되돌린다. 초기 렌더에서는 useState의 초깃값과
    // 같은 값이라 실질적인 변화는 없다.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState({ status: "loading" });

    fetch(`/api/editor/documents/${pageId}/versions`)
      .then(async (response) => {
        if (!response.ok) {
          const data = (await response.json().catch(() => null)) as {
            error?: { message?: string };
          } | null;
          throw new Error(
            data?.error?.message ?? "버전 이력을 불러오지 못했습니다."
          );
        }
        return (await response.json()) as { versions: DocumentVersion[] };
      })
      .then((data) => {
        if (!cancelled) {
          setState({ status: "success", versions: data.versions });
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setState({
            status: "error",
            message:
              error instanceof Error
                ? error.message
                : "버전 이력을 불러오지 못했습니다.",
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [pageId]);

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

  if (state.versions.length === 0) {
    return <p className="text-sm text-muted">버전 이력이 없습니다.</p>;
  }

  return (
    <ul className="flex flex-col gap-2">
      {state.versions.map((version) => (
        <li
          key={version.number}
          className="flex items-center justify-between gap-3 rounded-btn border border-border px-3 py-2"
        >
          <span className="text-sm font-medium text-foreground">
            버전 {version.number}
          </span>
          <span className="flex items-center gap-2 text-xs text-muted">
            {formatVersionTimestamp(version.createdAt)}
            {version.isCurrent && (
              <span className="font-medium text-brand">현재 버전</span>
            )}
          </span>
        </li>
      ))}
    </ul>
  );
}
