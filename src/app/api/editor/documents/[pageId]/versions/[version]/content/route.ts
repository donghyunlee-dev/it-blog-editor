import { NextResponse } from "next/server";
import { requireSessionEmail } from "@/lib/auth-guard";
import { toErrorResponse } from "@/lib/api-response";
import { ValidationError } from "@/lib/editor/errors";
import { getVersionContent, requireDocumentAccess } from "@/lib/editor/documents";

interface RouteContext {
  params: Promise<{ pageId: string; version: string }>;
}

/**
 * P19-6: 특정 버전의 저장 형식(storage HTML) 본문 — "이 버전으로 복원"의 첫 단계로,
 * 클라이언트가 이 HTML을 TipTap JSON으로 변환(브라우저 DOMParser 필요)한 뒤 기존
 * `PUT /api/editor/documents/{pageId}`로 저장한다. 이 라우트 자체는 조회만 한다
 * (읽기 전용, P1-2a 범위 유지 — 쓰기는 기존 저장 경로를 그대로 재사용).
 */
export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const email = await requireSessionEmail();
    const { pageId, version } = await params;
    await requireDocumentAccess(pageId, email); // 소유자뿐 아니라 공유받은 사람도 볼 수 있다(P6-6)

    const versionNumber = Number(version);
    if (!Number.isInteger(versionNumber) || versionNumber < 1) {
      throw new ValidationError("올바르지 않은 버전입니다.");
    }

    const html = await getVersionContent(pageId, versionNumber);

    return NextResponse.json({ html });
  } catch (error) {
    return toErrorResponse(error);
  }
}
