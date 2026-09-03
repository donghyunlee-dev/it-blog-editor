import { NextResponse } from "next/server";
import { requireSessionEmail } from "@/lib/auth-guard";
import { toErrorResponse } from "@/lib/api-response";
import { NotFoundError } from "@/lib/editor/errors";
import { findPersonalFolder } from "@/lib/editor/folder";
import { getAccountMeta, needsOnboarding, saveAccountMeta } from "@/lib/editor/account";

export async function GET() {
  try {
    const email = await requireSessionEmail();
    const folder = await findPersonalFolder(email);
    if (!folder) {
      throw new NotFoundError("개인 폴더가 없습니다. 먼저 개인 폴더를 생성하세요.");
    }

    const meta = await getAccountMeta(folder.accountFolderId);
    return NextResponse.json({
      email,
      name: meta.name,
      team: meta.team,
      needsOnboarding: needsOnboarding(meta),
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function PUT(request: Request) {
  try {
    const email = await requireSessionEmail();
    const folder = await findPersonalFolder(email);
    if (!folder) {
      throw new NotFoundError("개인 폴더가 없습니다. 먼저 개인 폴더를 생성하세요.");
    }

    const payload = (await request.json()) as { name?: string; team?: string };
    const meta = await saveAccountMeta(folder.accountFolderId, {
      name: payload.name ?? "",
      team: payload.team ?? "",
    });

    return NextResponse.json({ email, name: meta.name, team: meta.team });
  } catch (error) {
    return toErrorResponse(error);
  }
}
