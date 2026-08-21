import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getDocumentDetail, requireDocumentOwner } from "@/lib/editor/documents";
import { getPublishState } from "@/lib/editor/publish";
import { NotFoundError, UnauthorizedError } from "@/lib/editor/errors";
import { PublishForm } from "@/components/editor/PublishForm";

interface PublishSettingsPageProps {
  params: Promise<{ pageId: string }>;
}

export default async function PublishSettingsPage({
  params,
}: PublishSettingsPageProps) {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) {
    redirect("/login");
  }

  const { pageId } = await params;

  let title: string;
  let publishState;
  try {
    const [document, state] = await Promise.all([
      getDocumentDetail(pageId),
      getPublishState(pageId),
    ]);
    // 남의 문서는 "없는 문서"와 똑같이 404로 처리한다(권한 오류 화면을 따로 두면 pageId를
    // 찍어보는 직원이 문서의 존재 여부를 알아낼 수 있다).
    await requireDocumentOwner(pageId, email);
    title = document.title;
    publishState = state;
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
          <h1 className="page-title">게시 설정</h1>
          <p className="page-subtitle">{title}</p>
        </div>
        <Link href={`/editor/${pageId}`} className="button button-secondary">
          편집으로
        </Link>
      </div>
      <div className="card">
        <PublishForm pageId={pageId} initial={publishState} />
      </div>
    </main>
  );
}
