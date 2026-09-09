import { NextResponse } from "next/server";
import { requireSessionEmail } from "@/lib/auth-guard";
import { toErrorResponse } from "@/lib/api-response";
import { NotFoundError } from "@/lib/editor/errors";
import { findPersonalFolder } from "@/lib/editor/folder";
import { deleteFolder, renameFolder } from "@/lib/editor/folders";

interface RouteContext {
  params: Promise<{ folderId: string }>;
}

export async function PUT(request: Request, { params }: RouteContext) {
  try {
    const email = await requireSessionEmail();
    const { folderId } = await params;
    const folder = await findPersonalFolder(email);
    if (!folder) {
      throw new NotFoundError("개인 폴더가 없습니다.");
    }

    const payload = (await request.json()) as { name?: string };
    const node = await renameFolder(folder.accountFolderId, folderId, payload.name ?? "");

    return NextResponse.json(node);
  } catch (error) {
    return toErrorResponse(error);
  }
}

/** 하위 폴더는 삭제되지 않고 상위로 승격된다(P7-2, `folders.ts`의 `deleteFolder` 참고). */
export async function DELETE(_request: Request, { params }: RouteContext) {
  try {
    const email = await requireSessionEmail();
    const { folderId } = await params;
    const folder = await findPersonalFolder(email);
    if (!folder) {
      throw new NotFoundError("개인 폴더가 없습니다.");
    }

    await deleteFolder(folder.accountFolderId, folderId);

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
