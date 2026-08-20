import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getAxAuthLoginUrl } from "@/lib/ax-auth/client";

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
    <main className="page">
      <div className="card" style={{ maxWidth: 420, margin: "64px auto" }}>
        <h1 className="page-title">SFOOD IT Tech Blog</h1>
        <p className="page-subtitle">
          사내 MS 계정으로 로그인하면 문서를 작성·게시할 수 있습니다.
        </p>

        {error && (
          <p className="error-text">
            로그인에 실패했습니다. 다시 시도해 주세요.
          </p>
        )}

        {loginUrl ? (
          <a href={loginUrl} className="button button-primary">
            MS 계정으로 로그인
          </a>
        ) : (
          <p className="error-text">
            AX Auth 연동 환경변수가 설정되지 않아 로그인을 시작할 수 없습니다.
          </p>
        )}
      </div>
    </main>
  );
}
