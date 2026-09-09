import { randomUUID } from "crypto";
import { getPageProperty, upsertPageProperty } from "@/lib/confluence/client";
import { NotFoundError, ValidationError } from "./errors";

export const FOLDER_INDEX_PROPERTY_KEY = "folderIndex";

/**
 * 폴더 중첩 최대 깊이(Phase 7 핵심 결정, `docs/product/prd.md` 참고) — 무제한 중첩은
 * 사이드바 인덴트가 감당 못 하는 지점이 반드시 오는 순수 UX 가드레일이라 GitHub Issue
 * 없이 직접 정했다(P1-6a/b와 같은 근거).
 */
export const MAX_FOLDER_DEPTH = 5;

export interface FolderNode {
  id: string;
  name: string;
  /** 최상위 폴더면 `null`. */
  parentId: string | null;
  /** 같은 `parentId`를 가진 형제 사이의 표시 순서 — 항상 끝에 추가된다(P7-1 범위에서는 재정렬 없음). */
  order: number;
}

const DEFAULT_FOLDERS: FolderNode[] = [];

/**
 * 계정 폴더의 폴더 트리를 읽는다. 폴더를 한 번도 만든 적 없으면 property 자체가 없다
 * (하위 호환 기본값 — `sharing.ts`의 `getSharedDocumentRefs`와 동일한 패턴).
 */
export async function listFolders(accountFolderId: string): Promise<FolderNode[]> {
  const property = await getPageProperty<FolderNode[]>(accountFolderId, FOLDER_INDEX_PROPERTY_KEY);
  return property?.value ?? DEFAULT_FOLDERS;
}

/**
 * `parentId`로 지정된 폴더 자신의 깊이를 센다 — 최상위 폴더는 깊이 1, 그 자식은 2, ...
 * `parentId`가 `null`(최상위에 만드는 경우)이면 0을 반환해, 호출부가 `+ 1`만 하면 새
 * 폴더의 깊이가 나오게 한다.
 */
function computeDepth(folders: FolderNode[], parentId: string | null): number {
  let depth = 0;
  let currentId = parentId;
  while (currentId !== null) {
    const node = folders.find((folder) => folder.id === currentId);
    // node가 없는 경우(데이터 불일치)는 호출부에서 이미 존재 검증을 마쳤으므로 이 루프
    // 시작 시점에는 항상 찾을 수 있다 — 그래도 무한루프를 막기 위해 방어적으로 종료한다.
    if (!node) break;
    depth += 1;
    currentId = node.parentId;
  }
  return depth;
}

/**
 * 같은 부모 아래 형제 폴더끼리 이름이 겹치는 것을 막는다(P7-2 — 사용자가 사이드바에서
 * 같은 이름의 폴더 두 개를 구분할 방법이 없어 혼란을 준다는 판단, GitHub Issue 없이
 * 직접 정함). `excludeId`는 `renameFolder`가 자기 자신은 비교 대상에서 빼기 위해 쓴다.
 */
function assertNoSiblingWithSameName(
  folders: FolderNode[],
  parentId: string | null,
  name: string,
  excludeId?: string
): void {
  const collides = folders.some(
    (folder) => folder.id !== excludeId && folder.parentId === parentId && folder.name === name
  );
  if (collides) {
    throw new ValidationError("같은 위치에 이미 같은 이름의 폴더가 있습니다.");
  }
}

/**
 * 새 폴더를 만든다. `id`는 `randomUUID()`로 발급한다(이 프로젝트가 `documents.ts`의
 * `internalKey`, 이미지 업로드 파일명 충돌 방지에 쓰는 것과 같은 선례). 부모가 있으면
 * 그 폴더가 실제로 존재하는지, 새 폴더를 더했을 때 중첩 깊이가 `MAX_FOLDER_DEPTH`를
 * 넘지 않는지, 같은 부모 아래 이름이 겹치지 않는지 검증한다.
 */
