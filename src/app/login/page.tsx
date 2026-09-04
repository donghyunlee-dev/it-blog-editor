import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getAxAuthLoginUrl } from "@/lib/ax-auth/client";
import { Alert, Typography } from "@sfood/ui";
import { AuthSplitShell } from "@/components/AuthSplitShell";

interface LoginPageProps {
  searchParams: Promise<{ error?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const session = await auth();
  if (session?.user) {
    redirect("/editor");
  }

  const { error } = await searchParams;

  let loginUrl: string | null = null;
  try {
    loginUrl = getAxAuthLoginUrl();
  } catch {
    loginUrl = null;
  }

  return (
    /*
      좌우 분할 셸(`AuthSplitShell`)은 원래 이 화면 전용으로 짠 레이아웃이었다가, `/welcome`도
      똑같은 구조가 필요해져 뽑아냈다(2026-09-03) — 셸 자체의 설계 근거(`LoginSplit`을 그대로
      쓰지 못한 이유, `BrandPanelArt`를 직접 그린 이유)는 `src/components/AuthSplitShell.tsx`와
      design.md "로그인 화면 — LoginSimple을 쓰지 않은 이유" 절 참고.
    */
    <AuthSplitShell>
      {/*
        박스(Card)로 감싸지 않고 배경 위에 자연스럽게 떠 있는 구성으로 바꿨다(2026-08-25,
        사용자 피드백). 카드 테두리/그림자 없이 텍스트와 버튼만 세로로 쌓는다 — arbitrary
        value(max-w-[22rem])로 폭만 제한해 큰 화면에서 버튼이 지나치게 늘어나지 않게 한다.
      */}
      <div className="flex w-full max-w-[22rem] flex-col items-center gap-6 text-center">
        {/* 왼쪽 패널의 "SFOOD IT Editor"가 이미 문서의 h1이므로, 여기서는 이 화면의 실제
            목적을 나타내는 h2로 둔다 — 데스크톱에서 좌측 패널이 숨겨지는 모바일 폭에서도
            이 영역이 유일한 콘텐츠라 헤딩 계층이 h2부터 시작해도 문제없다(문서 전체에
            h1이 없는 상태로 남지 않도록 왼쪽 패널은 항상 DOM에 렌더링되고 `hidden`으로만
            화면에서 감춘다). */}
        <Typography variant="h2" className="text-2xl font-semibold tracking-normal">
          다시 오신 것을 환영해요
        </Typography>

        {error && (
          <Alert variant="danger" className="w-full">
            로그인에 실패했습니다. 다시 시도해 주세요.
          </Alert>
        )}

        {loginUrl ? (
          // @sfood/ui의 Button은 ButtonHTMLAttributes 기반의 <button>만 지원해 href를 받을 수
          // 없다. 외부 AX Auth 로그인 URL로 실제 이동해야 하므로 <a>를 쓰되, 이 화면의 유일한
          // 1차 액션이라는 의미를 살리기 위해 Button variant="primary"(size="lg")와 동일한
          // 토큰 클래스를 그대로 재사용한다 (동일 패턴: src/components/editor/EditorSidebar.tsx).
          <a
            href={loginUrl}
            className="inline-flex w-full items-center justify-center gap-2 rounded-btn bg-brand px-6 py-3 text-base font-medium text-on-brand transition-colors duration-default hover:bg-brand-hover"
          >
            MS 계정으로 로그인
          </a>
        ) : (
          <Alert variant="danger" className="w-full">
            AX Auth 연동 환경변수가 설정되지 않아 로그인을 시작할 수 없습니다.
          </Alert>
        )}
      </div>
    </AuthSplitShell>
  );
}
