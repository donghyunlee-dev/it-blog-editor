import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { createPersonalFolder, findPersonalFolder } from "@/lib/editor/folder";
import { listDocuments } from "@/lib/editor/documents";
import { ConflictError } from "@/lib/editor/errors";
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

  let folder = await findPersonalFolder(email);
  if (!folder) {
    try {
      folder = await createPersonalFolder(email);
    } catch (error) {
      if (error instanceof ConflictError) {
        folder = await findPersonalFolder(email);
      } else {
        throw error;
      }
    }
  }

  const documents = folder
    ? await listDocuments(folder.draftFolderId, folder.publishedFolderId)
    : [];

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
