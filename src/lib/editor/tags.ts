import { addLabels, listLabels, removeLabel } from "@/lib/confluence/client";

/** 문서에 붙은 태그(Confluence 라벨) 목록을 조회한다. */
export async function getTags(pageId: string): Promise<string[]> {
  const labels = await listLabels(pageId);
  return labels.map((label) => label.name);
}

/**
 * 문서의 태그를 지정한 목록으로 맞춘다(없던 태그는 추가, 빠진 태그는 제거).
 *
 * Confluence는 라벨을 소문자로 저장하므로 비교는 대소문자를 무시한다(그렇지 않으면 같은 태그를
 * 두 번 저장할 때 추가 후 삭제가 겹쳐 태그가 사라진다). 추가 요청 자체는 호출자가 준 원래
 * 대소문자를 그대로 보내고, 반환값은 Confluence의 최신 상태를 다시 조회해서 돌려준다.
 */
export async function setTags(pageId: string, tags: string[]): Promise<string[]> {
  const current = await getTags(pageId);
  const currentLower = current.map((tag) => tag.toLowerCase());
  const requestedLower = tags.map((tag) => tag.toLowerCase());

  const toAdd = tags.filter((tag) => !currentLower.includes(tag.toLowerCase()));
  const toRemove = current.filter(
    (tag) => !requestedLower.includes(tag.toLowerCase())
  );

  if (toAdd.length > 0) {
    await addLabels(pageId, toAdd);
  }
  await Promise.all(toRemove.map((tag) => removeLabel(pageId, tag)));

  return getTags(pageId);
}
