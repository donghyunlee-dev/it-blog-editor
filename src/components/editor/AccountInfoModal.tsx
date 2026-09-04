"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Button, FormField, Input, useToast } from "@sfood/ui";

interface AccountResponse {
  email: string;
  name: string;
  team: string;
}

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "success"; account: AccountResponse };

/**
 * 사이드바 하단 계정 표시를 눌러 여는 계정 정보 수정 팝업(P5-4). 온보딩(P5-2, `/welcome`)
 * 과 달리 강제 흐름이 아니라 사용자가 스스로 열고 닫는 팝업이라 Modal 그대로 둔다 — P5-2의
 * "메인에서 팝업으로 받지 않는다" 피드백은 강제 온보딩에 한정된 지적이었다.
 * `DeletedDocumentsModal.tsx`와 같은 로딩/에러/성공 3상태 패턴을 따른다.
 */
export function AccountInfoModal() {
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [name, setName] = useState("");
  const [team, setTeam] = useState("");
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    let cancelled = false;

    fetch("/api/editor/account")
      .then(async (response) => {
        if (!response.ok) {
          const data = (await response.json().catch(() => null)) as
            | { error?: { message?: string } }
            | null;
          throw new Error(data?.error?.message ?? "계정 정보를 불러오지 못했습니다.");
        }
        return (await response.json()) as AccountResponse;
      })
      .then((account) => {
        if (cancelled) return;
        setState({ status: "success", account });
        setName(account.name);
        setTeam(account.team);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setState({
          status: "error",
          message:
            error instanceof Error ? error.message : "계정 정보를 불러오지 못했습니다.",
        });
      });

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      const response = await fetch("/api/editor/account", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, team }),
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as
          | { error?: { message?: string } }
          | null;
        throw new Error(data?.error?.message ?? "저장하지 못했습니다.");
      }
      const updated = (await response.json()) as { email: string; name: string; team: string };
      setState((current) =>
        current.status === "success"
          ? {
              status: "success",
              account: { ...current.account, name: updated.name, team: updated.team },
            }
          : current
      );
      toast("계정 정보를 저장했습니다.", "success");
    } catch (error) {
      toast(error instanceof Error ? error.message : "저장하지 못했습니다.", "danger");
    } finally {
      setSaving(false);
    }
  }

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

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <FormField label="이메일">
        <Input value={state.account.email} disabled readOnly />
      </FormField>
      <FormField label="이름" required>
        <Input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="예: 홍길동"
        />
      </FormField>
      <FormField label="팀" required>
        <Input
          value={team}
          onChange={(event) => setTeam(event.target.value)}
          placeholder="예: IT팀"
        />
      </FormField>
      <Button
        type="submit"
        variant="primary"
        disabled={saving || !name.trim() || !team.trim()}
      >
        {saving ? "저장 중..." : "저장"}
      </Button>
    </form>
  );
}
