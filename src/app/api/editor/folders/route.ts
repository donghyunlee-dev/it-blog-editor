import { NextResponse } from "next/server";
import { requireSessionEmail } from "@/lib/auth-guard";
import { toErrorResponse } from "@/lib/api-response";
import { NotFoundError } from "@/lib/editor/errors";
import { findPersonalFolder } from "@/lib/editor/folder";
import { createFolder, listFolders } from "@/lib/editor/folders";

/** 폴더는 항상 요청자 본인의 계정 폴더 소속이다 — 공유 개념이 없는 개인 소유 리소스라 pageId 같은 경로 파라미터가 필요 없다. */
export async function GET() {
  try {
    const email = await requireSessionEmail();
    const folder = await findPersonalFolder(email);

    if (!folder) {
      return NextResponse.json({ folders: [] });
    }

    const folders = await listFolders(folder.accountFolderId);
    return NextResponse.json({ folders });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const email = await requireSessionEmail();
    const folder = await findPersonalFolder(email);

    if (!folder) {
      throw new NotFoundError("개인 폴더가 없습니다. 먼저 개인 폴더를 생성하세요.");
    }

    const payload = (await request.json()) as { name?: string; parentId?: string | null };

    const node = await createFolder(folder.accountFolderId, {
      name: payload.name ?? "",
      parentId: payload.parentId ?? null,
    });

    return NextResponse.json(node, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
