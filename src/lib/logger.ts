/**
 * 구조화 로깅(P1-4a). 별도 로깅 도구는 도입하지 않는다 — [Issue #4](https://github.com/sfood-pioneer-1st/sfood-it-editor/issues/4)에서
 * "Slack만 유지, 채널은 추후 변경 가능"으로 결정됐다. 대신 콘솔에 JSON 한 줄로 남겨,
 * 배포 환경(AWS, 컨테이너/서버리스 미정 — P2-3)이 표준으로 수집하는 stdout/stderr
 * 로그(예: CloudWatch Logs)가 그대로 구조화된 형태로 쌓이게 한다. Slack 알림
 * (`notifications/slack.ts`)은 운영자에게 즉시 알리는 별도 채널로 그대로 유지하고,
 * 이 로거는 그 알림이 실패했을 때를 포함해 서버 로그 쪽만 담당한다.
 */

type LogLevel = "info" | "warn" | "error";

type LogContext = Record<string, unknown>;

/**
 * `Error` 인스턴스를 JSON.stringify로도 온전히 남도록 평범한 객체로 바꾼다 —
 * `Error`는 `message`/`stack`이 기본적으로 열거 불가능한 속성이라 그냥
 * `JSON.stringify(error)`를 하면 `{}`만 남는다. `ConfluenceApiError.status`처럼
 * 도메인별로 덧붙인 속성도 함께 옮긴다.
 */
export function serializeError(error: unknown): LogContext {
  if (error instanceof Error) {
    const serialized: LogContext = {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
    for (const key of Object.getOwnPropertyNames(error)) {
      if (key === "name" || key === "message" || key === "stack") continue;
      serialized[key] = (error as unknown as LogContext)[key];
    }
    return serialized;
  }
  return { value: String(error) };
}

function write(level: LogLevel, message: string, context?: LogContext) {
  const line = JSON.stringify({
    level,
    message,
    timestamp: new Date().toISOString(),
    ...(context ? { context } : {}),
  });

  if (level === "error") {
    console.error(line);
  } else if (level === "warn") {
    console.warn(line);
  } else {
    console.log(line);
  }
}

export const logger = {
  info: (message: string, context?: LogContext) => write("info", message, context),
  warn: (message: string, context?: LogContext) => write("warn", message, context),
  error: (message: string, context?: LogContext) => write("error", message, context),
};
