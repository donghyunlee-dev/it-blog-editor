import { NextResponse } from "next/server";
import { requireSessionEmail } from "@/lib/auth-guard";
import { toErrorResponse } from "@/lib/api-response";
import { NotFoundError } from "@/lib/editor/errors";
import { findPersonalFolder } from "@/lib/editor/folder";
import { createDocument, listDocuments } from "@/lib/editor/documents";

export async function GET() {
  try {
    const email = await requireSessionEmail();
    const folder = await findPersonalFolder(email);

    if (!folder) {
      return NextResponse.json({ documents: [] });
    }

    const documents = await listDocuments(folder.folderId);
    return NextResponse.json({ documents });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const email = await requireSessionEmail();
    const folder = await findPersonalFolder(email);

    if (!folder) {
      throw new NotFoundError(
        "개인 폴더가 없습니다. 먼저 개인 폴더를 생성하세요."
      );
    }

    const payload = (await request.json()) as {
      title?: string;
      body?: string;
    };

    const result = await createDocument({
      folderId: folder.folderId,
      title: payload.title ?? "",
      markdown: payload.body ?? "",
      actualAuthorEmail: email,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
