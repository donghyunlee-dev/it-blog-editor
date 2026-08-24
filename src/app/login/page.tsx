import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getAxAuthLoginUrl } from "@/lib/ax-auth/client";
import { Alert, Card, Typography } from "@sfood/ui";

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
    <main className="flex min-h-screen items-center justify-center bg-background p-4">
      {/*
        @sfood/ui의 LoginSimple/LoginSplit은 email/password 입력 폼과 onLogin(email, password)
        콜백만 지원하는 자체 로그인 폼 템플릿이라(다음 필드로 구성됨: logo, title, onLogin,
        onForgotPassword, onSignup, loading, error) footer 슬롯이 없을 뿐 아니라, 이 앱처럼
        비밀번호 없이 외부 AX Auth(SSO)로만 로그인하는 흐름 자체를 표현할 수 없다(가짜 이메일/
        비밀번호를 입력해야 버튼이 활성화됨). 그래서 템플릿을 억지로 맞추는 대신 디자인 시스템의
        범용 컴포넌트(Card, Typography, Alert)로 같은 화면을 구성한다.
      */}
      <Card className="w-full max-w-sm" padding="lg">
        <div className="mb-6 text-center">
          <Typography variant="h3">SFOOD IT Tech Blog</Typography>
          <Typography variant="body-sm" className="mt-2">
            사내 MS 계정으로 로그인하면 문서를 작성·게시할 수 있습니다.
          </Typography>
        </div>

        {error && (
          <Alert variant="danger" className="mb-4">
            로그인에 실패했습니다. 다시 시도해 주세요.
          </Alert>
        )}

        {loginUrl ? (
          // @sfood/ui의 Button은 ButtonHTMLAttributes 기반의 <button>만 지원해 href를 받을 수
          // 없다. 외부 AX Auth 로그인 URL로 실제 이동해야 하므로 <a>를 쓰되, 이 화면의 유일한
          // 1차 액션이라는 의미를 살리기 위해 Button variant="primary"(size="md")와 동일한
          // 토큰 클래스를 그대로 재사용한다 (동일 패턴: src/components/editor/EditorSidebar.tsx).
          <a
            href={loginUrl}
            className="inline-flex w-full items-center justify-center gap-2 rounded-btn bg-brand px-4 py-2 text-sm font-medium text-on-brand transition-colors duration-default hover:bg-brand-hover"
          >
            MS 계정으로 로그인
          </a>
        ) : (
          <Alert variant="danger">
            AX Auth 연동 환경변수가 설정되지 않아 로그인을 시작할 수 없습니다.
          </Alert>
        )}
      </Card>
    </main>
  );
}
