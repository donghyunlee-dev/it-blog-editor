import { NextResponse } from "next/server";
import { requireSessionEmail } from "@/lib/auth-guard";
import { toErrorResponse } from "@/lib/api-response";
import { setPublishState, type PublishViewerInput } from "@/lib/editor/publish";
import { requireDocumentAccess } from "@/lib/editor/documents";
import { enforceRateLimit } from "@/lib/rate-limit";

interface RouteContext {
  params: Promise<{ pageId: string }>;
}

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const email = await requireSessionEmail();
    enforceRateLimit("documents:publish", email);
    const { pageId } = await params;
    await requireDocumentAccess(pageId, email); // 소유자뿐 아니라 공유받은 사람도 게시 설정을 바꿀 수 있다(P6-6)

    const payload = (await request.json()) as {
      isPublished?: boolean;
      viewers?: Record<string, PublishViewerInput>;
    };

    const result = await setPublishState({
      pageId,
      isPublished: Boolean(payload.isPublished),
      viewers: payload.viewers,
    });

    return NextResponse.json(result);
  } catch (error) {
    return toErrorResponse(error);
  }
}
