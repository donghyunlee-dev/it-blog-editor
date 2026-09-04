import { NextResponse } from "next/server";
import { requireSessionEmail } from "@/lib/auth-guard";
import { toErrorResponse } from "@/lib/api-response";
import { requireDocumentOwner } from "@/lib/editor/documents";
import { findPersonalFolder } from "@/lib/editor/folder";
import { unshareDocument } from "@/lib/editor/sharing";
import { NotFoundError } from "@/lib/editor/errors";

interface RouteContext {
  params: Promise<{ pageId: string; email: string }>;
}

/** 공유 대상을 제거한다(P6-2/P6-3). 소유자만 호출할 수 있다(`requireDocumentOwner`). */
export async function DELETE(_request: Request, { params }: RouteContext) {
  try {
    const email = await requireSessionEmail();
    const { pageId, email: targetEmail } = await params;
    await requireDocumentOwner(pageId, email);

    const targetFolder = await findPersonalFolder(targetEmail);
    if (!targetFolder) {
      throw new NotFoundError("대상 계정을 찾을 수 없습니다.");
    }

    const sharingMeta = await unshareDocument(pageId, {
      email: targetEmail,
      accountFolderId: targetFolder.accountFolderId,
    });

    return NextResponse.json({ sharedWith: sharingMeta.sharedWith });
  } catch (error) {
    return toErrorResponse(error);
  }
}
