import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { listTagSuggestions } from "@/lib/editor/tag-suggestions";
import { DocumentEditor } from "@/components/editor/DocumentEditor";

export default async function NewDocumentPage() {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) {
    redirect("/login");
  }

  const tagSuggestions = await listTagSuggestions(email);

  return (
    <main className="page">
      <div className="toolbar">
        <div>
          <h1 className="page-title">새 문서 작성</h1>
          <p className="page-subtitle">문서를 작성하고 저장하세요.</p>
        </div>
        <Link href="/editor" className="button button-secondary">
          탐색기로
        </Link>
      </div>
      <div className="card">
        <DocumentEditor mode="create" tagSuggestions={tagSuggestions} />
      </div>
    </main>
  );
}
