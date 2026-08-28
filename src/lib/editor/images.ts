import { uploadAttachment } from "@/lib/confluence/client";
import { ValidationError } from "./errors";

const ALLOWED_IMAGE_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
]);

// P0-4a: 상한 값은 Issue #2(https://github.com/sfood-pioneer-1st/sfood-it-editor/issues/2)에서
// 10MB로 결정됐다.
const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;

/** 문서에 이미지 첨부파일을 등록한다. 파일 누락/허용되지 않는 형식/용량 초과는 ValidationError(400)로 처리한다. */
export async function registerImage(pageId: string, file: File | null) {
  if (!file) {
    throw new ValidationError("이미지 파일이 누락되었습니다.");
  }
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    throw new ValidationError("허용되지 않는 이미지 파일 형식입니다.");
  }
  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    throw new ValidationError("이미지 파일 크기는 10MB를 초과할 수 없습니다.");
  }

  return uploadAttachment(pageId, file);
}
