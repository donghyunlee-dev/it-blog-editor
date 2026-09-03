import { NextResponse } from "next/server";
import {
  ConflictError,
  NotFoundError,
  RateLimitError,
  UnauthorizedError,
  ValidationError,
} from "@/lib/editor/errors";
import { sendSlackAlert } from "@/lib/notifications/slack";
import { logger, serializeError } from "@/lib/logger";

function errorBody(code: string, message: string) {
  return { error: { code, message } };
}

/**
 * Slack 알림 자체가 실패해도 API 응답에는 영향을 주지 않고 서버 로그에만 기록한다.
 * 이 함수는 Editor(문서 CRUD)·Viewer/Comment API 양쪽에서 공통으로 쓰이므로 서비스명을
 * 특정하지 않는다.
 */
async function notifyUpstreamFailure(message: string) {
  try {
    await sendSlackAlert(`Confluence 연동 실패: ${message}`);
  } catch (slackError) {
    logger.error("Slack 알림 전송 실패", { error: serializeError(slackError) });
  }
}

/**
 * 도메인 계층에서 던진 오류를 api-spec.md의 공통 에러 형식 응답으로 변환한다.
 * 분류되지 않은 오류(Confluence 연동 실패 등)는 502로 취급하고 Slack로 이상 감지 알림을 보낸다.
 */
export async function toErrorResponse(error: unknown): Promise<NextResponse> {
  if (error instanceof UnauthorizedError) {
    return NextResponse.json(errorBody("UNAUTHORIZED", error.message), {
      status: 401,
    });
  }
  if (error instanceof ValidationError) {
    return NextResponse.json(errorBody("INVALID_REQUEST", error.message), {
      status: 400,
    });
  }
  if (error instanceof NotFoundError) {
    return NextResponse.json(errorBody("NOT_FOUND", error.message), {
      status: 404,
    });
  }
  if (error instanceof ConflictError) {
    return NextResponse.json(errorBody("CONFLICT", error.message), {
      status: 409,
    });
  }
  if (error instanceof RateLimitError) {
    return NextResponse.json(errorBody("RATE_LIMITED", error.message), {
      status: 429,
      headers: { "Retry-After": String(error.retryAfterSeconds) },
    });
  }

  const detail = error instanceof Error ? error.message : "알 수 없는 오류";
  // 분류되지 않은 오류(주로 ConfluenceApiError)는 Confluence 응답 본문 같은 내부 정보를
  // 그대로 담고 있을 수 있어(client.ts 참고) 클라이언트에는 절대 원문을 노출하지 않는다
  // (P0-6). 원인 파악은 서버 로그와 Slack 알림(운영자 전용 채널)으로만 한다. 로그에는
  // message만이 아니라 원본 error 전체(ConfluenceApiError.status 등 포함)를 남긴다.
  logger.error("[toErrorResponse] 분류되지 않은 오류", { error: serializeError(error) });
  await notifyUpstreamFailure(detail);
  return NextResponse.json(
    errorBody(
      "UPSTREAM_ERROR",
      "일시적인 오류로 요청을 처리하지 못했습니다. 잠시 후 다시 시도해주세요."
    ),
    { status: 502 }
  );
}
