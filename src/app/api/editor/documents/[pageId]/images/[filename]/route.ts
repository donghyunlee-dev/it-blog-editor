import { NextResponse } from "next/server";
import { requireSessionEmail } from "@/lib/auth-guard";
import { toErrorResponse } from "@/lib/api-response";
import { requireDocumentAccess } from "@/lib/editor/documents";
import { downloadAttachment } from "@/lib/confluence/client";

interface RouteContext {
  params: Promise<{ pageId: string; filename: string }>;
}

/**
 * 문서 안 이미지를 실제로 내려주는 프록시(2026-09-07 추가). Confluence의 원본 첨부파일
 * URL은 Confluence 자체 인증이 있어야 열리므로, `<img src>`가 그 URL을 직접 가리키면
 * 브라우저는 인증 없이 요청해 깨진 이미지만 보인다 — 이 라우트가 서버(API 토큰 인증)를
 * 대신 거쳐 바이트를 내려준다. `POST .../images`(업로드)가 클라이언트에 돌려주는 `url`도
 * 이제 Confluence 원본 링크 대신 이 라우트를 가리킨다.
 */
export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const email = await requireSessionEmail();
    const { pageId, filename } = await params;
    await requireDocumentAccess(pageId, email); // 소유자뿐 아니라 공유받은 사람도 볼 수 있어야 한다(P6-6)

    const { data, contentType } = await downloadAttachment(pageId, filename);

    return new NextResponse(data, {
      headers: {
        "Content-Type": contentType,
        // 이미지 자체는 첨부파일 교체 없이는 안 바뀌지만, 접근 권한(공유 해제 등)이 바뀔 수
        // 있어 공유 캐시(CDN 등)에는 남기지 않는다 — 브라우저 자체 캐시만 짧게 허용한다.
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
