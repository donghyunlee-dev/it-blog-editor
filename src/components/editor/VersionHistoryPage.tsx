"use client";

import { useState } from "react";
import { Button, EmptyState } from "@sfood/ui";
import type { DocumentVersion, VersionDiffPart } from "@/lib/editor/documents";

export interface VersionHistoryPageProps {
  pageId: string;
  initialVersions: DocumentVersion[];
}

/** `YYYY.MM.DD HH:mm` — `VersionHistory.tsx`(P1-2a)에서 그대로 옮겨온 포맷. */
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

type DiffState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "loaded"; diff: VersionDiffPart[] | null };

/**
 * 변경 내용(diff) 렌더링(P19-5) — 순수 텍스트 기준, 추가는 밑줄, 삭제는 취소선으로
 * 구분한다(리치 텍스트 구조 diff는 범위 밖 — task.md 참고).
 */
function VersionDiffView({ state }: { state: DiffState }) {
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
  if (state.diff === null) {
    return <p className="text-sm text-muted">이전 버전이 없습니다.</p>;
  }
  if (state.diff.length === 0) {
    return <p className="text-sm text-muted">변경된 내용이 없습니다.</p>;
  }
  return (
    <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
      {state.diff.map((part, index) => {
        if (part.added) {
          return (
            <mark key={index} className="bg-success/15 text-success no-underline">
              {part.value}
            </mark>
          );
        }
        if (part.removed) {
          return (
            <span key={index} className="bg-danger/15 text-danger line-through">
              {part.value}
            </span>
          );
        }
        return <span key={index}>{part.value}</span>;
      })}
    </p>
  );
}

/**
 * "문서 이력" 전용 페이지(P19-1) — 목록이 늘어날수록 팝업(`Modal`)으로는 감당이 안 된다는
 * 지적으로, "삭제된 문서"(P16-1)와 같은 방식으로 전환했다. 목록 자체는 서버 컴포넌트
 * (`src/app/editor/history/[pageId]/page.tsx`)가 미리 조회해 `initialVersions`로 내려준다.
 * 되돌리기(restore) 등 쓰기 동작은 다루지 않는다(P1-2a 범위 유지).
 *
 * P19-5부터 각 버전 행에서 "변경 내용 보기"를 펼치면 바로 이전 버전과의 순수 텍스트 diff를
 * 그때 가서 조회한다(버전이 많을수록 과거 본문을 전부 미리 가져오는 비용이 커, 목록은
 * 서버에서 미리 내려주되 diff는 펼칠 때만 클라이언트에서 fetch하는 방식으로 나눴다).
 */
export function VersionHistoryPage({ pageId, initialVersions }: VersionHistoryPageProps) {
  const [expanded, setExpanded] = useState<number | null>(null);
  const [diffs, setDiffs] = useState<Record<number, DiffState>>({});

  async function toggleDiff(version: number) {
    if (expanded === version) {
      setExpanded(null);
      return;
    }
    setExpanded(version);
    if (diffs[version]) {
      return;
    }
    setDiffs((current) => ({ ...current, [version]: { status: "loading" } }));
    try {
      const response = await fetch(
        `/api/editor/documents/${pageId}/versions/${version}/diff`
      );
      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as {
          error?: { message?: string };
        } | null;
        throw new Error(
          data?.error?.message ?? "변경 내용을 불러오지 못했습니다."
        );
      }
      const data = (await response.json()) as { diff: VersionDiffPart[] | null };
      setDiffs((current) => ({ ...current, [version]: { status: "loaded", diff: data.diff } }));
    } catch (error) {
      setDiffs((current) => ({
        ...current,
        [version]: {
          status: "error",
          message: error instanceof Error ? error.message : "변경 내용을 불러오지 못했습니다.",
        },
      }));
    }
  }

  return (
    <div className="flex justify-center px-6">
      <div className="flex w-full max-w-[830px] flex-col gap-6 py-10">
        <div>
          <h1 className="text-2xl font-bold text-foreground">문서 이력</h1>
          <p className="mt-1 text-sm text-muted">
            이 문서에 저장된 버전 이력입니다.
          </p>
        </div>

        {initialVersions.length === 0 ? (
          <EmptyState title="버전 이력이 없습니다." />
        ) : (
          <ul className="flex flex-col gap-2">
            {initialVersions.map((version) => (
              <li
                key={version.number}
                className="rounded-card border border-border p-4"
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <span className="text-sm font-medium text-foreground">
                      버전 {version.number}
                    </span>
                    {/* P19-4: 이 버전을 저장한 사람 — 이 기능 적용 이전에 저장된 버전은
                        author가 없어(null) "정보 없음"으로 표시한다. */}
                    <p className="mt-0.5 text-xs text-muted">
                      {version.author ?? "작성자 정보 없음"}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-2 text-xs text-muted">
                      {formatVersionTimestamp(version.createdAt)}
                      {version.isCurrent && (
                        <span className="font-medium text-brand">현재 버전</span>
                      )}
                    </span>
                    {version.number > 1 && (
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => toggleDiff(version.number)}
                      >
                        {expanded === version.number ? "변경 내용 닫기" : "변경 내용 보기"}
                      </Button>
                    )}
                  </div>
                </div>
                {expanded === version.number && diffs[version.number] && (
                  <div className="mt-3 border-t border-border pt-3">
                    <VersionDiffView state={diffs[version.number]} />
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
