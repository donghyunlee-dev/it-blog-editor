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
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
