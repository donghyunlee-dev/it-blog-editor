export interface UploadedImage {
  url: string;
  filename: string;
}

/**
 * 클라이언트에서 이미지 파일을 문서의 첨부파일 업로드 API(`POST
 * /api/editor/documents/{pageId}/images`)로 전송한다.
 *
 * 반환하는 `filename`은 서버 응답이 아니라 원본 `File.name`을 그대로 쓴다 —
 * Confluence에 실제로 저장되는 첨부파일명이 `File.name` 기준이고(서버의
 * `uploadAttachment`가 `form.append("file", file, file.name)`으로 전송),
 * `tiptap-to-storage.ts`가 image 노드를 `<ri:attachment ri:filename="...">`로
 * 직렬화할 때 이 값을 그대로 사용하기 때문이다.
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

  return { url: data.url, filename: file.name };
}
