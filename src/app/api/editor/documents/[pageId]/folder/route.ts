import { NextResponse } from "next/server";
import { requireSessionEmail } from "@/lib/auth-guard";
import { toErrorResponse } from "@/lib/api-response";
import { requireDocumentOwner, setDocumentFolder } from "@/lib/editor/documents";
import { findPersonalFolder } from "@/lib/editor/folder";
import { NotFoundError } from "@/lib/editor/errors";

interface RouteContext {
  params: Promise<{ pageId: string }>;
}

/**
 * 문서를 다른 폴더로 옮긴다(P7-3). 폴더는 소유자 개인의 조직 체계라 소유자만 가능하다
 * (`requireDocumentOwner`) — 공유받은 사람이 남의 문서를 자기 폴더 구조에 끼워 넣을 수는
 * 없어야 한다는 판단(P6-6에서 삭제를 소유자 전용으로 좁힌 것과 같은 근거).
 */
export async function PUT(request: Request, { params }: RouteContext) {
  try {
    const email = await requireSessionEmail();
    const { pageId } = await params;
    await requireDocumentOwner(pageId, email);

    const folder = await findPersonalFolder(email);
    if (!folder) {
      throw new NotFoundError("개인 폴더가 없습니다.");
    }

    const payload = (await request.json()) as { folderId?: string | null };
    await setDocumentFolder(pageId, folder.accountFolderId, payload.folderId ?? null);

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
