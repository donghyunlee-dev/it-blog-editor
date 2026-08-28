import { NextResponse } from "next/server";
import { requireSessionEmail } from "@/lib/auth-guard";
import { toErrorResponse } from "@/lib/api-response";
import { restoreDocument } from "@/lib/editor/deleted-documents";

interface RouteContext {
  params: Promise<{ pageId: string }>;
}

/**
 * 소유권 확인은 `requireDocumentOwner`(트래시된 페이지의 `authorMeta` 재조회에 의존)가
 * 아니라 `restoreDocument` 내부에서 로그인한 이메일 본인의 레지스트리에 그 pageId가
 * 있는지로만 한다 — `docs/superpowers/tasks/P1-2b-restore-deleted-document/task.md` 참고.
 */
export async function POST(_request: Request, { params }: RouteContext) {
  try {
    const email = await requireSessionEmail();
    const { pageId } = await params;
    await restoreDocument(email, pageId);

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
