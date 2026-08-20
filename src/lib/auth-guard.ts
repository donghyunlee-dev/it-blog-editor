import { auth } from "@/lib/auth";

export class UnauthorizedError extends Error {
  constructor(message = "로그인이 필요합니다.") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

/**
 * Editor API의 인증 경계. 유효한 세션이 없으면 UnauthorizedError를 던진다.
 * 세션의 이메일을 실제 작성자 식별자(actualAuthorEmail)로 사용한다.
 */
export async function requireSessionEmail(): Promise<string> {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) {
    throw new UnauthorizedError();
  }
  return email;
}
