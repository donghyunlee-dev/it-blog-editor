import { NextResponse } from "next/server";
import { requireSessionEmail } from "@/lib/auth-guard";
import { toErrorResponse } from "@/lib/api-response";
import { createPersonalFolder, findPersonalFolder } from "@/lib/editor/folder";

export async function GET() {
  try {
    const email = await requireSessionEmail();
    const folder = await findPersonalFolder(email);

    if (!folder) {
      return NextResponse.json({ exists: false });
    }

    return NextResponse.json({
      exists: true,
      folderId: folder.folderId,
      spaceKey: folder.spaceKey,
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST() {
  try {
    const email = await requireSessionEmail();
    const folder = await createPersonalFolder(email);

    return NextResponse.json(
      { folderId: folder.folderId, spaceKey: folder.spaceKey },
      { status: 201 }
    );
  } catch (error) {
    return toErrorResponse(error);
  }
}
