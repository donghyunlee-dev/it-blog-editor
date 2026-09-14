import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { listDeletedDocuments } from "@/lib/editor/deleted-documents";
import { DeletedDocumentsPage } from "@/components/editor/DeletedDocumentsPage";

/**
 * P16-1: "삭제된 문서"를 `Modal`(P1-2b)이 아니라 다른 `/editor/*` 화면과 같은 전용
 * 페이지로 보여준다 — 삭제된 문서가 늘어날수록 팝업으로는 감당이 안 된다는 지적이다.
 */
export default async function TrashPage() {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) {
    redirect("/login");
  }

  const documents = await listDeletedDocuments(email);

  return (
    <main>
      <DeletedDocumentsPage initialDocuments={documents} />
    </main>
  );
}
