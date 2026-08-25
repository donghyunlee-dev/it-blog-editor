import { createPage, findChildPageByTitle, getConfiguredSpace } from "@/lib/confluence/client";
import { hidePageFromOthers } from "./access";
import { ConflictError } from "./errors";

const DRAFT_SUBFOLDER_TITLE = "초안";
const PUBLISHED_SUBFOLDER_TITLE = "게시";

export interface PersonalFolder {
  accountFolderId: string;
  draftFolderId: string;
  publishedFolderId: string;
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
 * Space 홈페이지 하위에서 이메일 제목의 계정 폴더를 찾고, 그 하위의 "초안"/"게시" 서브폴더를 함께 조회한다.
 * 계정 폴더는 있는데 서브폴더 중 하나라도 없으면 데이터 손상으로 보고 에러를 던진다.
 */
export async function findPersonalFolder(email: string): Promise<PersonalFolder | null> {
  const space = await getSpaceHomepageId();
  const accountFolder = await findChildPageByTitle(space.homepageId, email);
  if (!accountFolder) return null;

  const [draftFolder, publishedFolder] = await Promise.all([
    findChildPageByTitle(accountFolder.id, DRAFT_SUBFOLDER_TITLE),
    findChildPageByTitle(accountFolder.id, PUBLISHED_SUBFOLDER_TITLE),
  ]);
  if (!draftFolder || !publishedFolder) {
    throw new Error(
      `계정 폴더(${email}) 하위에 "${DRAFT_SUBFOLDER_TITLE}"/"${PUBLISHED_SUBFOLDER_TITLE}" 서브폴더가 없습니다.`
    );
  }

  return {
    accountFolderId: accountFolder.id,
    draftFolderId: draftFolder.id,
    publishedFolderId: publishedFolder.id,
    spaceKey: space.key,
  };
}

/**
 * 계정 폴더(제한 없음)와 그 하위의 "초안"(작성자 본인 전용, 제한 있음)/"게시"(제한 없음) 서브폴더를
 * 새로 만든다. 이미 계정 폴더가 있으면 ConflictError를 던진다.
 */
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

  const [draftFolder, publishedFolder] = await Promise.all([
    createPage({
      spaceId: space.id,
      parentId: accountFolder.id,
      title: DRAFT_SUBFOLDER_TITLE,
      bodyValue: "<p>작성 중인 초안입니다. 작성자 본인 외에는 보이지 않습니다.</p>",
    }),
    createPage({
      spaceId: space.id,
      parentId: accountFolder.id,
      title: PUBLISHED_SUBFOLDER_TITLE,
      bodyValue: "<p>게시된 문서입니다.</p>",
    }),
  ]);

  await hidePageFromOthers(draftFolder.id);

  return {
    accountFolderId: accountFolder.id,
    draftFolderId: draftFolder.id,
    publishedFolderId: publishedFolder.id,
    spaceKey: space.key,
  };
}
