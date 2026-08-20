import { NextRequest, NextResponse } from "next/server";
import { signIn } from "@/lib/auth";

/**
 * AX Auth 리다이렉트 방식 로그인 콜백(api-spec.md의 `GET /api/auth/ax-callback` 참고).
 * 콜백 쿼리 파라미터명이 login-integration-guide.md에 명시되어 있지 않아
 * `login_token`/`loginToken` 두 이름을 모두 확인한다(실제 값 확인 전까지 미검증).
 *
 * signIn()은 성공(`/editor`로 리다이렉트)·실패(`pages.signIn`인 `/login`으로 `?error=...`와 함께
 * 리다이렉트) 양쪽 모두 next/navigation의 redirect()를 던지는 방식으로 동작하므로,
 * 이 라우트는 별도의 성공/실패 분기 없이 그 예외를 그대로 전파하면 된다.
 */
export async function GET(request: NextRequest) {
  const loginToken =
    request.nextUrl.searchParams.get("login_token") ??
    request.nextUrl.searchParams.get("loginToken");

  if (!loginToken) {
    return NextResponse.redirect(
      new URL("/login?error=missing_token", request.url)
    );
  }

  await signIn("ax-auth", { loginToken, redirectTo: "/editor" });
}
