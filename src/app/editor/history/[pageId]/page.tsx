import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import {
  getDocumentDetail,
  getDocumentVersionHistory,
  requireDocumentAccess,
} from "@/lib/editor/documents";
import { NotFoundError, UnauthorizedError } from "@/lib/editor/errors";
import { VersionHistoryPage } from "@/components/editor/VersionHistoryPage";

interface HistoryPageProps {
  params: Promise<{ pageId: string }>;
}

/**
 * P19-1: "이력"을 사이드바 문서 옵션(⋯) 메뉴가 여는 `Modal`(P1-2a/P14-2)이 아니라 다른
 * `/editor/*` 화면과 같은 전용 페이지로 보여준다 — "삭제된 문서"(P16-1)와 같은 이유(목록이
 * 늘어날수록 팝업으로는 감당이 안 됨)다.
 */
export default async function HistoryPage({ params }: HistoryPageProps) {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) {
    redirect("/login");
  }

  const { pageId } = await params;

  let versions;
  let currentTitle: string;
  let currentVersion: number;
  try {
    // 남의 문서(공유받지 않은)는 "없는 문서"와 똑같이 404로 처리한다(editor/[pageId]/page.tsx와
    // 같은 이유). 소유자뿐 아니라 공유받은 사람도 통과한다(P6-6).
    await requireDocumentAccess(pageId, email);
    const [versionHistory, detail] = await Promise.all([
      getDocumentVersionHistory(pageId),
      // P19-6: "이 버전으로 복원"은 기존 저장 경로(PUT /api/editor/documents/{pageId})를
      // 그대로 재사용한다 — 그 경로가 요구하는 현재 제목·버전을 여기서 미리 내려준다.
      getDocumentDetail(pageId),
    ]);
    versions = versionHistory;
    currentTitle = detail.title;
    currentVersion = detail.version;
  } catch (error) {
    if (error instanceof NotFoundError || error instanceof UnauthorizedError) {
      notFound();
    }
    throw error;
  }

  return (
    <main>
      <VersionHistoryPage
        pageId={pageId}
        initialVersions={versions}
        currentTitle={currentTitle}
        currentVersion={currentVersion}
      />
    </main>
  );
}
