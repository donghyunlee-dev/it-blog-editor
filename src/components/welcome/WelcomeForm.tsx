"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button, FormField, Input, Typography, useToast } from "@sfood/ui";

/**
 * `/welcome` 페이지의 본문(P5-2, 2026-09-03 — Modal에서 전용 페이지로 전환). 로그인 화면
 * (`src/app/login/page.tsx`)과 같은 "박스 없이 배경 위에 뜬 중앙 정렬" 구성을 그대로
 * 재사용한다 — design.md의 로그인 화면 결정을 그대로 잇는다.
 */
export function WelcomeForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [team, setTeam] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      toast("환영합니다! 계정 정보가 저장되었습니다.", "success");
      router.replace("/editor");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "저장하지 못했습니다.");
      setSaving(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-8">
      <div className="flex w-full max-w-[22rem] flex-col items-center gap-6 text-center">
        <Typography variant="h2" className="text-2xl font-semibold tracking-normal">
          환영합니다
        </Typography>
        <p className="text-sm text-muted">
          SFOOD IT Editor를 시작하려면 이름과 소속 팀을 알려주세요.
        </p>

        <form onSubmit={handleSubmit} className="flex w-full flex-col gap-4 text-left">
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
      </div>
    </div>
  );
}
