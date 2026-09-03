import { RateLimitError } from "./editor/errors";

/**
 * 민감 API 엔드포인트(문서 생성·이미지 업로드·게시)에 적용하는 고정 윈도우(fixed window)
 * 레이트리밋. [Issue #5](https://github.com/sfood-pioneer-1st/sfood-it-editor/issues/5)의
 * 결정을 그대로 따른다: 이 서비스는 사용자 수가 많지 않고 동시 사용률이 높지 않아(AWS도
 * 스케일링을 고려하지 않는 규모) 단일 인메모리 방식으로 충분하다고 판단했다 — 외부 스토어
 * (Redis 등)는 도입하지 않는다. 프로세스 메모리에만 저장하므로 서버 재시작 시 초기화되고,
 * 여러 인스턴스로 배포하면 인스턴스마다 카운터가 분리된다는 한계를 의도적으로 받아들인다.
 *
 * 임계값은 사용자당 분당 30회(엔드포인트별로 독립적으로 집계 — `action` 문자열로 구분).
 */
const WINDOW_MS = 60_000;
const DEFAULT_LIMIT = 30;

interface Bucket {
  windowStart: number;
  count: number;
}

const buckets = new Map<string, Bucket>();

/**
 * `action`(엔드포인트 구분자)과 `identifier`(보통 세션 이메일) 조합의 이번 분(minute)
 * 요청 횟수를 하나 늘리고, 이미 `limit`을 넘겼으면 `RateLimitError`를 던진다.
 *
 * @param now 테스트에서 윈도우 경계를 결정적으로 제어하기 위한 주입 지점(기본값 `Date.now()`).
 */
export function enforceRateLimit(
  action: string,
  identifier: string,
  limit = DEFAULT_LIMIT,
  now = Date.now()
): void {
  const key = `${action}:${identifier}`;
  const windowStart = Math.floor(now / WINDOW_MS) * WINDOW_MS;
  const bucket = buckets.get(key);

  if (!bucket || bucket.windowStart !== windowStart) {
    buckets.set(key, { windowStart, count: 1 });
    return;
  }

  if (bucket.count >= limit) {
    const retryAfterSeconds = Math.ceil((windowStart + WINDOW_MS - now) / 1000);
    throw new RateLimitError(retryAfterSeconds);
  }

  bucket.count += 1;
}
