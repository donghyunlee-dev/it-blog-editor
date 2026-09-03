"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Button, FormField, Input, Modal, useToast } from "@sfood/ui";

interface AccountResponse {
  email: string;
  name: string;
  team: string;
  needsOnboarding: boolean;
}

/**
 * `/editor` 진입 직후 이름·팀이 비어 있는 계정(신규 가입자, 또는 이 기능 도입 이전에 만들어진
 * 기존 계정)에게 온보딩 입력을 강제한다(P5-2). `@sfood/ui`의 `Modal`은 `onClose`를 Escape·
 * 배경 클릭·"✕" 버튼 클릭 모두에서 그대로 호출하므로(라이브러리에 별도 옵션 없음), 저장
 * 전에는 `onClose`에 no-op을 넘겨 세 경로를 한 번에 막는다.
 */
export function OnboardingModal() {
  const [account, setAccount] = useState<AccountResponse | null>(null);
  const [name, setName] = useState("");
  const [team, setTeam] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    let cancelled = false;

    fetch("/api/editor/account")
      .then((response) => (response.ok ? (response.json() as Promise<AccountResponse>) : null))
      .then((data) => {
        if (cancelled || !data) return;
        setAccount(data);
        setName(data.name);
        setTeam(data.team);
      })
      .catch(() => {
        // 계정 정보 조회 실패 시 온보딩 팝업을 강제로 띄우지 않는다 — 다음 진입 때 다시 시도된다.
      });

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
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
      setAccount((current) => (current ? { ...current, needsOnboarding: false } : current));
      toast("환영합니다! 계정 정보가 저장되었습니다.", "success");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "저장하지 못했습니다.");
    } finally {
      setSaving(false);
    }
  }

  if (!account?.needsOnboarding) {
    return null;
  }

  return (
    <Modal open onClose={() => {}} title="환영합니다" size="sm">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <p className="text-sm text-muted">
          SFOOD IT Editor를 처음 사용하시네요. 이름과 소속 팀을 입력해주세요.
        </p>
        <FormField label="이름" required>
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="예: 홍길동"
            autoFocus
          />
        </FormField>
        <FormField label="팀" required>
          <Input
            value={team}
            onChange={(event) => setTeam(event.target.value)}
            placeholder="예: IT팀"
          />
        </FormField>
        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
        <Button
          type="submit"
          variant="primary"
          disabled={saving || !name.trim() || !team.trim()}
        >
          {saving ? "저장 중..." : "시작하기"}
        </Button>
      </form>
    </Modal>
  );
}
