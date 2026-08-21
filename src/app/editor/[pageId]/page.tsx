import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getDocumentDetail, requireDocumentOwner } from "@/lib/editor/documents";
import { NotFoundError, UnauthorizedError } from "@/lib/editor/errors";
import { DocumentEditor } from "@/components/editor/DocumentEditor";

interface EditDocumentPageProps {
  params: Promise<{ pageId: string }>;
}

export default async function EditDocumentPage({
  params,
}: EditDocumentPageProps) {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) {
    redirect("/login");
  }

  const { pageId } = await params;

  let document;
  try {
    document = await getDocumentDetail(pageId);
    // 남의 문서는 "없는 문서"와 똑같이 404로 처리한다. 별도의 권한 오류 화면을 보여주면
    // pageId를 찍어보는 직원이 "존재하지 않음"과 "존재하지만 내 것이 아님"을 구별할 수 있다.
    await requireDocumentOwner(pageId, email);
  } catch (error) {
    if (error instanceof NotFoundError || error instanceof UnauthorizedError) {
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
