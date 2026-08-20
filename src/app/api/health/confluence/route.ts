import { NextResponse } from "next/server";
import { getCurrentConfluenceUser } from "@/lib/confluence/client";

export async function GET() {
  try {
    const user = await getCurrentConfluenceUser();
    return NextResponse.json({ status: "ok", user });
  } catch (error) {
    const message = error instanceof Error ? error.message : "알 수 없는 오류";
    return NextResponse.json({ status: "error", message }, { status: 502 });
  }
}
