import type { ReactNode } from "react";
import { Typography } from "@sfood/ui";
import { BrandPanelArt } from "@/components/BrandPanelArt";
import { ThemeToggle } from "@/components/ThemeToggle";

export interface AuthSplitShellProps {
  /** 왼쪽 브랜드 패널의 제목 아래에 넣을 짧은 한 줄(선택). */
  leftSubtitle?: string;
  children: ReactNode;
}

/**
 * 로그인 전후 "단일 목적 화면"(로그인 `/login`, 온보딩 `/welcome`)이 함께 쓰는 좌우 분할
 * 셸. 원래 로그인 화면 전용으로 짠 레이아웃이었는데(design.md "로그인 화면" 절 참고),
 * `/welcome`도 그대로 필요로 하게 되면서 뽑아냈다(2026-09-03) — 두 화면을 각자 다른
 * 템플릿으로 새로 그리는 대신 이미 검증된 브랜드 정체성(`BrandPanelArt`, 직접 그린 SVG라
 * 외부 아이콘·일러스트 라이브러리에 기대지 않는다)을 그대로 이어가기 위해서다.
 */
export function AuthSplitShell({ leftSubtitle, children }: AuthSplitShellProps) {
  return (
    <div className="flex min-h-screen">
      <div className="relative hidden w-1/2 flex-col justify-end overflow-hidden bg-brand px-12 pb-24 text-on-brand md:flex">
        <BrandPanelArt className="pointer-events-none absolute inset-0 h-full w-full text-on-brand/90" />
        <div className="relative">
          <Typography variant="h1" className="text-3xl font-bold leading-tight text-on-brand">
            SFOOD IT Editor
          </Typography>
          {leftSubtitle && (
            <p className="relative mt-2 text-on-brand/80">{leftSubtitle}</p>
          )}
        </div>
      </div>

      <div className="relative flex flex-1 items-center justify-center bg-background p-8">
        <div className="absolute right-4 top-4">
          <ThemeToggle />
        </div>
        {children}
      </div>
    </div>
  );
}
