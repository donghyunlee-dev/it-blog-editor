import type { DocumentVersion } from "@/lib/editor/documents";
import { EmptyState } from "@sfood/ui";

export interface VersionHistoryPageProps {
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

/**
 * "문서 이력" 전용 페이지(P19-1) — 목록이 늘어날수록 팝업(`Modal`)으로는 감당이 안 된다는
 * 지적으로, "삭제된 문서"(P16-1)와 같은 방식으로 전환했다. 데이터는 서버 컴포넌트
 * (`src/app/editor/history/[pageId]/page.tsx`)가 미리 조회해 `initialVersions`로 내려준다 —
 * 이전 `VersionHistory.tsx`처럼 마운트 후 클라이언트에서 fetch하지 않는다. 되돌리기(restore)
 * 등 쓰기 동작은 다루지 않는다(P1-2a 범위 유지).
 */
export function VersionHistoryPage({ initialVersions }: VersionHistoryPageProps) {
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
                className="flex items-center justify-between gap-4 rounded-card border border-border p-4"
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
        )}
      </div>
    </div>
  );
}
