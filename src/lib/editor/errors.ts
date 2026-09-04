/**
 * 인증/권한 경계 오류. 세션이 없을 때(auth-guard)와 남의 문서를 조작하려 할 때(문서 소유자 검증)
 * 모두 이 오류를 쓰고, toErrorResponse가 401로 매핑한다.
 *
 * next-auth를 import하는 auth-guard가 아니라 의존성 없는 이 모듈에 정의해, 도메인 계층과
 * 단위 테스트가 next-auth 모듈 그래프를 끌어오지 않고도 이 오류를 참조할 수 있게 한다.
 */
export class UnauthorizedError extends Error {
  constructor(message = "로그인이 필요합니다.") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

/**
 * 로그인은 됐지만 관리자가 계정 접속을 차단(`accountMeta.accessEnabled = false`)한
 * 경우에 던진다(P5-3). `UnauthorizedError`(로그인 자체가 안 됨)와는 별개 — 인증은
 * 성공했지만 사용이 허가되지 않은 상태다. `toErrorResponse`가 403으로 매핑한다.
 */
export class AccessDisabledError extends Error {
  constructor(message = "이 계정은 접속이 제한되어 있습니다.") {
    super(message);
    this.name = "AccessDisabledError";
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotFoundError";
  }
}

/**
 * `details`는 `toErrorResponse`가 409 응답 본문에 그대로 병합해 내려보낸다(P6-7) — 문서
 * 버전 충돌 시 "누가 먼저 저장했는지"(`lastEditedBy`)를 클라이언트에 구조화된 데이터로
 * 함께 전달하기 위해서다. 다른 `ConflictError` 사용처(개인 폴더 중복 생성 등)는 이 값을
 * 생략하면 기존과 동일하게 동작한다.
 */
export class ConflictError extends Error {
  details?: Record<string, unknown>;

  constructor(message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = "ConflictError";
    this.details = details;
  }
}

/**
 * 민감 API 엔드포인트(문서 생성·이미지 업로드·게시)의 레이트리밋 초과 시 던진다
 * ([Issue #5](https://github.com/sfood-pioneer-1st/sfood-it-editor/issues/5), P1-5).
 * `toErrorResponse`가 429로 매핑하고 `retryAfterSeconds`를 `Retry-After` 헤더로 싣는다.
 */
export class RateLimitError extends Error {
  retryAfterSeconds: number;

  constructor(retryAfterSeconds: number, message = "요청이 너무 잦습니다. 잠시 후 다시 시도해주세요.") {
    super(message);
    this.name = "RateLimitError";
    this.retryAfterSeconds = retryAfterSeconds;
  }
}
