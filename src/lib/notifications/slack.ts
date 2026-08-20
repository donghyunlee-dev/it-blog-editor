import { requireEnv } from "@/lib/env";

export async function sendSlackAlert(message: string) {
  const webhookUrl = requireEnv("SLACK_WEBHOOK_URL");

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: message }),
  });

  if (!response.ok) {
    throw new Error(`Slack 알림 전송 실패: ${response.status} ${response.statusText}`);
  }
}
