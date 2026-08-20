import { uploadAttachment } from "@/lib/confluence/client";
import { ValidationError } from "./errors";

const ALLOWED_IMAGE_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
]);

/** 문서에 이미지 첨부파일을 등록한다. 파일 누락/허용되지 않는 형식은 ValidationError(400)로 처리한다. */
export async function registerImage(pageId: string, file: File | null) {
  if (!file) {
    throw new ValidationError("이미지 파일이 누락되었습니다.");
  }
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    throw new ValidationError("허용되지 않는 이미지 파일 형식입니다.");
  }

  return uploadAttachment(pageId, file);
}
