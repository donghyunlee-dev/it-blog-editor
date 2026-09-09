import { NextResponse } from "next/server";
import { requireSessionEmail } from "@/lib/auth-guard";
import { toErrorResponse } from "@/lib/api-response";
import { registerImage } from "@/lib/editor/images";
import { requireDocumentAccess } from "@/lib/editor/documents";
import { enforceRateLimit } from "@/lib/rate-limit";

interface RouteContext {
  params: Promise<{ pageId: string }>;
}

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const email = await requireSessionEmail();
    enforceRateLimit("documents:image-upload", email);
    const { pageId } = await params;
    await requireDocumentAccess(pageId, email); // 소유자뿐 아니라 공유받은 사람도 이미지를 올릴 수 있다(P6-6)

    const formData = await request.formData();
    const file = formData.get("file");

    const attachment = await registerImage(
      pageId,
      file instanceof File ? file : null
    );

    // Confluence의 원본 다운로드 URL(attachment.url)은 Confluence 자체 인증이 있어야
    // 열려 브라우저의 <img src>가 그대로 못 쓴다 — 대신 우리 앱의 프록시 라우트를
    // 가리키게 한다(2026-09-07, 실사용 확인 — "사진 아이콘만 보이고 실제 사진이 안
    // 들어간다"). src/lib/confluence/client.ts의 downloadAttachment 주석 참고.
    //
    // `attachment.filename`을 응답에 함께 실어 보낸다(2026-09-09) — `uploadAttachment`가
    // 이제 동명 충돌을 피하려 고유 접미사를 붙인 실제 파일명으로 Confluence에 저장하므로,
    // 클라이언트가 원본 File.name을 그대로 다시 쓰면 image 노드의 filename 속성이 실제
    // 저장된 첨부파일명과 어긋난다 — 그러면 문서 저장 시 Confluence storage format의
    // <ac:image ri:filename="..."> 가 엉뚱한(흔히 "image.png" 같은 옛 첨부) 파일을
    // 가리키게 된다(실사용 확인 — Confluence 페이지를 직접 열면 에디터와 다른 사진이
    // 보임).
    return NextResponse.json(
      {
        attachmentId: attachment.attachmentId,
        url: `/api/editor/documents/${pageId}/images/${encodeURIComponent(attachment.filename)}`,
        filename: attachment.filename,
      },
      { status: 201 }
    );
  } catch (error) {
    return toErrorResponse(error);
  }
}
