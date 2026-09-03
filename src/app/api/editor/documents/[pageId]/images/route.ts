import { NextResponse } from "next/server";
import { requireSessionEmail } from "@/lib/auth-guard";
import { toErrorResponse } from "@/lib/api-response";
import { registerImage } from "@/lib/editor/images";
import { requireDocumentOwner } from "@/lib/editor/documents";
import { enforceRateLimit } from "@/lib/rate-limit";

interface RouteContext {
  params: Promise<{ pageId: string }>;
}

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const email = await requireSessionEmail();
    enforceRateLimit("documents:image-upload", email);
    const { pageId } = await params;
    await requireDocumentOwner(pageId, email);

    const formData = await request.formData();
    const file = formData.get("file");

    const attachment = await registerImage(
      pageId,
      file instanceof File ? file : null
    );

    return NextResponse.json(
      { attachmentId: attachment.attachmentId, url: attachment.url },
      { status: 201 }
    );
  } catch (error) {
    return toErrorResponse(error);
  }
}
