import { NextResponse } from "next/server";
import { requireSessionEmail } from "@/lib/auth-guard";
import { toErrorResponse } from "@/lib/api-response";
import {
  getDocumentVersionHistory,
  requireDocumentOwner,
} from "@/lib/editor/documents";

interface RouteContext {
  params: Promise<{ pageId: string }>;
}

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const email = await requireSessionEmail();
    const { pageId } = await params;
    await requireDocumentOwner(pageId, email);

    const versions = await getDocumentVersionHistory(pageId);

    return NextResponse.json({ versions });
  } catch (error) {
    return toErrorResponse(error);
  }
}
