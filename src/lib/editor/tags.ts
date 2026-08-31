import { ConfluenceApiError, addLabels, listLabels, removeLabel } from "@/lib/confluence/client";
import { NotFoundError, ValidationError } from "./errors";

// P1-6b: 개수·길이 상한은 Confluence 자체 하드 리밋(라벨 255자)보다 훨씬 보수적인
// UX 가드레일이라 GitHub Issue 없이 직접 정했다(P0-4b/P1-6a와 같은 근거). 금지 문자는
// 추측이 아니라 Confluence 라벨이 실제로 허용하지 않는 문자다(공백은 하이픈으로,
// 대문자는 소문자로 자동 변환되므로 막지 않는다 — 형식 위반이 아니라 정상 동작).
const MAX_TAG_COUNT = 20;
const MAX_TAG_LENGTH = 50;
const FORBIDDEN_TAG_CHARS = /[:?@]/;

function assertValidTags(tags: string[]): void {
  if (tags.length > MAX_TAG_COUNT) {
    throw new ValidationError(`태그는 최대 ${MAX_TAG_COUNT}개까지 지정할 수 있습니다.`);
  }
  for (const tag of tags) {
    if (!tag.trim()) {
      throw new ValidationError("빈 태그는 지정할 수 없습니다.");
    }
    if (tag.length > MAX_TAG_LENGTH) {
      throw new ValidationError(`태그("${tag}")는 ${MAX_TAG_LENGTH}자를 초과할 수 없습니다.`);
    }
    if (FORBIDDEN_TAG_CHARS.test(tag)) {
      throw new ValidationError(`태그("${tag}")에는 :, ?, @ 문자를 쓸 수 없습니다.`);
    }
  }
}

/**
 * 문서에 붙은 태그(Confluence 라벨) 목록을 조회한다. 문서가 삭제(휴지통 이동)된 뒤에는
 * 라벨 조회 자체가 404를 던지는데(`getPageOrThrow`가 지키는 다른 조회들과 달리 이 호출은
 * 페이지 존재를 먼저 확인하지 않는다), 그대로 두면 `EditDocumentPage`의
 * `NotFoundError`/`UnauthorizedError`만 잡는 catch를 통과하지 못해 깨끗한 404 대신 원본
 * 오류가 그대로 노출된다 — 다른 조회 함수들과 같은 방식으로 여기서 변환한다.
 */
export async function getTags(pageId: string): Promise<string[]> {
  try {
    const labels = await listLabels(pageId);
    return labels.map((label) => label.name);
  } catch (error) {
    if (error instanceof ConfluenceApiError && error.status === 404) {
      throw new NotFoundError("문서를 찾을 수 없습니다.");
    }
    throw error;
  }
}

/**
 * 문서의 태그를 지정한 목록으로 맞춘다(없던 태그는 추가, 빠진 태그는 제거).
 *
 * Confluence는 라벨을 소문자로 저장하므로 비교는 대소문자를 무시한다(그렇지 않으면 같은 태그를
 * 두 번 저장할 때 추가 후 삭제가 겹쳐 태그가 사라진다). 추가 요청 자체는 호출자가 준 원래
 * 대소문자를 그대로 보내고, 반환값은 Confluence의 최신 상태를 다시 조회해서 돌려준다.
 */
export async function setTags(pageId: string, tags: string[]): Promise<string[]> {
  assertValidTags(tags);

  const current = await getTags(pageId);
  const currentLower = current.map((tag) => tag.toLowerCase());
  const requestedLower = tags.map((tag) => tag.toLowerCase());

  const toAdd = tags.filter((tag) => !currentLower.includes(tag.toLowerCase()));
  const toRemove = current.filter(
    (tag) => !requestedLower.includes(tag.toLowerCase())
  );

  if (toAdd.length > 0) {
    try {
      await addLabels(pageId, toAdd);
    } catch (error) {
      // 사전 검사(assertValidTags)로 걸러내지 못한 다른 형식 제약을 Confluence가
      // 스스로 거부한 경우 — 분류되지 않은 502 대신 명확한 400으로 바꿔준다.
      if (error instanceof ConfluenceApiError && error.status === 400) {
        throw new ValidationError(
          "태그 형식이 올바르지 않습니다. 특수문자 사용을 확인해주세요."
        );
      }
      throw error;
    }
  }
  await Promise.all(toRemove.map((tag) => removeLabel(pageId, tag)));

  return getTags(pageId);
}
