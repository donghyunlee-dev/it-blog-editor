"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Avatar, Button, Card, FormField, Input, LandingSplit, useToast } from "@sfood/ui";
import type { FeatureItem } from "@sfood/ui";

export interface WelcomeFormProps {
  /** 로그인에 사용된 계정 이메일. 폼에 값을 미리 채우지는 않지만, "이 계정으로 오셨어요"라는 확인 문구에 쓴다. */
  email: string;
}

/**
 * 간단한 선(line) 아이콘 두 개(잠금·펜)만 있는 `@sfood/ui`의 `IconName`('search'|'comment')으로는
 * 아래 기능 소개 3종을 표현할 수 없어(design.md "온보딩 — 환영 페이지 디자인 보강" 참고),
 * `FeatureItem.icon`이 `text-2xl`(폰트 크기 기준)로 감싸진다는 점에 맞춰 이모지를 그대로 쓴다.
 */
const FEATURES: FeatureItem[] = [
  {
    icon: "🔒",
    title: "초안은 나만 볼 수 있어요",
    desc: "작성 중인 문서는 본인 외 누구에게도 보이지 않아요. 마음 편히 초안을 쌓아두세요.",
  },
  {
    icon: "🚀",
    title: "원할 때 바로 게시",
    desc: "버튼 하나로 Tech Blog에 공개하고, 언제든 다시 비공개로 되돌릴 수 있어요.",
  },
  {
    icon: "✍️",
    title: "편하게 쓰는 에디터",
    desc: "표·이미지·코드블록까지 슬래시 명령(/)으로 빠르게 삽입하는 WYSIWYG 에디터예요.",
  },
];

function initialsFromEmail(email: string): string {
  const local = email.split("@")[0] ?? email;
  return local.slice(0, 2).toUpperCase();
}

/**
 * `/welcome` 페이지의 본문(P5-2, 2026-09-03 — Modal에서 전용 페이지로, 같은 날 다시 한번
 * "메인 화면 위 팝업이 아니라 이 화면 자체가 서비스를 소개하는 환영 페이지여야 한다"는
 * 피드백으로 보강했다). 마케팅 랜딩 페이지 템플릿인 `LandingSplit`을 그대로 쓴다 — 로그인
 * 후 아직 이 서비스를 잘 모르는 첫 방문자에게 "무엇을, 왜 쓰는지" 보여줄 자리(`headline`/
 * `subheadline`/`features`)가 이미 있고, 폼이 들어갈 `media` 슬롯도 비어 있어 우리 온보딩
 * 폼을 그대로 끼워 넣을 수 있었다(로그인 화면처럼 구조를 복제해 새로 그릴 필요가 없었다).
 * `ctaPrimary`/`ctaSecondary`(마케팅 CTA 버튼)는 일부러 넘기지 않는다 — 이 화면의 유일한
 * 1차 액션은 아래 폼의 "시작하기" 버튼 하나뿐이어야 한다(한 화면에 `Button
 * variant="primary"` 1개 규칙).
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
    <LandingSplit
      logo="SFOOD IT Editor"
      badge="환영합니다"
      headline="SFOOD IT Editor에 오신 걸 환영해요!"
      subheadline="초안은 나만 보다가, 준비됐을 때만 공개하는 사내 전용 문서 도구예요. 시작하기 전에 딱 두 가지만 알려주세요."
      features={FEATURES}
      media={
        <Card padding="lg" className="w-full max-w-sm">
          <div className="flex flex-col gap-5">
            <div className="flex items-center gap-3">
              <Avatar alt={email} initials={initialsFromEmail(email)} size="md" />
              <div className="min-w-0">
                <p className="text-xs text-muted">이 계정으로 오셨어요</p>
                <p className="truncate text-sm font-medium text-foreground">{email}</p>
              </div>
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
        </Card>
      }
    />
  );
}
