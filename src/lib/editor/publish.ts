import {
  ConfluenceApiError,
  findPublishedPageBySlug,
  getConfiguredSpace,
  getPage,
  getPageProperty,
  invalidateSlugIndexCache,
  movePage,
  upsertPageProperty,
} from "@/lib/confluence/client";
import { hidePageFromOthers, revealPageToSpace } from "./access";
import { createPersonalFolder, findPersonalFolder } from "./folder";
import { ConflictError, NotFoundError, ValidationError } from "./errors";

const PUBLISH_PROPERTY_KEY = "publishMetadata";
const AUTHOR_PROPERTY_KEY = "authorMeta";

export interface PublishViewerMetadata {
  slug: string;
  metaDescription: string;
}

export interface PublishMetadata {
  isPublished: boolean;
  publishedAt?: string;
  viewers: Record<string, PublishViewerMetadata>;
}

export interface SetPublishStateInput {
  pageId: string;
  isPublished: boolean;
  viewers?: Record<string, PublishViewerMetadata>;
}

async function getPublishPropertyOrThrow(pageId: string) {
  try {
    return await getPageProperty<PublishMetadata>(pageId, PUBLISH_PROPERTY_KEY);
  } catch (error) {
    if (error instanceof ConfluenceApiError && error.status === 404) {
      throw new NotFoundError("문서를 찾을 수 없습니다.");
    }
    throw error;
  }
}

/** 문서의 현재 게시 설정을 조회한다. 설정 이력이 없으면 기본값(미게시, 빈 viewers)을 반환한다. */
export async function getPublishState(pageId: string): Promise<PublishMetadata> {
  const property = await getPublishPropertyOrThrow(pageId);
  return property?.value ?? { isPublished: false, viewers: {} };
}

async function assertNoSlugConflict(
  pageId: string,
  previousViewers: Record<string, PublishViewerMetadata>,
  nextViewers: Record<string, PublishViewerMetadata>
) {
  let space: Awaited<ReturnType<typeof getConfiguredSpace>> | undefined;

  for (const [viewerId, meta] of Object.entries(nextViewers)) {
    if (!meta.slug || !meta.metaDescription) {
      throw new ValidationError(`뷰어(${viewerId})의 slug와 metaDescription은 필수입니다.`);
    }

    const previousSlug = previousViewers[viewerId]?.slug;
    if (previousSlug === meta.slug) {
      continue;
    }

    // Lazy load space only when a slug conflict check is actually needed
    if (!space) {
      space = await getConfiguredSpace();
    }

    const conflictingPage = await findPublishedPageBySlug(
      space.id,
      viewerId,
      meta.slug,
      PUBLISH_PROPERTY_KEY
    );
    if (conflictingPage && conflictingPage.id !== pageId) {
      throw new ConflictError(`뷰어(${viewerId})에서 이미 사용 중인 slug입니다.`);
    }
  }
}

/** 문서의 `authorMeta`에서 작성자를 찾아 그 계정 폴더(초안/게시 서브폴더 포함)를 반환한다. */
async function getAuthorFolderOrThrow(pageId: string) {
  const authorProperty = await getPageProperty<{ actualAuthorEmail: string }>(
    pageId,
    AUTHOR_PROPERTY_KEY
  );
  const authorEmail = authorProperty?.value?.actualAuthorEmail;
  if (!authorEmail) {
    throw new Error("작성자 정보를 찾을 수 없어 문서를 이동할 수 없습니다.");
  }
  return (await findPersonalFolder(authorEmail)) ?? (await createPersonalFolder(authorEmail));
}

/**
 * 문서의 게시 여부·뷰어별 slug/메타 설명을 설정한다.
 *
 * 현재 게시 여부는 저장된 `publishMetadata.isPublished` 플래그가 아니라 **실제 페이지 위치**
 * (부모가 작성자 계정 폴더의 "게시" 서브폴더인지)로 판단하고, 물리적 이동/권한 제한 토글을
 * 메타데이터 기록보다 **먼저** 수행한다. 중간에 실패하더라도 저장된 메타데이터가 실제 상태보다
 * 뒤처지기만 하므로(공개 폴더에 있는 문서를 "초안"이라고 잘못 표시하는 fail-open 상태가 생기지
 * 않음), 같은 요청을 그대로 재시도하면 실제 위치에서 올바른 동작이 다시 도출된다.
 *
 * 위치 판단을 위해서도 작성자의 계정 폴더(`publishedFolderId`)를 먼저 알아야 하므로, 게시·
 * 게시취소 두 분기 모두 작성자 조회를 선행한다.
 */
export async function setPublishState(input: SetPublishStateInput) {
  const existingProperty = await getPublishPropertyOrThrow(input.pageId);
  const previousState: PublishMetadata =
    existingProperty?.value ?? { isPublished: false, viewers: {} };

  const [currentPage, authorFolder] = await Promise.all([
    getPage(input.pageId),
    getAuthorFolderOrThrow(input.pageId),
  ]);
  const isCurrentlyPublished = currentPage.parentId === authorFolder.publishedFolderId;

  if (input.isPublished) {
    const viewers = input.viewers ?? previousState.viewers;
    if (Object.keys(viewers).length === 0) {
      throw new ValidationError("게시 시 최소 하나의 뷰어 설정이 필요합니다.");
    }
    await assertNoSlugConflict(input.pageId, previousState.viewers, viewers);

    if (!isCurrentlyPublished) {
      await movePage(input.pageId, authorFolder.publishedFolderId);
      await revealPageToSpace(input.pageId);
    }

    const value: PublishMetadata = {
      isPublished: true,
      publishedAt: new Date().toISOString(),
      viewers,
    };
    await upsertPageProperty(input.pageId, PUBLISH_PROPERTY_KEY, value);
    // P0-5a: 이 프로세스가 방금 새 slug를 게시했으니, 캐시된 slug 인덱스가 있다면
    // 곧바로 비워서 스스로는 항상 최신 상태를 보게 한다(예: 연속으로 다른 문서를 같은
    // slug로 게시하려는 시도를 놓치지 않는다).
    invalidateSlugIndexCache();

    return { pageId: input.pageId, isPublished: true, viewers, publishedAt: value.publishedAt };
  }

  if (isCurrentlyPublished) {
    // 제한을 먼저 걸고 나서 옮긴다. Confluence 페이지 제한은 부모로부터 상속되지 않으므로
    // (설계 문서 "숨김 메커니즘 — 상속에 의존하지 않는 명시적 제한"), 순서를 뒤집으면 이동
    // 성공 후 제한 실패 시 문서가 제한 없이 개인 폴더에 놓여 Space 구성원에게 노출된다.
    // 이 순서에서는 최악의 경우가 "제한된 상태로 잘못된 위치에 남음"이라 노출 창이 없다.
    await hidePageFromOthers(input.pageId);
    await movePage(input.pageId, authorFolder.draftFolderId);
  }

  const value: PublishMetadata = { isPublished: false, viewers: previousState.viewers };
  await upsertPageProperty(input.pageId, PUBLISH_PROPERTY_KEY, value);

  return { pageId: input.pageId, isPublished: false, viewers: value.viewers };
}
