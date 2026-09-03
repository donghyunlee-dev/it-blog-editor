import { createPage, findChildPageByTitle, getConfiguredSpace } from "@/lib/confluence/client";
import { initializeAccountMeta } from "./account";
import { ConflictError } from "./errors";

export interface PersonalFolder {
  accountFolderId: string;
  spaceKey: string;
}

async function getSpaceHomepageId() {
  const space = await getConfiguredSpace();
  if (!space.homepageId) {
    throw new Error("Confluence Space에 홈페이지가 설정되어 있지 않습니다.");
  }
  return { id: space.id, key: space.key, homepageId: space.homepageId };
}

/**
 * Space 홈페이지 하위에서 이메일 제목의 계정 폴더를 찾는다.
 *
 * P0-8 이전에는 이 폴더 하위에 "초안"/"게시" 서브폴더를 두고 게시 여부에 따라 문서를 그
 * 사이로 이동시켰다. "Confluence는 DB 역할일 뿐 사람이 직접 열어보지 않는다"는 결정(P0-7)
 * 이후, 폴더 이동이 있던 이유(사람이 트리를 탐색해 구분해본다는 전제)가 사라져 계정 폴더
 * 하나로 단순화했다 — 게시 여부는 이제 `publishMetadata` property와 페이지 restriction만으로
 * 판단한다(`documents.ts`/`publish.ts` 참고).
 */
export async function findPersonalFolder(email: string): Promise<PersonalFolder | null> {
  const space = await getSpaceHomepageId();
  const accountFolder = await findChildPageByTitle(space.homepageId, email);
  if (!accountFolder) return null;

  return { accountFolderId: accountFolder.id, spaceKey: space.key };
}

/** 계정 폴더(제한 없음 — Space 기본 권한)를 새로 만든다. 이미 있으면 ConflictError를 던진다. */
export async function createPersonalFolder(email: string): Promise<PersonalFolder> {
  const space = await getSpaceHomepageId();

  const existing = await findChildPageByTitle(space.homepageId, email);
  if (existing) {
    throw new ConflictError("개인 폴더가 이미 존재합니다.");
  }

  const accountFolder = await createPage({
    spaceId: space.id,
    parentId: space.homepageId,
    title: email,
    bodyValue: `<p>${email}님의 문서함입니다.</p>`,
  });

  await initializeAccountMeta(accountFolder.id);

  return { accountFolderId: accountFolder.id, spaceKey: space.key };
}
