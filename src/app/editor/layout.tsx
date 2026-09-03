import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { ensurePersonalFolder } from "@/lib/editor/folder";
import { listDocuments } from "@/lib/editor/documents";
import { getAccountMeta, needsOnboarding } from "@/lib/editor/account";
import { EditorShell } from "@/components/editor/EditorShell";
import { logoutAction } from "@/lib/actions/logout";

export default async function EditorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) {
    redirect("/login");
  }

  const folder = await ensurePersonalFolder(email);

  // 이름·팀 온보딩이 끝나지 않은 계정은 메인으로 들어오지 못하고 전용 환영 페이지로
  // 리다이렉트된다(P5-2, 2026-09-03 — 처음엔 메인 화면 위 Modal이었으나 "메인에서 팝업으로
  // 받는 방식은 아닌 것 같다"는 피드백으로 별도 페이지 전환 흐름으로 바꿨다).
  const accountMeta = await getAccountMeta(folder.accountFolderId);
  if (needsOnboarding(accountMeta)) {
    redirect("/welcome");
  }

  const documents = await listDocuments(folder.accountFolderId);

  return (
    // 각 하위 페이지(new/[pageId])가 이미 자기 <main>을 렌더링하므로,
    // 여기서 또 <main>을 쓰면 페이지마다 role="main" 랜드마크가 두 개가 되어 스크린리더
    // 탐색을 깨뜨린다. EditorShell은 반응형 사이드바 셸(모바일 오프캔버스 토글 포함)만
    // 담당하는 순수 레이아웃 컨테이너다.
    <EditorShell documents={documents} userEmail={email} onLogout={logoutAction}>
      {children}
    </EditorShell>
  );
}
