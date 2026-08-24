import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import {
  getDocumentDetail,
  requireDocumentOwner,
  type DocumentDetail,
} from "@/lib/editor/documents";
import { getTags } from "@/lib/editor/tags";
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

  let document: DocumentDetail;
  let tags: string[];
  try {
    document = await getDocumentDetail(pageId);
    // 남의 문서는 "없는 문서"와 똑같이 404로 처리한다. 별도의 권한 오류 화면을 보여주면
    // pageId를 찍어보는 직원이 "존재하지 않음"과 "존재하지만 내 것이 아님"을 구별할 수 있다.
    await requireDocumentOwner(pageId, email);
    // 태그 조회는 소유권 확인을 통과한 뒤에 한다. getDocumentDetail과 병렬로 돌리면
    // 왕복 한 번을 아낄 수 있지만, 남의 문서 라벨을 인가 전에 읽게 되므로 그대로 둔다.
    tags = await getTags(pageId);
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
          initialDoc={document.doc}
          initialTags={tags}
          initialVersion={document.version}
        />
      </div>
    </main>
  );
}
