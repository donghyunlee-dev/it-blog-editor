import { NextResponse } from "next/server";
import { requireSessionEmail } from "@/lib/auth-guard";
import { toErrorResponse } from "@/lib/api-response";
import { findPersonalFolder } from "@/lib/editor/folder";
import { searchDocuments } from "@/lib/editor/documents";

/**
 * Ctrl+K 전체 검색 전용 엔드포인트([Issue #7](https://github.com/sfood-pioneer-1st/sfood-it-editor/issues/7),
 * P1-1a 후속). 제목·태그만 보는 사이드바 필터(클라이언트 상태)와 달리, 이 라우트는 문서
 * 본문까지 서버에서 검색한다 — 사용자가 검색창을 열고 입력할 때만 호출되는 온디맨드 API라
 * `listDocuments()`와 별개로 둔다.
 */
export async function GET(request: Request) {
  try {
    const email = await requireSessionEmail();
    const folder = await findPersonalFolder(email);

    if (!folder) {
      return NextResponse.json({ documents: [] });
    }

    const query = new URL(request.url).searchParams.get("q") ?? "";
    const documents = await searchDocuments(folder.accountFolderId, query);
    return NextResponse.json({ documents });
  } catch (error) {
    return toErrorResponse(error);
  }
}
