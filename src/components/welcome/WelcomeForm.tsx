"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Avatar, Button, FormField, Input, Typography, useToast } from "@sfood/ui";
import { AuthSplitShell } from "@/components/AuthSplitShell";

export interface WelcomeFormProps {
  /** 로그인에 사용된 계정 이메일. 폼에 값을 미리 채우지는 않지만, "이 계정으로 오셨어요"라는 확인 문구에 쓴다. */
  email: string;
}

function initialsFromEmail(email: string): string {
  const local = email.split("@")[0] ?? email;
  return local.slice(0, 2).toUpperCase();
}

/**
 * `/welcome` 페이지의 본문. 2026-09-03 하루 동안 두 번 다시 그렸다 — ① Modal에서 전용
 * 페이지로, ② `LandingSplit`(마케팅 랜딩 템플릿, 배지+거대 헤드라인+이모지 아이콘 3열
 * 그리드)로 서비스 소개를 더했다가, "AI가 자주 쓰는 패턴 같다"는 지적을 받아 다시 짰다.
 *
 * 이번엔 로그인 화면과 같은 셸(`AuthSplitShell`)을 그대로 이어 쓴다 — 로그인 직후 이어지는
 * 화면인데 완전히 다른 시각 언어(마케팅 랜딩 페이지)로 바뀌는 것 자체가 어색했고, 이미
 * 검증된 브랜드 요소(`BrandPanelArt`, 이 프로젝트를 위해 직접 그린 SVG)를 재사용하는 편이
 * 범용 아이콘·그라디언트·카드 그리드보다 훨씬 "이 서비스만의 것"처럼 보인다.
 * 무엇을 하는 서비스인지는 카드 3개로 나열하지 않고, 인사말 한 단락에 자연스럽게 녹였다.
 */
export function WelcomeForm({ email }: WelcomeFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [team, setTeam] = useState("");
  const [saving, setSaving] = useState(false);

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
      toast(`환영해요, ${name}님! 계정 정보가 저장되었어요.`, "success");
      router.replace("/editor");
    } catch (submitError) {
      toast(
        submitError instanceof Error ? submitError.message : "저장하지 못했습니다.",
        "danger"
      );
      setSaving(false);
    }
  }

  return (
    <AuthSplitShell leftSubtitle="당신만의 문서 공간">
      <div className="flex w-full max-w-[22rem] flex-col gap-6">
        <div className="flex flex-col gap-3 text-center">
          <Typography variant="h2" className="text-2xl font-semibold tracking-normal">
            반가워요!
          </Typography>
          <p className="text-sm leading-relaxed text-muted">
            여기서는 나만의 문서를 편하게 쓰고 관리할 수 있어요. 아직 다른 사람에게 보여주고
            싶지 않은 내용은 나만 볼 수 있게 남겨두고, 준비가 되면 팀원과 공유할 수 있어요.
          </p>
        </div>

        <div className="flex items-center justify-center gap-3">
          <Avatar alt={email} initials={initialsFromEmail(email)} size="sm" />
          <p className="text-sm text-muted">
            <span className="font-medium text-foreground">{email}</span> 계정으로 오셨어요
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <FormField
            label="이름을 알고 싶어요"
            hint="동료들이 문서함에서 이름으로 바로 알아볼 수 있도록 사용해요."
            required
          >
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="예: 홍길동"
            />
          </FormField>
          <FormField
            label="어디 소속인지 알려주세요"
            hint="같은 팀 동료와 문서를 나중에 편하게 공유하기 위해 사용해요."
            required
          >
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
            {saving ? "저장 중..." : "시작하기"}
          </Button>
        </form>
      </div>
    </AuthSplitShell>
  );
}
