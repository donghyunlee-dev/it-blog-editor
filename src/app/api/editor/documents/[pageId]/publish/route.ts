import { NextResponse } from "next/server";
import { requireSessionEmail } from "@/lib/auth-guard";
import { toErrorResponse } from "@/lib/api-response";
import { setPublishState } from "@/lib/editor/publish";

interface RouteContext {
  params: Promise<{ pageId: string }>;
}

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    await requireSessionEmail();
    const { pageId } = await params;

    const payload = (await request.json()) as {
      isPublished?: boolean;
      targetViewers?: string[];
      slug?: string;
      metaDescription?: string;
    };

    const result = await setPublishState({
      pageId,
      isPublished: Boolean(payload.isPublished),
      targetViewers: payload.targetViewers,
      slug: payload.slug,
      metaDescription: payload.metaDescription,
    });

    return NextResponse.json(result);
  } catch (error) {
    return toErrorResponse(error);
  }
}
