import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { ensurePersonalFolder } from "@/lib/editor/folder";
import { listFolders } from "@/lib/editor/folders";
import { listDocuments, listSharedDocuments } from "@/lib/editor/documents";
import { getAccountMeta, needsOnboarding } from "@/lib/editor/account";
import { EditorShell } from "@/components/editor/EditorShell";
import { AccessBlockedScreen } from "@/components/AccessBlockedScreen";
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
  const accountMeta = await getAccountMeta(folder.accountFolderId);

  // 접속 차단(P5-3)이 온보딩보다 우선한다 — 관리자가 막은 계정은 온보딩 여부와 무관하게
  // 메인 진입 자체가 막혀야 한다(prd.md "접속 권한 게이트" 예외 상황 참고). 다른 URL로
  // 옮기지 않고 이 자리에서 곧바로 차단 화면을 렌더링한다.
  if (!accountMeta.accessEnabled) {
    return <AccessBlockedScreen email={email} name={accountMeta.name} onLogout={logoutAction} />;
  }

  // 이름·팀 온보딩이 끝나지 않은 계정은 메인으로 들어오지 못하고 전용 환영 페이지로
  // 리다이렉트된다(P5-2, 2026-09-03 — 처음엔 메인 화면 위 Modal이었으나 "메인에서 팝업으로
  // 받는 방식은 아니다"는 피드백으로 별도 페이지 전환 흐름으로 바꿨다).
  if (needsOnboarding(accountMeta)) {
    redirect("/welcome");
  }

  const [documents, sharedDocuments, folders] = await Promise.all([
    listDocuments(folder.accountFolderId),
    listSharedDocuments(email),
    listFolders(folder.accountFolderId),
  ]);

  return (
    // 각 하위 페이지(new/[pageId])가 이미 자기 <main>을 렌더링하므로,
    // 여기서 또 <main>을 쓰면 페이지마다 role="main" 랜드마크가 두 개가 되어 스크린리더
    // 탐색을 깨뜨린다. EditorShell은 반응형 사이드바 셸(모바일 오프캔버스 토글 포함)만
    // 담당하는 순수 레이아웃 컨테이너다.
    <EditorShell
      documents={documents}
      sharedDocuments={sharedDocuments}
      folders={folders}
      userEmail={email}
      userName={accountMeta.name}
      onLogout={logoutAction}
    >
      {children}
    </EditorShell>
  );
}
