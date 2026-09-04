import { NextResponse } from "next/server";
import { requireSessionEmail } from "@/lib/auth-guard";
import { toErrorResponse } from "@/lib/api-response";
import { setTags } from "@/lib/editor/tags";
import { requireDocumentAccess } from "@/lib/editor/documents";

interface RouteContext {
  params: Promise<{ pageId: string }>;
}

export async function PUT(request: Request, { params }: RouteContext) {
  try {
    const email = await requireSessionEmail();
    const { pageId } = await params;
    await requireDocumentAccess(pageId, email); // 소유자뿐 아니라 공유받은 사람도 태그를 바꿀 수 있다(P6-6)

    const payload = (await request.json()) as { tags?: string[] };
    const tags = await setTags(pageId, payload.tags ?? []);

    return NextResponse.json({ pageId, tags });
  } catch (error) {
    return toErrorResponse(error);
  }
}
