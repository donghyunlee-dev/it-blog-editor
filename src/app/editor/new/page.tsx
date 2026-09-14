import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { listTagSuggestions } from "@/lib/editor/tag-suggestions";
import { findPersonalFolder } from "@/lib/editor/folder";
import { buildFolderPath, listFolders, type FolderNode } from "@/lib/editor/folders";
import { DocumentEditor } from "@/components/editor/DocumentEditor";

interface NewDocumentPageProps {
  /** P15-1: 사이드바 폴더 행의 "+"(이 폴더에 새 문서)가 `?folder={id}`로 넘긴다 — 없으면
   * (기존 "새 문서" 버튼, 홈 화면 CTA 등) 미분류로 시작한다. */
  searchParams: Promise<{ folder?: string }>;
}

export default async function NewDocumentPage({ searchParams }: NewDocumentPageProps) {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) {
    redirect("/login");
  }

  const { folder: folderId } = await searchParams;

  // 태그 자동완성과 폴더 경로 조회는 서로 무관한 데이터라 겹쳐 시작한다(`/editor/[pageId]`
  // page.tsx의 tagSuggestionsPromise와 같은 이유).
  const tagSuggestionsPromise = listTagSuggestions(email);

  // P15-1: 폴더 파라미터가 있으면 헤더에 그 폴더의 경로(브레드크럼)를 보여준다 — 이미
  // 편집 화면(P7-7)에 있는 메커니즘을 create 모드에도 그대로 연결할 뿐, 새 UI는 아니다.
  // 유효하지 않은 folderId(오래된 링크 등)는 buildFolderPath가 빈 배열을 돌려줘 조용히
  // 무시된다.
  let folderPath: FolderNode[] = [];
  if (folderId) {
    const personalFolder = await findPersonalFolder(email);
    if (personalFolder) {
      const folders = await listFolders(personalFolder.accountFolderId);
      folderPath = buildFolderPath(folders, folderId);
    }
  }

  const tagSuggestions = await tagSuggestionsPromise;

  // DocumentEditor가 헤더(탐색기로·저장)와 본문 캔버스를 전부 소유한다(2026-08-25,
  // "박스 없이 페이지 전체가 에디터처럼 보이게" 요청 — 산출물: DocumentEditor.tsx).
  return (
    <main>
      <DocumentEditor
        mode="create"
        tagSuggestions={tagSuggestions}
        initialFolderId={folderPath.length > 0 ? folderId : null}
        folderPath={folderPath}
      />
    </main>
  );
}
