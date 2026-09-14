import {
  ConfluenceApiError,
  getPageProperty,
  movePage,
  upsertPageProperty,
} from "@/lib/confluence/client";
import { hidePageFromOthers } from "./access";
import {
  DELETED_DOCUMENTS_PROPERTY_KEY,
  reconcileFolderAfterRestore,
  type DeletedDocumentEntry,
} from "./documents";
import { createPersonalFolder, findPersonalFolder } from "./folder";
import { listFolders } from "./folders";
import type { PublishMetadata } from "./publish";
import { NotFoundError } from "./errors";

const PUBLISH_PROPERTY_KEY = "publishMetadata";

async function getFolderOrThrow(email: string) {
  return (await findPersonalFolder(email)) ?? (await createPersonalFolder(email));
}

/**
 * P16-1: 화면(삭제된 문서 페이지)에 보여줄 형태 — 저장된 `DeletedDocumentEntry`에 폴더
 * "이름"(id가 아니라)을 얹는다. 이름은 저장하지 않고 조회 시점에 현재 폴더 트리에서
 * 찾는다 — 폴더 이름이 바뀌어도(이름 변경) 오래된 이름이 박제되지 않게 하기 위해서다.
 * 삭제 당시 폴더가 이미 없어졌으면(트리에서 못 찾으면) `null`(= "미분류"와 동일하게 표시).
 */
export interface DeletedDocumentSummary extends DeletedDocumentEntry {
  folderName: string | null;
}

/**
 * 로그인한 사용자가 삭제한(휴지통으로 이동한) 문서 목록을 최근 삭제순으로 반환한다.
 * `tags`/`isPublished`/`folderId`가 생기기 전(P16-1 이전)에 기록된 옛 항목은 그 필드가
 * 없을 수 있어 기본값으로 보정한다.
 */
export async function listDeletedDocuments(
  email: string
): Promise<DeletedDocumentSummary[]> {
  const folder = await getFolderOrThrow(email);
  const [property, folders] = await Promise.all([
    getPageProperty<DeletedDocumentEntry[]>(folder.accountFolderId, DELETED_DOCUMENTS_PROPERTY_KEY),
    listFolders(folder.accountFolderId),
  ]);
  const entries = property?.value ?? [];
  const folderNameById = new Map(folders.map((f) => [f.id, f.name]));

  return entries
    .map((entry) => ({
      ...entry,
      tags: entry.tags ?? [],
      isPublished: entry.isPublished ?? false,
      folderId: entry.folderId ?? null,
      folderName: entry.folderId ? (folderNameById.get(entry.folderId) ?? null) : null,
    }))
    .sort((a, b) => new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime());
}

/**
 * 삭제된 문서를 계정 폴더로 복구한다. 소유권 판단은 트래시된 페이지의 `authorMeta`를 다시
 * 읽는 방식(다른 라우트의 `requireDocumentOwner`)이 아니라, 로그인한 사용자 본인의
 * 레지스트리에 그 pageId가 있는지로만 한다(`task.md` 참고) — 남의 레지스트리에는 애초에
 * 다른 pageId가 들어있으므로 이것만으로 충분하다.
 *
 * `movePage`는 대상 페이지가 실제로는 이미 Confluence에서 영구 삭제(purge)됐으면
 * 404(`ConfluenceApiError`)를 던진다 — 이 경우 레지스트리에서도 그 죽은 항목을 정리하고
 * `NotFoundError`로 안내한다(빈 화면으로 방치하거나 다시 눌러도 계속 실패하는 죽은
 * 항목으로 남기지 않는다).
 *
 * P0-8 이전에는 "초안" 서브폴더로 옮기는 것 자체가 곧 "미게시 상태로 되돌림"이었다. 이제는
 * 폴더 구분이 없어져 계정 폴더로 이동시키는 것과 게시 상태를 되돌리는 것을 각각 명시적으로
 * 해야 한다 — 안 하면 게시 중이던 문서가 복구 후 restriction은 걸려 있는데(비공개)
 * `publishMetadata.isPublished`는 `true`로 남아(자기모순) 화면에 "게시됨"으로 잘못 표시된다.
 */
export async function restoreDocument(email: string, pageId: string): Promise<void> {
  const folder = await getFolderOrThrow(email);
  const property = await getPageProperty<DeletedDocumentEntry[]>(
    folder.accountFolderId,
    DELETED_DOCUMENTS_PROPERTY_KEY
  );
  const entries = property?.value ?? [];
  const entry = entries.find((candidate) => candidate.pageId === pageId);
  if (!entry) {
    throw new NotFoundError("삭제된 문서 목록에서 찾을 수 없습니다.");
  }

  const removeEntry = () =>
    upsertPageProperty(
      folder.accountFolderId,
      DELETED_DOCUMENTS_PROPERTY_KEY,
      entries.filter((candidate) => candidate.pageId !== pageId)
    );

  try {
    await movePage(pageId, folder.accountFolderId);
  } catch (error) {
    if (error instanceof ConfluenceApiError && error.status === 404) {
      await removeEntry();
      throw new NotFoundError(
        "이미 완전히 삭제되어 복구할 수 없습니다(Confluence 휴지통 보관 기간 만료)."
      );
    }
    throw error;
  }

  await hidePageFromOthers(pageId);
  // P7-9: 휴지통에 있는 동안 소속 폴더가 삭제됐을 수 있다 — 그러면 미분류로 되돌린다
  // (reconcileFolderAfterRestore 참고). 폴더가 그대로 있으면 원래 있던 폴더로 돌아간다.
  await reconcileFolderAfterRestore(pageId, folder.accountFolderId);

  const publishProperty = await getPageProperty<PublishMetadata>(
    pageId,
    PUBLISH_PROPERTY_KEY
  );
  if (publishProperty?.value?.isPublished) {
    await upsertPageProperty(pageId, PUBLISH_PROPERTY_KEY, {
      ...publishProperty.value,
      isPublished: false,
    });
  }

  await removeEntry();
}
