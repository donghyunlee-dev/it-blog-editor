import { NextResponse } from "next/server";
import { requireSessionEmail } from "@/lib/auth-guard";
import { toErrorResponse } from "@/lib/api-response";
import { ValidationError } from "@/lib/editor/errors";
import { searchAccounts } from "@/lib/editor/account-index";

/**
 * 계정 검색(P5-7). `q`가 없으면(파라미터 자체가 없는 경우) 400 — 빈 문자열("")은 파라미터가
 * 있는 것으로 취급해 전체 목록을 반환한다(`/editor/accounts` 화면의 최초 진입 시 사용).
 * `accountFolderId`는 내부 식별자라 응답에 노출하지 않는다.
 */
export async function GET(request: Request) {
  try {
    await requireSessionEmail();

    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q");
    if (q === null) {
      throw new ValidationError("검색어(q)가 필요합니다.");
    }

    const accounts = await searchAccounts(q);
    return NextResponse.json({
      accounts: accounts.map(({ email, name, team, accessEnabled }) => ({
        email,
        name,
        team,
        accessEnabled,
      })),
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
