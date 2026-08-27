"use client";

import { useEffect, useState } from "react";

type Theme = "system" | "light" | "dark";

const STORAGE_KEY = "sfood-editor-theme";
const ORDER: Theme[] = ["system", "light", "dark"];
const LABEL: Record<Theme, string> = { system: "시스템 설정", light: "라이트 모드", dark: "다크 모드" };

function readStoredTheme(): Theme {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored === "light" || stored === "dark" ? stored : "system";
  } catch {
    // 프라이빗 브라우징 등 localStorage 접근이 막힌 환경에서도 토글 자체는 동작해야 하므로
    // 저장 실패를 조용히 무시한다(이번 세션에서만 적용되고 새로고침 시 시스템 설정으로 되돌아감).
    return "system";
  }
}

function applyTheme(theme: Theme) {
  if (theme === "system") {
    // "시스템" 선택은 명시적 override를 지우는 것과 같다 — @sfood/ui 토큰(tokens/semantic.css)이
    // [data-theme] 속성이 없을 때는 자동으로 prefers-color-scheme 미디어 쿼리를 따르므로,
    // 속성만 제거하면 OS 설정을 그대로 따라가게 된다.
    document.documentElement.removeAttribute("data-theme");
  } else {
    document.documentElement.setAttribute("data-theme", theme);
  }
  try {
    if (theme === "system") {
      window.localStorage.removeItem(STORAGE_KEY);
    } else {
      window.localStorage.setItem(STORAGE_KEY, theme);
    }
  } catch {
    // 위와 동일한 이유로 무시한다.
  }
}

/**
 * `@sfood/ui`의 토큰(tokens/semantic.css)은 `prefers-color-scheme` 미디어 쿼리 외에도
 * `[data-theme="dark"]`/`[data-theme="light"]`를 명시적으로 지원한다. 이 프로젝트는
 * 지금까지 OS 설정만 따라갔는데(2026-08-26 UI 진단 — Notion 등은 OS와 무관하게 앱
 * 자체에서 테마를 고를 수 있어 라이트 화면과 나란히 비교가 안 됐다), 여기서 `<html>`의
 * `data-theme` 속성을 직접 토글해 사용자가 명시적으로 고를 수 있게 한다.
 * 시스템/라이트/다크 3단계로 순환한다(2026-08-26, 사용자 피드백 — "테마 변경이
 * system도 있어야지"). "시스템"은 OS 설정을 그대로 따르는 기본 상태로 되돌리는 것이다.
 */
export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    // 서버 렌더링 시점에는 localStorage를 읽을 수 없어 "system"으로 가정해야 하고, 마운트
    // 직후 곧바로 실제 값으로 바꿔치기해야 hydration mismatch가 나지 않는다(위 주석 참고).
    // 의도된 2-pass 렌더링이라 react-hooks/set-state-in-effect를 억제한다.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTheme(readStoredTheme());
  }, []);

  function cycle() {
    const current = theme ?? "system";
    const next = ORDER[(ORDER.indexOf(current) + 1) % ORDER.length];
    setTheme(next);
    applyTheme(next);
  }

  // 첫 렌더(hydration 이전)에는 실제 선택을 알 수 없으므로 "시스템"으로 가정해 둔다 —
  // layout.tsx의 pre-hydration 스크립트가 이미 저장된 선택을 <html>에 적용해 두므로
  // 실제 화면 색상 자체는 깜빡이지 않고, 이 버튼의 아이콘만 잠깐 기본값으로 보인다.
  const current = theme ?? "system";

  return (
    <button
      type="button"
      onClick={cycle}
      aria-label={`테마: ${LABEL[current]} (클릭하여 전환)`}
      title={`테마: ${LABEL[current]} — 클릭하여 전환`}
      className="rounded-btn p-1.5 text-muted transition-colors duration-default hover:bg-surface-raised hover:text-foreground"
    >
      {current === "system" ? (
        <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <rect x="2.5" y="4" width="15" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
          <path d="M7 17h6M10 14v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      ) : current === "dark" ? (
        <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <circle cx="10" cy="10" r="4" stroke="currentColor" strokeWidth="1.5" />
          <path
            d="M10 2v2M10 16v2M4.2 4.2l1.4 1.4M14.4 14.4l1.4 1.4M2 10h2M16 10h2M4.2 15.8l1.4-1.4M14.4 5.6l1.4-1.4"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path
            d="M17 11.5A7 7 0 1 1 8.5 3a5.5 5.5 0 0 0 8.5 8.5Z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </button>
  );
}
