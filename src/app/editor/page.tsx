import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { createPersonalFolder, findPersonalFolder } from "@/lib/editor/folder";
import { listDocuments } from "@/lib/editor/documents";
import { ConflictError } from "@/lib/editor/errors";

export default async function EditorExplorerPage() {
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

  const documents = folder ? await listDocuments(folder.folderId) : [];

  return (
    <main className="page">
      <div className="toolbar">
        <div>
          <h1 className="page-title">내 문서함</h1>
          <p className="page-subtitle">{email}님의 개인 폴더입니다.</p>
        </div>
        <Link href="/editor/new" className="button button-primary">
          새 문서
        </Link>
      </div>

      {documents.length === 0 ? (
        <div className="card empty-state">
          아직 작성한 문서가 없습니다. &quot;새 문서&quot;로 첫 글을 작성해
          보세요.
        </div>
      ) : (
        <ul className="doc-list">
          {documents.map((document) => (
            <li key={document.pageId}>
              <Link
                href={`/editor/${document.pageId}`}
                className="doc-list-item"
              >
                <span className="doc-list-item-title">{document.title}</span>
                <span className="doc-list-item-meta">
                  {new Date(document.updatedAt).toLocaleString("ko-KR")}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
