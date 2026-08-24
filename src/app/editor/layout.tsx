import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { createPersonalFolder, findPersonalFolder } from "@/lib/editor/folder";
import { listDocuments } from "@/lib/editor/documents";
import { ConflictError } from "@/lib/editor/errors";
import { EditorSidebar } from "@/components/editor/EditorSidebar";

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

  const documents = folder ? await listDocuments(folder.folderId, email) : [];

  return (
    <div className="flex h-screen">
      <EditorSidebar documents={documents} />
      {/*
        각 하위 페이지(new/[pageId]/[pageId]/publish)가 이미 자기 <main className="page">를
        렌더링하므로, 여기서 또 <main>을 쓰면 페이지마다 role="main" 랜드마크가 두 개가 되어
        스크린리더 탐색을 깨뜨린다. 레이아웃 쪽은 순수 레이아웃 컨테이너로만 둔다.
      */}
      <div className="flex-1 overflow-y-auto">{children}</div>
    </div>
  );
}
