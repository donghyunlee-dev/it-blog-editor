import { NextResponse } from "next/server";
import { requireSessionEmail } from "@/lib/auth-guard";
import { toErrorResponse } from "@/lib/api-response";
import { setTags } from "@/lib/editor/tags";
import { requireDocumentOwner } from "@/lib/editor/documents";

interface RouteContext {
  params: Promise<{ pageId: string }>;
}

export async function PUT(request: Request, { params }: RouteContext) {
  try {
    const email = await requireSessionEmail();
    const { pageId } = await params;
    await requireDocumentOwner(pageId, email);

    const payload = (await request.json()) as { tags?: string[] };
    const tags = await setTags(pageId, payload.tags ?? []);

    return NextResponse.json({ pageId, tags });
  } catch (error) {
    return toErrorResponse(error);
  }
}