export async function createFolder(
  accountFolderId: string,
  input: { name: string; parentId: string | null }
): Promise<FolderNode> {
  const name = input.name.trim();
  if (!name) {
    throw new ValidationError("폴더 이름을 입력해주세요.");
  }

  const folders = await listFolders(accountFolderId);

  if (input.parentId !== null && !folders.some((folder) => folder.id === input.parentId)) {
    throw new ValidationError("상위 폴더를 찾을 수 없습니다.");
  }

  const depth = computeDepth(folders, input.parentId) + 1;
  if (depth > MAX_FOLDER_DEPTH) {
    throw new ValidationError(`폴더는 최대 ${MAX_FOLDER_DEPTH}단계까지만 만들 수 있습니다.`);
  }

  assertNoSiblingWithSameName(folders, input.parentId, name);

  const siblingCount = folders.filter((folder) => folder.parentId === input.parentId).length;
  const node: FolderNode = {
    id: randomUUID(),
    name,
    parentId: input.parentId,
    order: siblingCount,
  };

  await upsertPageProperty(accountFolderId, FOLDER_INDEX_PROPERTY_KEY, [...folders, node]);
  return node;
}

/**
 * 폴더 이름을 바꾼다(P7-2). 대상이 없으면 `NotFoundError`, 같은 부모 아래 다른 폴더와
 * 이름이 겹치면 `ValidationError`(자기 자신은 비교에서 제외).
 */
export async function renameFolder(
  accountFolderId: string,
  folderId: string,
  newName: string
): Promise<FolderNode> {
  const name = newName.trim();
  if (!name) {
    throw new ValidationError("폴더 이름을 입력해주세요.");
  }

  const folders = await listFolders(accountFolderId);
  const target = folders.find((folder) => folder.id === folderId);
  if (!target) {
    throw new NotFoundError("폴더를 찾을 수 없습니다.");
  }

  assertNoSiblingWithSameName(folders, target.parentId, name, folderId);

  const updated: FolderNode = { ...target, name };
  const next = folders.map((folder) => (folder.id === folderId ? updated : folder));
  await upsertPageProperty(accountFolderId, FOLDER_INDEX_PROPERTY_KEY, next);
  return updated;
}

/**
 * 폴더를 삭제한다(P7-2). 삭제 대상의 **직속** 하위 폴더는 함께 삭제되지 않고 삭제
 * 대상의 `parentId`로 승격된다(문서 유실 방지와 같은 원칙 — Phase 7 핵심 결정). 최상위
 * 폴더를 지우면 그 직속 하위 폴더들은 `parentId: null`이 되어 논리적 "미분류" 루트로
 * 올라온다 — 별도의 실제 "미분류" 폴더 노드를 두지 않는다, `parentId: null` 자체가 이미
 * 그 뜻이다. 손자 폴더 이하는 건드리지 않아도 트리 구조상 자동으로 유지된다(자기 부모를
 * 그대로 따라간다).
 *
 * 문서(Document)의 폴더 소속도 같은 방식으로 승격된다 — 다만 그 재배정 자체는 이
 * 함수가 하지 않는다(`folders.ts`는 문서를 몰라야 한다, 순환 참조 방지). 대신 삭제된
 * 폴더 노드를 그대로 반환해, 호출부(API 라우트)가 그 `parentId`로 `documents.ts`의
 * `reassignDocumentsFolder`를 이어 호출하는 오케스트레이션을 완성한다(P7-3).
 */
export async function deleteFolder(accountFolderId: string, folderId: string): Promise<FolderNode> {
  const folders = await listFolders(accountFolderId);
  const target = folders.find((folder) => folder.id === folderId);
  if (!target) {
    throw new NotFoundError("폴더를 찾을 수 없습니다.");
  }

  const next = folders
    .filter((folder) => folder.id !== folderId)
    .map((folder) =>
      folder.parentId === folderId ? { ...folder, parentId: target.parentId } : folder
    );
  await upsertPageProperty(accountFolderId, FOLDER_INDEX_PROPERTY_KEY, next);
  return target;
}
