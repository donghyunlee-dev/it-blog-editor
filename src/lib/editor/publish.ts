import {
  ConfluenceApiError,
  getPage,
  getPageProperty,
  upsertPageProperty,
} from "@/lib/confluence/client";
import { hidePageFromOthers, revealPageToSpace } from "./access";
import { NotFoundError, ValidationError } from "./errors";

const PUBLISH_PROPERTY_KEY = "publishMetadata";

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

/**
 * 문서의 게시 여부·뷰어별 slug/메타 설명을 설정한다.
 *
 * P0-8 이전에는 문서를 계정 폴더 내 "초안"/"게시" 서브폴더 사이로 물리적으로 이동시키고,
 * 그 위치를 게시 여부의 진실로 삼았다(메타데이터 기록 실패에도 재시도가 안전하도록). "아무도
 * Confluence를 직접 열어보지 않는다"는 결정(P0-7) 이후 그 구조 자체를 없앴으므로, 이제는
 * restriction 토글만으로 게시 여부를 결정한다. restriction 적용/해제는 그 자체로 멱등
 * 연산이라(같은 상태를 다시 걸어도 안전) 순서 원칙만 지키면 재시도 안전성이 그대로
 * 유지된다 — **restriction 변경을 항상 메타데이터 기록보다 먼저** 한다. 메타데이터 기록이
 * 실패해도 실제 공개 여부(restriction)는 항상 의도한 상태와 일치하므로, 최악의 경우도
 * "실제로는 이미 반영됐는데 표시가 잠깐 뒤처짐"이지 보안 위반이 아니다.
 */
export async function setPublishState(input: SetPublishStateInput) {
  const existingProperty = await getPublishPropertyOrThrow(input.pageId);
  const previousState: PublishMetadata =
    existingProperty?.value ?? { isPublished: false, viewers: {} };

  if (input.isPublished) {
    const currentPage = await getPage(input.pageId);
    const requestedViewers = input.viewers ?? previousState.viewers;
    if (Object.keys(requestedViewers).length === 0) {
      throw new ValidationError("게시 시 최소 하나의 뷰어 설정이 필요합니다.");
    }
    const viewers = validateAndComposeViewers(currentPage.title, requestedViewers);

    await revealPageToSpace(input.pageId);

    const value: PublishMetadata = {
      isPublished: true,
      publishedAt: new Date().toISOString(),
      viewers,
    };
    await upsertPageProperty(input.pageId, PUBLISH_PROPERTY_KEY, value);

    return { pageId: input.pageId, isPublished: true, viewers, publishedAt: value.publishedAt };
  }

  await hidePageFromOthers(input.pageId);

  const value: PublishMetadata = { isPublished: false, viewers: previousState.viewers };
  await upsertPageProperty(input.pageId, PUBLISH_PROPERTY_KEY, value);

  return { pageId: input.pageId, isPublished: false, viewers: value.viewers };
}
