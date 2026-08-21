import { findChildPageByTitle, getConfiguredSpace } from "@/lib/confluence/client";

const DRAFTS_ROOT_TITLE = "초안";
const PUBLISHED_ROOT_TITLE = "게시됨";

export interface ContentRoots {
  draftsRootId: string;
  publishedRootId: string;
}

export async function getContentRoots(): Promise<ContentRoots> {
  const space = await getConfiguredSpace();
  if (!space.homepageId) {
    throw new Error("Confluence Space에 홈페이지가 설정되어 있지 않습니다.");
  }

  const [draftsRoot, publishedRoot] = await Promise.all([
    findChildPageByTitle(space.homepageId, DRAFTS_ROOT_TITLE),
    findChildPageByTitle(space.homepageId, PUBLISHED_ROOT_TITLE),
  ]);

  if (!draftsRoot || !publishedRoot) {
    throw new Error(
      `Confluence Space에 "${DRAFTS_ROOT_TITLE}"/"${PUBLISHED_ROOT_TITLE}" 루트 페이지가 준비되어 있지 않습니다. 운영자가 두 페이지를 먼저 만들고 "${DRAFTS_ROOT_TITLE}"에 권한 제한을 설정해야 합니다.`
    );
  }

  return { draftsRootId: draftsRoot.id, publishedRootId: publishedRoot.id };
}
