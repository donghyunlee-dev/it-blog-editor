import {
  ConfluenceApiError,
  getPage,
  getPageProperty,
  movePage,
  upsertPageProperty,
} from "@/lib/confluence/client";
import { hidePageFromOthers, revealPageToSpace } from "./access";
import { createPersonalFolder, findPersonalFolder } from "./folder";
import { NotFoundError, ValidationError } from "./errors";

const PUBLISH_PROPERTY_KEY = "publishMetadata";
const AUTHOR_PROPERTY_KEY = "authorMeta";

/** 클라이언트(PublishForm)가 보내는 뷰어별 입력값 — 아직 공개 slug가 계산되기 전이다. */
export interface PublishViewerInput {
  slug: string;
  metaDescription: string;
}

export interface PublishViewerMetadata extends PublishViewerInput {
  /**
   * 실제 공개 URL에 쓰이는 최종 slug(`slug-{내부 고유키}`). 내부 고유키는 문서 생성 시
   * `randomUUID()`로 발급되어 Confluence 페이지의 실제 title로 저장된 값을 그대로
   * 재사용한다(P0-7, `documents.ts`의 `createDocument` 참고) — 이미 전역 유일이 보장된
   * 값이라 이걸 그대로 slug 뒤에 붙이면 다른 사용자의 slug와 절대 겹치지 않는다
   * (구조적으로 충돌이 불가능해져, 예전처럼 Space 전체를 스캔해 중복을 검사할 필요가
   * 없어졌다 — P0-5b). Tech Blog 등 뷰어는 공개 URL에서 이 값을 그대로 쓰고, 마지막
   * 구분자(`-`) 뒤 고정 길이(36자) UUID만 떼어내 그 값으로 페이지를 조회하면 검색
   * 없이 바로 문서를 찾을 수 있다.
   */
  publicSlug: string;
}

export interface PublishMetadata {
  isPublished: boolean;
  publishedAt?: string;
  viewers: Record<string, PublishViewerMetadata>;
}

export interface SetPublishStateInput {
  pageId: string;
  isPublished: boolean;
  viewers?: Record<string, PublishViewerInput>;
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

/**
 * 뷰어별 slug/metaDescription을 검증하고, 각 slug 뒤에 이 문서의 내부 고유키(Confluence
 * 페이지의 실제 title — 생성 시 발급된 뒤 절대 바뀌지 않는다, `documents.ts` 참고)를 붙인
 * `publicSlug`를 계산해 채워 넣는다.
 *
 * 내부 고유키가 이미 전역 유일이므로 이 결과는 다른 모든 문서의 slug와 항상 다르다 — 예전
 * 처럼 Space 전체를 스캔해 다른 문서와 겹치는지 확인할 필요가 구조적으로 없어졌다(P0-5b).
 */
function validateAndComposeViewers(
  internalKey: string,
  nextViewers: Record<string, PublishViewerInput>
): Record<string, PublishViewerMetadata> {
  const composed: Record<string, PublishViewerMetadata> = {};

  for (const [viewerId, meta] of Object.entries(nextViewers)) {
    if (!meta.slug || !meta.metaDescription) {
      throw new ValidationError(`뷰어(${viewerId})의 slug와 metaDescription은 필수입니다.`);
    }
    composed[viewerId] = {
      slug: meta.slug,
      metaDescription: meta.metaDescription,
      publicSlug: `${meta.slug}-${internalKey}`,
    };
  }

  return composed;
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
    const requestedViewers = input.viewers ?? previousState.viewers;
    if (Object.keys(requestedViewers).length === 0) {
      throw new ValidationError("게시 시 최소 하나의 뷰어 설정이 필요합니다.");
    }
    const viewers = validateAndComposeViewers(currentPage.title, requestedViewers);

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
