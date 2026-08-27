import type { JSONContent } from "@tiptap/react";

const KEY_PREFIX = "sfood-editor-autosave:";

export interface AutosaveSnapshot {
  title: string;
  doc: JSONContent;
  tags: string[];
  /** ISO 8601. `writeAutosaveSnapshot`이 호출 시점으로 자동으로 채운다. */
  savedAt: string;
}

function keyFor(pageId: string): string {
  return `${KEY_PREFIX}${pageId}`;
}

/**
 * 자동 저장(P0-1b) 직전에 호출해 제목·본문·태그를 브라우저에 임시로 남겨 둔다 — 곧이어
 * 시도하는 Confluence 저장이 실패해도(네트워크 오류 등) 복구할 수 있게 하기 위함이다.
 * localStorage 접근이 막힌 환경(프라이빗 브라우징 등)에서도 에디터 자체는 계속 동작해야
 * 하므로 실패를 조용히 무시한다(ThemeToggle.tsx/EditorShell.tsx와 같은 패턴).
 */
export function writeAutosaveSnapshot(
  pageId: string,
  snapshot: Omit<AutosaveSnapshot, "savedAt">
): void {
  try {
    const value: AutosaveSnapshot = { ...snapshot, savedAt: new Date().toISOString() };
    window.localStorage.setItem(keyFor(pageId), JSON.stringify(value));
  } catch {
    // 무시 — 위 설명 참고.
  }
}

/** 저장된 적 없거나, 손상됐거나, 접근할 수 없으면 null을 반환한다(예외를 던지지 않는다). */
export function readAutosaveSnapshot(pageId: string): AutosaveSnapshot | null {
  try {
    const raw = window.localStorage.getItem(keyFor(pageId));
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as AutosaveSnapshot;
  } catch {
    return null;
  }
}

export function clearAutosaveSnapshot(pageId: string): void {
  try {
    window.localStorage.removeItem(keyFor(pageId));
  } catch {
    // 무시.
  }
}
