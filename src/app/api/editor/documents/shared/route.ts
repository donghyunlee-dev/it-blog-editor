import { NextResponse } from "next/server";
import { requireSessionEmail } from "@/lib/auth-guard";
import { toErrorResponse } from "@/lib/api-response";
import { listSharedDocuments } from "@/lib/editor/documents";

/** 나에게 공유된 문서 목록(P6-5). 사이드바 "공유받은 문서" 영역이 이 API를 쓴다. */
export async function GET() {
  try {
    const email = await requireSessionEmail();
    const documents = await listSharedDocuments(email);
    return NextResponse.json({ documents });
  } catch (error) {
    return toErrorResponse(error);
  }
}
