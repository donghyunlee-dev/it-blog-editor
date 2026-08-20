import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { DocumentEditor } from "@/components/editor/DocumentEditor";

export default async function NewDocumentPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  return (
    <main className="page">
      <div className="toolbar">
        <div>
          <h1 className="page-title">새 문서 작성</h1>
          <p className="page-subtitle">Markdown으로 문서를 작성하고 저장하세요.</p>
        </div>
        <Link href="/editor" className="button button-secondary">
          탐색기로
        </Link>
      </div>
      <div className="card">
        <DocumentEditor mode="create" />
      </div>
    </main>
  );
}
