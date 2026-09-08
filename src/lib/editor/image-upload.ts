export interface UploadedImage {
  url: string;
  filename: string;
}

/**
 * 클라이언트에서 이미지 파일을 문서의 첨부파일 업로드 API(`POST
 * /api/editor/documents/{pageId}/images`)로 전송한다.
 *
 * 반환하는 `filename`은 반드시 서버 응답의 `data.filename`을 써야 한다 — 원본
 * `File.name`을 그대로 쓰면 안 된다. Confluence에 실제로 저장되는 첨부파일명은
 * `File.name`이 아니라 서버가 동명 충돌을 피하려 고유 접미사를 붙인 이름이고
 * (`uploadAttachment`의 `withUniqueFilenameSuffix` 참고), `tiptap-to-storage.ts`가
 * image 노드를 `<ri:attachment ri:filename="...">`로 직렬화할 때 이 값을 그대로
 * 쓰기 때문이다 — 여기서 원본 파일명을 돌려주면 그 태그가 실제 첨부파일이 아닌
 * 엉뚱한(흔히 "image.png" 같은 옛) 파일을 가리키게 된다(2026-09-09, 실사용 확인 —
 * Confluence 페이지를 직접 열면 에디터와 다른 사진이 보이는 문제로 발견).
 */
export async function uploadImage(pageId: string, file: File): Promise<UploadedImage> {
  const form = new FormData();
  form.append("file", file);

  const response = await fetch(`/api/editor/documents/${pageId}/images`, {
    method: "POST",
    body: form,
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error?.message ?? "이미지 업로드에 실패했습니다.");
  }

  return { url: data.url, filename: data.filename };
}
