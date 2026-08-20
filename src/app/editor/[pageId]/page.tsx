import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getDocumentDetail } from "@/lib/editor/documents";
import { NotFoundError } from "@/lib/editor/errors";
import { DocumentEditor } from "@/components/editor/DocumentEditor";

interface EditDocumentPageProps {
  params: Promise<{ pageId: string }>;
}

export default async function EditDocumentPage({
  params,
}: EditDocumentPageProps) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const { pageId } = await params;

  let document;
  try {
    document = await getDocumentDetail(pageId);
  } catch (error) {
    if (error instanceof NotFoundError) {
      notFound();
    }
    throw error;
  }

  return (
    <main className="page">
      <div className="toolbar">
        <div>
          <h1 className="page-title">{document.title}</h1>
          <p className="page-subtitle">문서를 수정하고 저장하세요.</p>
        </div>
        <Link href="/editor" className="button button-secondary">
          탐색기로
        </Link>
      </div>
      <div className="card">
        <DocumentEditor
          mode="edit"
          pageId={document.pageId}
          initialTitle={document.title}
          initialMarkdown={document.markdown}
          initialVersion={document.version}
        />
      </div>
    </main>
  );
}
