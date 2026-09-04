/**
 * 계정별 접속 허용(Y)/차단(N)을 관리자가 직접 바꾸는 스크립트(P5-6). 접속 권한 게이트
 * (P5-3)가 `accountMeta.accessEnabled`를 강제하는 쪽은 이미 있지만, 그 값을 바꾸는
 * 화면(UI)은 이번 범위에 두지 않기로 했다(2026-09-03 결정) — 서비스 계정 자격증명에
 * 접근 가능한 사람이 로컬에서 이 스크립트로 직접 바꾼다.
 *
 * 사용법:
 *   npm run set-account-access -- <email> on    # 접속 허용
 *   npm run set-account-access -- <email> off   # 접속 차단
 */
import { findPersonalFolder } from "@/lib/editor/folder";
import { setAccessEnabled } from "@/lib/editor/account";

async function main() {
  const [email, mode] = process.argv.slice(2);
  if (!email || (mode !== "on" && mode !== "off")) {
    console.error("사용법: npm run set-account-access -- <email> <on|off>");
    process.exit(1);
  }

  const folder = await findPersonalFolder(email);
  if (!folder) {
    console.log(`계정 폴더를 찾을 수 없습니다(아직 한 번도 로그인하지 않은 계정일 수 있습니다): ${email}`);
    return;
  }

  const updated = await setAccessEnabled(folder.accountFolderId, email, mode === "on");
  console.log(
    `${email} 계정의 접속 권한을 ${updated.accessEnabled ? "허용(Y)" : "차단(N)"}으로 변경했습니다.`
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
