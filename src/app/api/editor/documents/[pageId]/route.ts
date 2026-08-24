import { NextResponse } from "next/server";
import { requireSessionEmail } from "@/lib/auth-guard";
import { toErrorResponse } from "@/lib/api-response";
import {
  deleteDocument,
  requireDocumentOwner,
  updateDocument,
} from "@/lib/editor/documents";
import { ValidationError } from "@/lib/editor/errors";
import type { JSONContent } from "@/lib/editor/tiptap-to-storage";

interface RouteContext {
  params: Promise<{ pageId: string }>;
}

export async function PUT(request: Request, { params }: RouteContext) {
  try {
    const email = await requireSessionEmail();
    const { pageId } = await params;
    await requireDocumentOwner(pageId, email);

    const payload = (await request.json()) as {
      title?: string;
      doc?: unknown;
      version?: number;
    };

    if (typeof payload.version !== "number") {
      throw new ValidationError("version 값은 필수입니다.");
    }

    const result = await updateDocument({
      pageId,
      title: payload.title ?? "",
      doc: (payload.doc as JSONContent) ?? { type: "doc", content: [] },
      expectedVersion: payload.version,
    });

    return NextResponse.json(result);
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  try {
    const email = await requireSessionEmail();
    const { pageId } = await params;
    await requireDocumentOwner(pageId, email);

    await deleteDocument(pageId);

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
