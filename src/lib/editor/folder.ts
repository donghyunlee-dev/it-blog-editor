import { createPage, findChildPageByTitle, getConfiguredSpace } from "@/lib/confluence/client";
import { hidePageFromOthers } from "./access";
import { getContentRoots } from "./roots";
import { ConflictError } from "./errors";

export interface PersonalFolder {
  folderId: string;
  spaceKey: string;
}

/** 로그인 사용자의 이메일을 제목으로 하는 개인 폴더(초안 루트 하위 페이지)를 조회한다. */
export async function findPersonalFolder(email: string): Promise<PersonalFolder | null> {
  const [{ draftsRootId }, space] = await Promise.all([
    getContentRoots(),
    getConfiguredSpace(),
  ]);
  const page = await findChildPageByTitle(draftsRootId, email);
  if (!page) {
    return null;
  }
  return { folderId: page.id, spaceKey: space.key };
}

/** 개인 폴더가 없으면 초안 루트 하위에 새로 만들고, 다른 직원에게 보이지 않도록 제한한다. */
export async function createPersonalFolder(email: string): Promise<PersonalFolder> {
  const [{ draftsRootId }, space] = await Promise.all([
    getContentRoots(),
    getConfiguredSpace(),
  ]);

  const existing = await findChildPageByTitle(draftsRootId, email);
  if (existing) {
    throw new ConflictError("개인 폴더가 이미 존재합니다.");
  }

  const page = await createPage({
    spaceId: space.id,
    parentId: draftsRootId,
    title: email,
    bodyValue: `<p>${email}님의 개인 폴더입니다.</p>`,
  });

  await hidePageFromOthers(page.id);

  return { folderId: page.id, spaceKey: space.key };
}
