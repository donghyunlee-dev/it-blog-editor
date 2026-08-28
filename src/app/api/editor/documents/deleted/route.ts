import { NextResponse } from "next/server";
import { requireSessionEmail } from "@/lib/auth-guard";
import { toErrorResponse } from "@/lib/api-response";
import { listDeletedDocuments } from "@/lib/editor/deleted-documents";

export async function GET() {
  try {
    const email = await requireSessionEmail();
    const documents = await listDeletedDocuments(email);

    return NextResponse.json({ documents });
  } catch (error) {
    return toErrorResponse(error);
  }
}
