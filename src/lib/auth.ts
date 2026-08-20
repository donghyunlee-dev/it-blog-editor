import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { verifyLoginToken } from "@/lib/ax-auth/client";

export const { handlers, auth, signIn, signOut } = NextAuth({
  pages: {
    // 로그인 실패(CredentialsSignin 등) 시 이 경로로 `?error=...`와 함께 리다이렉트된다.
    signIn: "/login",
  },
  providers: [
    Credentials({
      id: "ax-auth",
      name: "AX Auth",
      credentials: {
        loginToken: { type: "text" },
      },
      async authorize(credentials) {
        const loginToken = credentials?.loginToken;
        if (typeof loginToken !== "string" || !loginToken) {
          return null;
        }

        const result = await verifyLoginToken(loginToken);
        if (!result.valid || !result.email) {
          return null;
        }

        return { id: result.email, email: result.email, name: result.email };
      },
    }),
  ],
});
