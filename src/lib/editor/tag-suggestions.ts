import { listDocuments } from "./documents";
import { findPersonalFolder } from "./folder";

/**
 * 작성자가 이전에 사용한 태그를 중복 없이 돌려준다(`TagInput` 자동완성용).
 *
 * 이 함수는 **절대 던지지 않는다**. 자동완성은 편집 화면의 보조 기능이므로, 태그 목록 조회가
 * 실패했다고 문서 편집 자체를 막으면(500) 손실이 훨씬 크다. 실패하면 서버 로그에만 남기고
 * 빈 목록으로 물러난다.
 *
 * 던지지 않는다는 점은 호출부에도 중요하다. `/editor/[pageId]`는 `NotFoundError`/
 * `UnauthorizedError`를 `notFound()`로 매핑하는 try/catch를 갖고 있는데, 이 함수가 그 안에서
 * 예외를 올리면(예: 개인 폴더 조회의 `NotFoundError`) 남의 문서가 아닌데도 404가 되어
 * 권한 매핑의 의미가 오염된다.
 *
 * `listDocuments` 호출은 `/editor` 레이아웃이 사이드바용으로 이미 한 번 수행한다. 레이아웃의
 * 결과를 페이지로 내려보낼 경로가 없어 중복 호출을 감수한다(이 규모에서 수용 가능한 트레이드오프로
 * 이미 합의된 사항).
 */
export async function listTagSuggestions(email: string): Promise<string[]> {
  try {
    const folder = await findPersonalFolder(email);
    if (!folder) {
      return [];
    }

    const documents = await listDocuments(folder.accountFolderId);
    return [...new Set(documents.flatMap((document) => document.tags))].sort(
      (a, b) => a.localeCompare(b)
    );
  } catch (error) {
    console.error("태그 자동완성 목록 조회 실패:", error);
    return [];
  }
}
