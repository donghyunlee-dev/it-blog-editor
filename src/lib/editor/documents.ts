import {
  ConfluenceApiError,
  createPage,
  deletePage,
  getConfiguredSpace,
  getPage,
  getPageProperty,
  listChildPages,
  updatePage,
  upsertPageProperty,
} from "@/lib/confluence/client";
import { ConflictError, NotFoundError, ValidationError } from "./errors";
import { markdownToStorageFormat } from "./markdown";
import { hidePageFromOthers } from "./access";

const SOURCE_MARKDOWN_PROPERTY_KEY = "sourceMarkdown";

export interface DocumentSummary {
  pageId: string;
  title: string;
  updatedAt: string;
}

export interface DocumentDetail {
  pageId: string;
  title: string;
  markdown: string;
  version: number;
}

async function getPageOrThrow(pageId: string) {
  try {
    return await getPage(pageId);
  } catch (error) {
    if (error instanceof ConfluenceApiError && error.status === 404) {
      throw new NotFoundError("문서를 찾을 수 없습니다.");
    }
    throw error;
  }
}

/** 개인 폴더 하위 문서 목록을 조회한다. */
export async function listDocuments(
  folderId: string
): Promise<DocumentSummary[]> {
  const pages = await listChildPages(folderId);
  return pages.map((page) => ({
    pageId: page.id,
    title: page.title,
    updatedAt: page.version.createdAt,
  }));
}

/**
 * 편집 화면에 필요한 문서 상세를 조회한다. Confluence 페이지의 body(storage format)는
 * 렌더링용 산출물이므로, 편집 원본은 별도 content property(sourceMarkdown)에서 가져온다.
 */
export async function getDocumentDetail(
  pageId: string
): Promise<DocumentDetail> {
  const page = await getPageOrThrow(pageId);
  const sourceProperty = await getPageProperty<{ markdown: string }>(
    pageId,
    SOURCE_MARKDOWN_PROPERTY_KEY
  );

  return {
    pageId: page.id,
    title: page.title,
    markdown: sourceProperty?.value.markdown ?? "",
    version: page.version.number,
  };
}

export interface CreateDocumentInput {
  folderId: string;
  title: string;
  markdown: string;
  actualAuthorEmail: string;
}

/** 개인 폴더 하위에 신규 문서(Confluence 페이지)를 생성한다. */
export async function createDocument(input: CreateDocumentInput) {
  if (!input.title.trim() || !input.markdown.trim()) {
    throw new ValidationError("제목 또는 본문이 누락되었습니다.");
  }

  const space = await getConfiguredSpace();
  const page = await createPage({
    spaceId: space.id,
    parentId: input.folderId,
    title: input.title,
    bodyValue: markdownToStorageFormat(input.markdown),
  });

  await Promise.all([
    upsertPageProperty(page.id, "authorMeta", {
      actualAuthorEmail: input.actualAuthorEmail,
    }),
    upsertPageProperty(page.id, SOURCE_MARKDOWN_PROPERTY_KEY, {
      markdown: input.markdown,
    }),
    hidePageFromOthers(page.id),
  ]);

  return { pageId: page.id, version: page.version.number };
}

export interface UpdateDocumentInput {
  pageId: string;
  title: string;
  markdown: string;
  expectedVersion: number;
}

/** 기존 문서를 수정한다. 요청한 버전이 최신이 아니면 ConflictError(409)를 던진다. */
export async function updateDocument(input: UpdateDocumentInput) {
  if (!input.title.trim() || !input.markdown.trim()) {
    throw new ValidationError("제목 또는 본문이 누락되었습니다.");
  }

  const current = await getPageOrThrow(input.pageId);
  if (current.version.number !== input.expectedVersion) {
    throw new ConflictError(
      `문서가 이미 최신 버전(${current.version.number})으로 변경되었습니다. 최신 내용을 확인한 뒤 다시 저장하세요.`
    );
  }

  const updated = await updatePage({
    pageId: input.pageId,
    title: input.title,
    bodyValue: markdownToStorageFormat(input.markdown),
    nextVersion: current.version.number + 1,
  });

  await upsertPageProperty(input.pageId, SOURCE_MARKDOWN_PROPERTY_KEY, {
    markdown: input.markdown,
  });

  return { pageId: updated.id, version: updated.version.number };
}

/** 문서를 삭제한다(Confluence 휴지통으로 이동). 이후 목록·게시 조회에서 자동으로 제외된다. */
export async function deleteDocument(pageId: string): Promise<void> {
  await getPageOrThrow(pageId);
  await deletePage(pageId);
}
