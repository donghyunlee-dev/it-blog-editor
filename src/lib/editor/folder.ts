import {
  createPage,
  findChildPageByTitle,
  getConfiguredSpace,
} from "@/lib/confluence/client";
import { ConflictError } from "./errors";

export interface PersonalFolder {
  folderId: string;
  spaceKey: string;
}

async function getSpaceHomepageId(): Promise<{ id: string; key: string; homepageId: string }> {
  const space = await getConfiguredSpace();
  if (!space.homepageId) {
    throw new Error("Confluence Space에 홈페이지가 설정되어 있지 않습니다.");
  }
  return { id: space.id, key: space.key, homepageId: space.homepageId };
}

/** 로그인 사용자의 이메일을 제목으로 하는 개인 폴더(Space 홈페이지 하위 페이지)를 조회한다. */
export async function findPersonalFolder(
  email: string
): Promise<PersonalFolder | null> {
  const space = await getSpaceHomepageId();
  const page = await findChildPageByTitle(space.homepageId, email);
  if (!page) {
    return null;
  }
  return { folderId: page.id, spaceKey: space.key };
}

/** 개인 폴더가 없으면 새로 생성한다. 이미 있으면 ConflictError를 던진다. */
export async function createPersonalFolder(
  email: string
): Promise<PersonalFolder> {
  const space = await getSpaceHomepageId();
  const existing = await findChildPageByTitle(space.homepageId, email);
  if (existing) {
    throw new ConflictError("개인 폴더가 이미 존재합니다.");
  }

  const page = await createPage({
    spaceId: space.id,
    parentId: space.homepageId,
    title: email,
    bodyValue: `<p>${email}님의 개인 폴더입니다.</p>`,
  });

  return { folderId: page.id, spaceKey: space.key };
}
