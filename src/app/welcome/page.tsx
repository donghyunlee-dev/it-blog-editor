import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { ensurePersonalFolder } from "@/lib/editor/folder";
import { getAccountMeta, needsOnboarding } from "@/lib/editor/account";
import { WelcomeForm } from "@/components/welcome/WelcomeForm";

/**
 * 로그인은 성공했지만 이름·팀 온보딩이 끝나지 않은 계정이 도착하는 전용 화면(P5-2,
 * 2026-09-03 — `/editor` 위 Modal에서 이 페이지로 전환됨. `/editor/layout.tsx`가
 * `needsOnboarding`이면 여기로 리다이렉트한다). 이미 온보딩이 끝난 계정이 직접 이 URL로
 * 들어오면 메인으로 돌려보낸다.
 */
export default async function WelcomePage() {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) {
    redirect("/login");
  }

  const folder = await ensurePersonalFolder(email);
  const accountMeta = await getAccountMeta(folder.accountFolderId);
  if (!needsOnboarding(accountMeta)) {
    redirect("/editor");
  }

  return <WelcomeForm />;
}
