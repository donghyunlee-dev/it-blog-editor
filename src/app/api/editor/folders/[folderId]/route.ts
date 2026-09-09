import { NextResponse } from "next/server";
import { requireSessionEmail } from "@/lib/auth-guard";
import { toErrorResponse } from "@/lib/api-response";
import { NotFoundError } from "@/lib/editor/errors";
import { findPersonalFolder } from "@/lib/editor/folder";
import { deleteFolder, renameFolder } from "@/lib/editor/folders";
import { reassignDocumentsFolder } from "@/lib/editor/documents";

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

/**
 * 하위 폴더도, 그 안에 있던 문서도 삭제되지 않고 상위로 승격된다(P7-2가 폴더 쪽을,
 * P7-3이 문서 쪽을 완성). `folders.ts`는 문서를 몰라야 하므로(순환 참조 방지), 이 라우트가
 * `deleteFolder`가 돌려주는 삭제된 노드의 `parentId`로 `reassignDocumentsFolder`를 이어
 * 호출해 두 오케스트레이션을 조립한다.
 */
export async function DELETE(_request: Request, { params }: RouteContext) {
  try {
    const email = await requireSessionEmail();
    const { folderId } = await params;
    const folder = await findPersonalFolder(email);
    if (!folder) {
      throw new NotFoundError("개인 폴더가 없습니다.");
    }

    const deleted = await deleteFolder(folder.accountFolderId, folderId);
    await reassignDocumentsFolder(folder.accountFolderId, deleted.id, deleted.parentId);

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
