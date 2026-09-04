import { auth } from "@/lib/auth";
import { getAccountMeta } from "@/lib/editor/account";
import { AccessDisabledError, UnauthorizedError } from "@/lib/editor/errors";
import { findPersonalFolder } from "@/lib/editor/folder";

export { AccessDisabledError, UnauthorizedError };

/**
 * Editor API의 인증 경계. 유효한 세션이 없으면 UnauthorizedError를 던진다.
 * 세션의 이메일을 실제 작성자 식별자(actualAuthorEmail)로 사용한다.
 *
 * P5-3: 관리자가 계정 접속을 차단(`accountMeta.accessEnabled = false`)했으면
 * `AccessDisabledError`를 던져 모든 `/api/editor/**` 요청을 여기 한 곳에서 막는다.
 * 계정 폴더가 아직 없으면(이론상 `/editor`를 한 번도 거치지 않은 세션) 검사 자체를
 * 건너뛴다 — 이 함수는 인증 경계이지 계정 폴더를 새로 만들 책임까지는 지지 않는다
 * (폴더 생성은 `/editor/layout.tsx`·`/welcome/page.tsx`의 몫).
 */
export async function requireSessionEmail(): Promise<string> {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) {
    throw new UnauthorizedError();
  }

  const folder = await findPersonalFolder(email);
  if (folder) {
    const accountMeta = await getAccountMeta(folder.accountFolderId);
    if (!accountMeta.accessEnabled) {
      throw new AccessDisabledError();
    }
  }

  return email;
}
