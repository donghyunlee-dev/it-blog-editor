"use client";

import { useRef, useState } from "react";
import { Button, Tag, useToast } from "@sfood/ui";
import { formatAccountLabel } from "@/lib/account-display";
import type { SharedAccount } from "@/lib/editor/documents";

interface AccountSearchResult {
  email: string;
  name: string;
  team: string;
  accessEnabled: boolean;
}

export interface ShareFormProps {
  pageId: string;
  initialSharedWith: SharedAccount[];
}

const SEARCH_DEBOUNCE_MS = 300;

async function errorMessageOf(response: Response, fallback: string) {
  const data = (await response.json().catch(() => null)) as
    | { error?: { message?: string } }
    | null;
  return data?.error?.message ?? fallback;
}

/**
 * 문서 공유 팝업 내용(P6-2/P6-3). `DocumentEditor.tsx`가 `Modal`로 감싸서 쓴다
 * (`PublishForm.tsx`와 같은 관례 — 이 컴포넌트는 Modal을 소유하지 않는다). 이름·이메일·팀
 * 검색(디바운스, P5-7의 검색 API 재사용)으로 대상을 찾아 추가하고,
 * 이미 공유된 대상은 목록에서 바로 제거할 수 있다.
 */
export function ShareForm({ pageId, initialSharedWith }: ShareFormProps) {
  const { toast } = useToast();
  const [sharedWith, setSharedWith] = useState<SharedAccount[]>(initialSharedWith);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AccountSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const debounceRef = useRef<number | null>(null);

  async function runSearch(value: string) {
    setSearching(true);
    try {
      const response = await fetch(`/api/editor/account/search?q=${encodeURIComponent(value)}`);
      if (!response.ok) {
        throw new Error(await errorMessageOf(response, "계정 검색에 실패했습니다."));
      }
      const data = (await response.json()) as { accounts: AccountSearchResult[] };
      setResults(data.accounts);
    } catch (error) {
      toast(error instanceof Error ? error.message : "계정 검색에 실패했습니다.", "danger");
    } finally {
      setSearching(false);
    }
  }

  function handleQueryChange(value: string) {
    setQuery(value);
    if (debounceRef.current) {
      window.clearTimeout(debounceRef.current);
    }
    if (!value.trim()) {
      setResults([]);
      return;
    }
    debounceRef.current = window.setTimeout(() => {
      void runSearch(value);
    }, SEARCH_DEBOUNCE_MS);
  }

  const sharedEmails = new Set(sharedWith.map((account) => account.email));
  // 이미 공유된 대상은 검색 결과에서 뺀다 — 자기 자신(문서 소유자)은 이 팝업을 여는 사람
  // 본인이 검색 결과에 나타날 일이 없다(계정 검색 API가 자기 자신도 포함해 돌려주므로
  // 서버가 아니라 여기서 걸러낸다).
  const selectableResults = results.filter((account) => !sharedEmails.has(account.email));

  async function handleAdd(account: AccountSearchResult) {
    setPendingEmail(account.email);
    try {
      const response = await fetch(`/api/editor/documents/${pageId}/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: account.email }),
      });
      if (!response.ok) {
        throw new Error(await errorMessageOf(response, "공유에 실패했습니다."));
      }
      setSharedWith((current) => [...current, { email: account.email, name: account.name }]);
      toast(`${formatAccountLabel(account.email, account.name)}님과 공유했습니다.`, "success");
    } catch (error) {
      toast(error instanceof Error ? error.message : "공유에 실패했습니다.", "danger");
    } finally {
      setPendingEmail(null);
    }
  }

  async function handleRemove(account: SharedAccount) {
    setPendingEmail(account.email);
    try {
      const response = await fetch(
        `/api/editor/documents/${pageId}/share/${encodeURIComponent(account.email)}`,
        { method: "DELETE" }
      );
      if (!response.ok) {
        throw new Error(await errorMessageOf(response, "공유 해제에 실패했습니다."));
      }
      setSharedWith((current) => current.filter((entry) => entry.email !== account.email));
      toast(`${formatAccountLabel(account.email, account.name)}님과의 공유를 해제했습니다.`, "success");
    } catch (error) {
      toast(error instanceof Error ? error.message : "공유 해제에 실패했습니다.", "danger");
    } finally {
      setPendingEmail(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <label className="sr-only" htmlFor="share-search">
          이름·이메일·팀으로 검색
        </label>
        <input
          id="share-search"
          type="search"
          placeholder="이름·이메일·팀으로 검색"
          value={query}
          onChange={(event) => handleQueryChange(event.target.value)}
          className="w-full rounded-input border border-border bg-surface px-3 py-1.5 text-sm text-foreground outline-none placeholder:text-placeholder focus:border-brand focus:ring-2 focus:ring-brand"
        />
        {searching && <p className="mt-1.5 text-xs text-muted">검색 중...</p>}
        {!searching && query.trim() && selectableResults.length === 0 && (
          <p className="mt-1.5 text-xs text-muted">검색 결과가 없습니다.</p>
        )}
        {selectableResults.length > 0 && (
          <ul className="mt-2 flex flex-col gap-1">
            {selectableResults.map((account) => (
              <li
                key={account.email}
                className="flex items-center justify-between gap-2 rounded-btn px-2 py-1.5 hover:bg-surface-raised"
              >
                <span className="min-w-0 flex-1 truncate text-sm text-foreground">
                  {formatAccountLabel(account.email, account.name)}
                </span>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => handleAdd(account)}
                  disabled={pendingEmail === account.email}
                >
                  추가
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <p className="mb-2 text-xs font-medium text-muted">공유 중인 사람</p>
        {sharedWith.length === 0 ? (
          <p className="text-sm text-muted">아직 공유된 대상이 없습니다.</p>
        ) : (
          // prd.md 화면 정의(2026-09-03)가 이미 "Tag/Chip 목록(제거 버튼 포함)"으로 예고해둔
          // 그대로 — 제거 가능한 대상 목록은 onRemove가 있는 Tag가 정확히 이 용도다.
          <div className="flex flex-wrap gap-1.5">
            {sharedWith.map((account) => (
              <Tag
                key={account.email}
                onRemove={pendingEmail === account.email ? undefined : () => handleRemove(account)}
                removeLabel={`${formatAccountLabel(account.email, account.name)} 공유 해제`}
              >
                {formatAccountLabel(account.email, account.name)}
              </Tag>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
