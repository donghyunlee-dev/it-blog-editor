import { NextResponse } from "next/server";
import { requireSessionEmail } from "@/lib/auth-guard";
import { toErrorResponse } from "@/lib/api-response";
import { setPublishState, type PublishViewerInput } from "@/lib/editor/publish";
import { requireDocumentOwner } from "@/lib/editor/documents";
import { enforceRateLimit } from "@/lib/rate-limit";

interface RouteContext {
  params: Promise<{ pageId: string }>;
}

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const email = await requireSessionEmail();
    enforceRateLimit("documents:publish", email);
    const { pageId } = await params;
    await requireDocumentOwner(pageId, email);

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
