import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getAxAuthLoginUrl } from "@/lib/ax-auth/client";
import { Alert, Typography } from "@sfood/ui";
import { BrandPanelArt } from "@/components/BrandPanelArt";
import { ThemeToggle } from "@/components/ThemeToggle";

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
      @sfood/ui의 `LoginSplit`은 왼쪽 브랜드 패널 + 오른쪽 로그인 폼을 제공하는 템플릿이라
      "왼쪽 이미지, 오른쪽 로그인" 구성 자체는 정확히 이 화면이 원하는 모양이다. 다만
      `LoginSplitProps`가 `LoginSimpleProps`를 그대로 확장해(node_modules/@sfood/ui/dist/index.d.ts)
      오른쪽 패널이 내부적으로 `LoginSimple`(email/password 폼, onLogin(email, password) 콜백)을
      고정 렌더링한다 — 이 앱은 비밀번호 없이 AX Auth(SSO) 리다이렉트 링크 하나로만 로그인하므로
      기존에 `LoginSimple`을 못 쓴 것과 같은 이유로 오른쪽 폼도 그대로 쓸 수 없다(design.md
      "로그인 화면 — LoginSimple을 쓰지 않은 이유" 참고).
      그래서 컴포넌트를 직접 호출하는 대신, `LoginSplit`이 실제로 렌더링하는 좌/우 레이아웃
      구조 자체(node_modules/@sfood/ui/dist/index.js의 LoginSplit 구현 — 왼쪽 `w-1/2 bg-brand`
      브랜드 패널은 `md:flex`로 데스크톱에서만 보이고, 오른쪽은 `flex-1 items-center
      justify-center`로 폼 카드를 가운데 정렬)만 같은 토큰 클래스로 재현하고, 오른쪽 자리에
      기존 AX Auth 카드를 그대로 넣는다. 왼쪽 패널의 그림(`BrandPanelArt`)은 "회사"(식품 기업 —
      줄기·잎)와 "에디터"(문서 작성 도구 — 문서·펜)를 하나로 결합한 자체 제작 SVG다
      (2026-08-25, `src/components/BrandPanelArt.tsx` 참고 — `@sfood/ui`가 연동한 이미지
      생성 도구는 이 계정 플랜에서 막혀 있어("Requires basic plan or higher") 코드로 직접 그렸다).
    */
    <div className="flex min-h-screen">
      <div className="relative hidden w-1/2 flex-col justify-end overflow-hidden bg-brand px-12 pb-24 text-on-brand md:flex">
        <BrandPanelArt className="pointer-events-none absolute inset-0 h-full w-full text-on-brand/90" />
        <div className="relative">
          <Typography variant="h1" className="text-3xl font-bold leading-tight text-on-brand">
            SFOOD IT Editor
          </Typography>
        </div>
      </div>

      <div className="relative flex flex-1 items-center justify-center bg-background p-8">
        {/* 로그인 전에도 라이트/다크를 비교해 볼 수 있게 토글을 둔다(2026-08-26, 사용자
            피드백 — "테마 변경도 없어서 밝은 화면에서는 비교도 안 되고"). */}
        <div className="absolute right-4 top-4">
          <ThemeToggle />
        </div>
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
      </div>
    </div>
  );
}
