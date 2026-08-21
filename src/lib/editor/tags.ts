import { addLabels, listLabels, removeLabel } from "@/lib/confluence/client";

/** 문서에 붙은 태그(Confluence 라벨) 목록을 조회한다. */
export async function getTags(pageId: string): Promise<string[]> {
  const labels = await listLabels(pageId);
  return labels.map((label) => label.name);
}

/** 문서의 태그를 지정한 목록으로 맞춘다(없던 태그는 추가, 빠진 태그는 제거). */
export async function setTags(pageId: string, tags: string[]): Promise<string[]> {
  const current = await getTags(pageId);
  const toAdd = tags.filter((tag) => !current.includes(tag));
  const toRemove = current.filter((tag) => !tags.includes(tag));

  if (toAdd.length > 0) {
    await addLabels(pageId, toAdd);
  }
  await Promise.all(toRemove.map((tag) => removeLabel(pageId, tag)));

  return tags;
}
