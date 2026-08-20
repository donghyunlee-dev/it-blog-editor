import {
  ConfluenceApiError,
  findPublishedPageBySlug,
  getConfiguredSpace,
  getPageProperty,
  upsertPageProperty,
} from "@/lib/confluence/client";
import { ConflictError, NotFoundError, ValidationError } from "./errors";

const PUBLISH_PROPERTY_KEY = "publishMetadata";

export interface PublishMetadata {
  isPublished: boolean;
  targetViewers: string[];
  slug?: string;
  metaDescription?: string;
  publishedAt?: string;
}

export interface SetPublishStateInput {
  pageId: string;
  isPublished: boolean;
  targetViewers?: string[];
  slug?: string;
  metaDescription?: string;
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

/** 문서의 현재 게시 설정을 조회한다. 게시 설정 이력이 없으면 기본값(미게시)을 반환한다. */
export async function getPublishState(pageId: string): Promise<PublishMetadata> {
  const property = await getPublishPropertyOrThrow(pageId);
  return property?.value ?? { isPublished: false, targetViewers: [] };
}

/** 문서의 게시 여부·노출 Viewer·SEO 정보를 설정한다. 게시 시 slug/metaDescription 필수, slug 중복 시 409. */
export async function setPublishState(input: SetPublishStateInput) {
  if (input.isPublished && (!input.slug || !input.metaDescription)) {
    throw new ValidationError("게시 시 slug와 metaDescription은 필수입니다.");
  }

  const existingProperty = await getPublishPropertyOrThrow(input.pageId);

  if (input.isPublished && input.slug) {
    const previousSlug = existingProperty?.value.slug;
    if (previousSlug !== input.slug) {
      const space = await getConfiguredSpace();
      const conflictingPage = await findPublishedPageBySlug(
        space.id,
        input.slug,
        PUBLISH_PROPERTY_KEY
      );
      if (conflictingPage && conflictingPage.id !== input.pageId) {
        throw new ConflictError("이미 사용 중인 slug입니다.");
      }
    }
  }

  const value: PublishMetadata = {
    isPublished: input.isPublished,
    targetViewers: input.targetViewers ?? [],
    slug: input.slug,
    metaDescription: input.metaDescription,
    publishedAt: input.isPublished ? new Date().toISOString() : undefined,
  };

  await upsertPageProperty(input.pageId, PUBLISH_PROPERTY_KEY, value);

  return {
    pageId: input.pageId,
    isPublished: value.isPublished,
    slug: value.slug,
    publishedAt: value.publishedAt,
  };
}
