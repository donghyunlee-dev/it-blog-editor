import { NextResponse } from "next/server";
import { requireSessionEmail } from "@/lib/auth-guard";
import { toErrorResponse } from "@/lib/api-response";
import { getDocumentDetail, requireDocumentOwner } from "@/lib/editor/documents";
import { findPersonalFolder } from "@/lib/editor/folder";
import { shareDocument } from "@/lib/editor/sharing";
import { NotFoundError, ValidationError } from "@/lib/editor/errors";

interface RouteContext {
  params: Promise<{ pageId: string }>;
}

/**
 * 공유 대상을 추가한다(P6-2/P6-3). 소유자만 호출할 수 있다(`requireDocumentOwner` — 공유받은
 * 사람이 재공유하는 것은 막는다, prd.md "페이지 공유"). 대상의 계정 폴더 ID는 클라이언트가
 * 보내지 않고 서버가 이메일로 직접 조회한다(P5-7의 계정 검색 API가 `accountFolderId`를
 * 응답에서 뺀 것과 같은 이유 — 내부 식별자를 클라이언트가 다루지 않게 한다).
 */
export async function POST(request: Request, { params }: RouteContext) {
  try {
    const email = await requireSessionEmail();
    const { pageId } = await params;
    await requireDocumentOwner(pageId, email);

    const payload = (await request.json()) as { email?: string };
    const targetEmail = payload.email?.trim();
    if (!targetEmail) {
      throw new ValidationError("공유 대상 이메일이 필요합니다.");
    }
    if (targetEmail === email) {
      throw new ValidationError("자기 자신에게는 공유할 수 없습니다.");
    }

    const targetFolder = await findPersonalFolder(targetEmail);
    if (!targetFolder) {
      throw new NotFoundError("대상 계정을 찾을 수 없습니다.");
    }

    const document = await getDocumentDetail(pageId);
    const sharingMeta = await shareDocument(
      pageId,
      { email: targetEmail, accountFolderId: targetFolder.accountFolderId },
      { ownerEmail: email, documentTitle: document.title }
    );

    return NextResponse.json({ sharedWith: sharingMeta.sharedWith });
  } catch (error) {
    return toErrorResponse(error);
  }
}
