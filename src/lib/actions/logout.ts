"use server";

import { signOut } from "@/lib/auth";

/**
 * 사이드바 로그아웃 폼의 서버 액션. 이 앱은 next-auth/react의 SessionProvider를
 * 두지 않으므로(서버 컴포넌트의 auth()만으로 세션을 다룸), 클라이언트 훅 대신
 * 서버 액션 + <form action>으로 로그아웃을 처리한다.
 */
export async function logoutAction() {
  await signOut({ redirectTo: "/login" });
}
