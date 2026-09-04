import { NextResponse } from "next/server";
import { requireSessionEmail } from "@/lib/auth-guard";
import { toErrorResponse } from "@/lib/api-response";
import {
  deleteDocument,
  requireDocumentAccess,
  requireDocumentOwner,
  updateDocument,
} from "@/lib/editor/documents";
import { getAccountMeta } from "@/lib/editor/account";
import { findPersonalFolder } from "@/lib/editor/folder";
import { ValidationError } from "@/lib/editor/errors";
import type { JSONContent } from "@/lib/editor/tiptap-to-storage";

interface RouteContext {
  params: Promise<{ pageId: string }>;
}

export async function PUT(request: Request, { params }: RouteContext) {
  try {
    const email = await requireSessionEmail();
    const { pageId } = await params;
    // 소유자뿐 아니라 공유받은 사람도 저장할 수 있다(P6-6) — 삭제(DELETE, 아래)는 여전히
    // 소유자 전용이라 requireDocumentOwner를 그대로 쓴다.
    await requireDocumentAccess(pageId, email);

    const payload = (await request.json()) as {
      title?: string;
      doc?: unknown;
      version?: number;
    };

    if (typeof payload.version !== "number") {
      throw new ValidationError("version 값은 필수입니다.");
    }

    // 마지막 수정자 표시(P6-7)에 쓸 저장자 이름 — 문서 소유권 검사를 이미 통과했으므로
    // 계정 폴더는 항상 있다고 가정할 수 있지만, 방어적으로 없으면 이름 없이(이메일만) 기록한다.
    const folder = await findPersonalFolder(email);
    const name = folder ? (await getAccountMeta(folder.accountFolderId)).name : "";

    const result = await updateDocument({
      pageId,
      title: payload.title ?? "",
      doc: (payload.doc as JSONContent) ?? { type: "doc", content: [] },
      expectedVersion: payload.version,
      editor: { email, name },
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
