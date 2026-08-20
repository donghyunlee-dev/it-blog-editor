import { NextResponse } from "next/server";
import { requireSessionEmail } from "@/lib/auth-guard";
import { toErrorResponse } from "@/lib/api-response";
import { registerImage } from "@/lib/editor/images";

interface RouteContext {
  params: Promise<{ pageId: string }>;
}

export async function POST(request: Request, { params }: RouteContext) {
  try {
    await requireSessionEmail();
    const { pageId } = await params;

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
