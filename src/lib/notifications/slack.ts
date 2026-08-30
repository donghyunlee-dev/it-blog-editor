import { requireEnv } from "@/lib/env";

// P1-4b: Slack 웹훅 전송 자체가 실패할 때(네트워크 오류, Slack 쪽 일시적 429/5xx)의
// 재시도. P1-3(confluenceRequest)에서 이미 쓴 것과 같은 정책을 그대로 재사용한다 —
// 여기서는 GET/POST 구분이 필요 없다(같은 알림 메시지가 두 번 전송되는 최악의 경우도
// 데이터 유실보다 훨씬 가벼운 트레이드오프라 안전하게 재시도할 수 있다).
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 300;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableStatus(status: number): boolean {
  return status === 429 || status >= 500;
}

function computeDelayMs(attempt: number, retryAfterHeader: string | null): number {
  if (retryAfterHeader !== null) {
    const seconds = Number(retryAfterHeader);
    if (Number.isFinite(seconds) && seconds >= 0) {
      return seconds * 1000;
    }
  }
  const jitter = Math.random() * 100;
  return BASE_DELAY_MS * 2 ** attempt + jitter;
}

export async function sendSlackAlert(message: string) {
  const webhookUrl = requireEnv("SLACK_WEBHOOK_URL");

  let attempt = 0;
  for (;;) {
    let response: Response;
    try {
      response = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: message }),
      });
    } catch (error) {
      // fetch 자체가 던지는 네트워크 오류(타임아웃, DNS 실패 등)도 일시적일 수 있으므로
      // HTTP 상태 기반 재시도와 동일하게 다룬다.
      if (attempt < MAX_RETRIES) {
        await sleep(computeDelayMs(attempt, null));
        attempt += 1;
        continue;
      }
      throw error;
    }

    if (!response.ok) {
      if (isRetryableStatus(response.status) && attempt < MAX_RETRIES) {
        await sleep(computeDelayMs(attempt, response.headers.get("Retry-After")));
        attempt += 1;
        continue;
      }
      throw new Error(`Slack 알림 전송 실패: ${response.status} ${response.statusText}`);
    }

    return;
  }
}
