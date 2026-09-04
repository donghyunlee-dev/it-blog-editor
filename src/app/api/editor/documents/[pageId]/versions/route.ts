import { NextResponse } from "next/server";
import { requireSessionEmail } from "@/lib/auth-guard";
import { toErrorResponse } from "@/lib/api-response";
import {
  getDocumentVersionHistory,
  requireDocumentAccess,
} from "@/lib/editor/documents";

interface RouteContext {
  params: Promise<{ pageId: string }>;
}

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const email = await requireSessionEmail();
    const { pageId } = await params;
    await requireDocumentAccess(pageId, email); // 소유자뿐 아니라 공유받은 사람도 버전 히스토리를 볼 수 있다(P6-6)

    const versions = await getDocumentVersionHistory(pageId);

    return NextResponse.json({ versions });
  } catch (error) {
    return toErrorResponse(error);
  }
}
