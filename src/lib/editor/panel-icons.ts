/**
 * 콜아웃(패널) 노드의 attrs 구조는 노션 콜아웃 블록 스키마와 1:1로 매핑되도록
 * 설계됐다(P9-1, 2026-09-11 결정) — `panelType`(info/warning/note)은 노션
 * `callout.color`에, `icon`(이모지 1개 문자열)은 노션 `callout.icon.emoji`에
 * 대응한다. 노션의 `icon.type === "external"/"file"`(이미지 아이콘)은
 * 이 프로젝트가 지원하는 범위가 아니다(큐레이션된 이모지만 지원, Issue #101).
 * 실제 노션 문서 가져오기/내보내기 변환 함수는 이 파일이 만들지 않는다 — 이
 * 매핑을 그대로 재사용할 수 있는 attrs 구조를 갖춰 두는 것까지가 P9-1의 목표다.
 */
export const DEFAULT_PANEL_ICONS: Record<string, string> = {
  info: "ℹ️",
  warning: "⚠️",
  note: "📝",
};

/** `icon` attrs가 없는(과거에 저장된) 패널을 `panelType` 기준 기본 아이콘으로 보정한다. */
export function resolvePanelIcon(panelType: unknown, icon: unknown): string {
  if (typeof icon === "string" && icon.length > 0) return icon;
  const type = typeof panelType === "string" ? panelType : "info";
  return DEFAULT_PANEL_ICONS[type] ?? DEFAULT_PANEL_ICONS.info;
}

/**
 * 콜아웃 아이콘 선택 UI(P9-2)가 고르게 하는 큐레이션 목록 — 전체 유니코드 이모지
 * 피커가 아니라 이 목록 중에서만 고른다(사용자 결정, Issue #101, 추천안 그대로 확정).
 * 기존 3종 기본 아이콘(ℹ️/⚠️/📝)을 포함한다.
 */
export const CURATED_PANEL_ICONS: string[] = [
  "ℹ️",
  "⚠️",
  "📝",
  "💡",
  "📌",
  "🔥",
  "✅",
  "❌",
  "❓",
  "🎉",
  "📷",
  "📎",
  "📊",
  "📅",
  "🔗",
  "👀",
  "🚀",
  "📚",
  "🔒",
  "🔔",
  "💬",
  "🧩",
  "⭐",
  "🗂️",
];
