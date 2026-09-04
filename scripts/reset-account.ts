/**
 * 계정 폴더(및 그 하위 문서 전체)를 Confluence 휴지통으로 이동해, 다음 로그인 때 완전히
 * 새로 가입한 계정처럼 재현할 수 있게 하는 테스트/개발용 스크립트다. 온보딩(P5-2)·접속
 * 권한 게이트(P5-3) 등 "신규 가입 흐름"을 반복해서 확인해야 할 때 쓴다.
 *
 * 영구 삭제가 아니라 휴지통 이동이라 Confluence 관리자 화면에서 복구할 수 있다. 이 저장소
 * 밖(실제 Confluence 인스턴스)에 쓰기 작업을 하므로, 대상 이메일을 반드시 인자로 직접
 * 지정해야 하고 `--yes` 없이는 실제로 지우지 않는다(무엇을 지울지 먼저 보여준다).
 *
 * 사용법:
 *   npm run reset-account -- <email>          # 무엇을 지울지 미리 보여준다(실행 안 함)
 *   npm run reset-account -- <email> --yes    # 실제로 휴지통에 옮긴다
 */
import { deletePersonalFolder, findPersonalFolder } from "@/lib/editor/folder";
import { NotFoundError } from "@/lib/editor/errors";

async function main() {
  const [email, ...flags] = process.argv.slice(2);
  if (!email) {
    console.error("사용법: npm run reset-account -- <email> [--yes]");
    process.exit(1);
  }

  const folder = await findPersonalFolder(email);
  if (!folder) {
    console.log(`계정 폴더를 찾을 수 없습니다(이미 없거나 삭제됨): ${email}`);
    return;
  }

  console.log(`계정 폴더를 찾았습니다: pageId=${folder.accountFolderId}, email=${email}`);

  if (!flags.includes("--yes")) {
    console.log(
      "실제로는 지우지 않았습니다(dry run). 정말 휴지통으로 옮기려면 --yes를 붙여 다시 실행하세요."
    );
    return;
  }

  try {
    await deletePersonalFolder(email);
    console.log(`휴지통으로 이동 완료: ${email} (하위 문서도 함께 이동됨, Confluence에서 복구 가능)`);
  } catch (error) {
    if (error instanceof NotFoundError) {
      console.log(`계정 폴더를 찾을 수 없습니다(이미 없거나 삭제됨): ${email}`);
      return;
    }
    throw error;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
