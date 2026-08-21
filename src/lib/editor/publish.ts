import {
  ConfluenceApiError,
  findPublishedPageBySlug,
  getConfiguredSpace,
  getPageProperty,
  upsertPageProperty,
} from "@/lib/confluence/client";
import { ConflictError, NotFoundError, ValidationError } from "./errors";

const PUBLISH_PROPERTY_KEY = "publishMetadata";

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
  for (const [viewerId, meta] of Object.entries(nextViewers)) {
    if (!meta.slug || !meta.metaDescription) {
      throw new ValidationError(`뷰어(${viewerId})의 slug와 metaDescription은 필수입니다.`);
    }

    const previousSlug = previousViewers[viewerId]?.slug;
    if (previousSlug === meta.slug) {
      continue;
    }

    const space = await getConfiguredSpace();
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

/** 문서의 게시 여부·뷰어별 slug/메타 설명을 설정한다. */
export async function setPublishState(input: SetPublishStateInput) {
  const existingProperty = await getPublishPropertyOrThrow(input.pageId);
  const previousState: PublishMetadata =
    existingProperty?.value ?? { isPublished: false, viewers: {} };

  if (input.isPublished) {
    const viewers = input.viewers ?? previousState.viewers;
    if (Object.keys(viewers).length === 0) {
      throw new ValidationError("게시 시 최소 하나의 뷰어 설정이 필요합니다.");
    }
    await assertNoSlugConflict(input.pageId, previousState.viewers, viewers);

    const value: PublishMetadata = {
      isPublished: true,
      publishedAt: new Date().toISOString(),
      viewers,
    };
    await upsertPageProperty(input.pageId, PUBLISH_PROPERTY_KEY, value);

    return { pageId: input.pageId, isPublished: true, viewers, publishedAt: value.publishedAt };
  }

  const value: PublishMetadata = { isPublished: false, viewers: previousState.viewers };
  await upsertPageProperty(input.pageId, PUBLISH_PROPERTY_KEY, value);

  return { pageId: input.pageId, isPublished: false, viewers: value.viewers };
}
