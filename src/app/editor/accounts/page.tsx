"use client";

import { useEffect, useState } from "react";
import { ListSearchTable, StatusBadge, useToast } from "@sfood/ui";
import type { DataColumn } from "@sfood/ui";
import { formatAccountLabel } from "@/lib/account-display";

/**
 * `ListSearchTable`의 제네릭 제약(`T extends Record<string, unknown>`)을 만족시키려면
 * 인터페이스가 아니라 인덱스 시그니처를 포함한 타입이어야 한다(design.md 참고).
 */
type AccountRow = Record<string, unknown> & {
  email: string;
  name: string;
  team: string;
  accessEnabled: boolean;
};

const COLUMNS: DataColumn<AccountRow>[] = [
  {
    key: "account",
    header: "계정",
    render: (row) => formatAccountLabel(row.email, row.name),
  },
  {
    key: "team",
    header: "팀",
    render: (row) => row.team || "-",
  },
  {
    key: "accessEnabled",
    header: "접속",
    render: (row) => (
      <StatusBadge
        status={row.accessEnabled ? "active" : "inactive"}
        label={row.accessEnabled ? "허용" : "차단"}
      />
    ),
  },
];

/**
 * 최상단 계정 관리 화면(P5-7) — 전체 계정 조회 전용이다. 접속 허용/차단은 이 화면에서
 * 바꿀 수 없다(P5-6 결정 유지 — `scripts/set-account-access.ts` 전용).
 */
export default function AccountsPage() {
  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const { toast } = useToast();

  async function search(query: string) {
    try {
      const response = await fetch(`/api/editor/account/search?q=${encodeURIComponent(query)}`);
      if (!response.ok) {
        throw new Error("계정 검색에 실패했습니다.");
      }
      const body = (await response.json()) as { accounts: AccountRow[] };
      setAccounts(body.accounts);
    } catch {
      toast("계정 목록을 불러오지 못했습니다.", "danger");
    }
  }

  // 마운트 시 전체 목록을 한 번 불러온다. 함수를 직접 호출하는 대신 `.then()` 체인으로
  // 인라인하는 이유는 `DeletedDocumentsModal.tsx`/`AccountInfoModal.tsx`와 같다 —
  // `useEffect` 안에서 setState를 부르는 함수를 직접 호출하면 즉시 실행되는 것으로
  // 오인해 `react-hooks/set-state-in-effect`가 오탐한다.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/editor/account/search?q=")
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("계정 검색에 실패했습니다.");
        }
        return (await response.json()) as { accounts: AccountRow[] };
      })
      .then((body) => {
        if (!cancelled) setAccounts(body.accounts);
      })
      .catch(() => {
        if (!cancelled) toast("계정 목록을 불러오지 못했습니다.", "danger");
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <ListSearchTable
      title="계정 관리"
      columns={COLUMNS}
      data={accounts}
      rowKey="email"
      searchPlaceholder="이름·이메일·팀으로 검색"
      onSearch={search}
    />
  );
}
