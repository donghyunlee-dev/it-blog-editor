/**
 * 사용자 자유 입력을 Confluence storage format(XHTML) 본문에 안전하게 끼워 넣기 위한
 * 이스케이프. `tiptap-to-storage.ts`에도 같은 목적의 비공개 함수가 있지만, 그 모듈은
 * 문서 본문 직렬화 전용이라 계정 페이지처럼 무관한 도메인에서 가져다 쓰기보다 작은 공유
 * 유틸로 따로 둔다.
 */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
