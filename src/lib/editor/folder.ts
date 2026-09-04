import {
  createPage,
  deletePage,
  findChildPageByTitle,
  getConfiguredSpace,
} from "@/lib/confluence/client";
import { initializeAccountMeta } from "./account";
import { ConflictError, NotFoundError } from "./errors";

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

  await initializeAccountMeta(accountFolder.id, email);

  return { accountFolderId: accountFolder.id, spaceKey: space.key };
}

/**
 * 계정 폴더를 찾고, 없으면 만든다. `/editor` layout과 `/welcome` 페이지 양쪽이 로그인 직후
 * 똑같이 "계정 폴더가 있어야 한다"는 전제로 시작하므로(P5-2 리다이렉트 온보딩 흐름), 그
 * find-or-create 로직을 여기 하나로 모은다. 동시 요청으로 인한 `ConflictError`(둘 다 동시에
 * 생성을 시도한 경우)는 재조회로 흡수한다 — 그래도 못 찾으면(사실상 일어나지 않는 경쟁
 * 상황) 원래 오류를 그대로 전파한다.
 */
export async function ensurePersonalFolder(email: string): Promise<PersonalFolder> {
  const existing = await findPersonalFolder(email);
  if (existing) return existing;

  try {
    return await createPersonalFolder(email);
  } catch (error) {
    if (error instanceof ConflictError) {
      const folder = await findPersonalFolder(email);
      if (folder) return folder;
    }
    throw error;
  }
}

/**
 * 계정 폴더(및 그 하위 문서 전체)를 Confluence 휴지통으로 이동한다 — 다음 로그인 때
 * 완전히 새로 가입한 계정처럼 재현할 수 있게 하는 테스트/운영 도구다(`scripts/reset-account.ts`
 * 전용, 애플리케이션 코드 경로에서는 호출하지 않는다). 영구 삭제가 아니라 휴지통 이동이라
 * Confluence 관리자 화면에서 복구할 수 있다.
 */
export async function deletePersonalFolder(email: string): Promise<void> {
  const folder = await findPersonalFolder(email);
  if (!folder) {
    throw new NotFoundError(`계정 폴더를 찾을 수 없습니다: ${email}`);
  }
  await deletePage(folder.accountFolderId);
}
