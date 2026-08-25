import { createPage, findChildPageByTitle, getConfiguredSpace } from "@/lib/confluence/client";
import { hidePageFromOthers } from "./access";
import { ConflictError } from "./errors";

const DRAFT_SUBFOLDER_TITLE = "초안";
const PUBLISHED_SUBFOLDER_TITLE = "게시";
const DRAFT_SUBFOLDER_BODY =
  "<p>작성 중인 초안입니다. 작성자 본인 외에는 보이지 않습니다.</p>";
const PUBLISHED_SUBFOLDER_BODY = "<p>게시된 문서입니다.</p>";

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

async function createSubfolder(
  space: { id: string },
  accountFolderId: string,
  title: string,
  bodyValue: string
) {
  return createPage({
    spaceId: space.id,
    parentId: accountFolderId,
    title,
    bodyValue,
  });
}

/**
 * Space 홈페이지 하위에서 이메일 제목의 계정 폴더를 찾고, 그 하위의 "초안"/"게시" 서브폴더를 함께 조회한다.
 *
 * 계정 폴더는 있는데 서브폴더 중 하나라도 없으면(예: `createPersonalFolder`가 계정 폴더까지는
 * 만들었지만 네트워크 문제 등으로 서브폴더 생성 중 실패한 부분 실패 상태) 에러를 던지지 않고
 * 여기서 그 자리에 없는 서브폴더를 만들어 자가 복구한다. "초안" 서브폴더를 새로 만든 경우에는
 * `createPersonalFolder`와 동일하게 항상 `hidePageFromOthers`로 제한을 건다 — 이 복구 경로가
 * 없으면 신규 사용자의 최초 로그인마다(과거 설계에서는 운영자의 1회 셋업에서만 발생했던 위험이
 * 이제는 모든 신규 사용자에게 열려 있음) 부분 실패가 영구적인 에러로 남는다.
 */
export async function findPersonalFolder(email: string): Promise<PersonalFolder | null> {
  const space = await getSpaceHomepageId();
  const accountFolder = await findChildPageByTitle(space.homepageId, email);
  if (!accountFolder) return null;

  const [existingDraftFolder, existingPublishedFolder] = await Promise.all([
    findChildPageByTitle(accountFolder.id, DRAFT_SUBFOLDER_TITLE),
    findChildPageByTitle(accountFolder.id, PUBLISHED_SUBFOLDER_TITLE),
  ]);

  let draftFolder = existingDraftFolder;
  if (!draftFolder) {
    draftFolder = await createSubfolder(
      space,
      accountFolder.id,
      DRAFT_SUBFOLDER_TITLE,
      DRAFT_SUBFOLDER_BODY
    );
    await hidePageFromOthers(draftFolder.id);
  }

  let publishedFolder = existingPublishedFolder;
  if (!publishedFolder) {
    publishedFolder = await createSubfolder(
      space,
      accountFolder.id,
      PUBLISHED_SUBFOLDER_TITLE,
      PUBLISHED_SUBFOLDER_BODY
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
    createSubfolder(space, accountFolder.id, DRAFT_SUBFOLDER_TITLE, DRAFT_SUBFOLDER_BODY),
    createSubfolder(
      space,
      accountFolder.id,
      PUBLISHED_SUBFOLDER_TITLE,
      PUBLISHED_SUBFOLDER_BODY
    ),
  ]);

  await hidePageFromOthers(draftFolder.id);

  return {
    accountFolderId: accountFolder.id,
    draftFolderId: draftFolder.id,
    publishedFolderId: publishedFolder.id,
    spaceKey: space.key,
  };
}
