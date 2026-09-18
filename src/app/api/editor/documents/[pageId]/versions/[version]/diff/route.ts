import { NextResponse } from "next/server";
import { requireSessionEmail } from "@/lib/auth-guard";
import { toErrorResponse } from "@/lib/api-response";
import { ValidationError } from "@/lib/editor/errors";
import { getVersionDiff, requireDocumentAccess } from "@/lib/editor/documents";

interface RouteContext {
  params: Promise<{ pageId: string; version: string }>;
}

/** P19-5: 특정 버전과 바로 이전 버전 사이의 순수 텍스트 diff — 읽기 전용(P1-2a 범위 유지). */
export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const email = await requireSessionEmail();
    const { pageId, version } = await params;
    await requireDocumentAccess(pageId, email); // 소유자뿐 아니라 공유받은 사람도 볼 수 있다(P6-6)

    const versionNumber = Number(version);
    if (!Number.isInteger(versionNumber) || versionNumber < 1) {
      throw new ValidationError("올바르지 않은 버전입니다.");
    }

    const diff = await getVersionDiff(pageId, versionNumber);

    return NextResponse.json({ diff });
  } catch (error) {
    return toErrorResponse(error);
  }
}
