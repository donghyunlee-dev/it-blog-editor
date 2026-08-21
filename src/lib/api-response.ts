import { NextResponse } from "next/server";
import {
  ConflictError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from "@/lib/editor/errors";
import { sendSlackAlert } from "@/lib/notifications/slack";

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
    console.error("Slack 알림 전송 실패:", slackError);
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

  const message = error instanceof Error ? error.message : "알 수 없는 오류";
  await notifyUpstreamFailure(message);
  return NextResponse.json(errorBody("UPSTREAM_ERROR", message), {
    status: 502,
  });
}
