import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getDocumentDetail } from "@/lib/editor/documents";
import { getPublishState } from "@/lib/editor/publish";
import { NotFoundError } from "@/lib/editor/errors";
import { PublishForm } from "@/components/editor/PublishForm";

interface PublishSettingsPageProps {
  params: Promise<{ pageId: string }>;
}

export default async function PublishSettingsPage({
  params,
}: PublishSettingsPageProps) {
  const session = await auth();
  if (!session?.user) {
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
    title = document.title;
    publishState = state;
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
