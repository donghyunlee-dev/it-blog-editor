"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { EditorSidebar } from "./EditorSidebar";
import { GlobalSearchModal } from "./GlobalSearchModal";
import { UnsavedChangesProvider } from "./UnsavedChangesContext";
import type { DocumentSummary, SharedDocumentSummary } from "@/lib/editor/documents";

const MOBILE_QUERY = "(max-width: 767px)";

const DEFAULT_WIDTH = 256;
// 200px에서는 브랜딩 행(로고 24px + "SFOOD IT Editor" 텍스트 + 접기 버튼 28px +
// 좌우 padding)의 실측 필요 폭(~197px)과 거의 같아 여유가 3px밖에 없어 텍스트가
// 잘리기 쉬웠다(2026-08-26, 사용자 피드백 — "왼쪽 상단 서비스 이름까지 문서함이
// 좁혀지지 않게"). 실제 렌더링 폰트(Pretendard)로 측정해 여유를 두고 220으로 올린다.
const MIN_WIDTH = 220;
const MAX_WIDTH = 440;
// 키보드(방향키)로 한 번에 조절하는 폭(px). 마우스 드래그는 clientX를 그대로 따라가 1px
// 단위로 촘촘하지만, 키보드는 이산적인 조작이라 한 번에 체감 가능한 변화가 필요하다 —
// 전체 범위(220~440, 폭 220px)를 14회 안팎으로 왕복 가능한, 과하지 않은 값으로 정했다
// (2026-09-07, P2-1b — GitHub Issue 없이 직접 정함, P1-6a/b/c와 같은 구현 디테일 판단).
const WIDTH_STEP = 16;
const WIDTH_STORAGE_KEY = "sfood-editor-sidebar-width";
const COLLAPSED_STORAGE_KEY = "sfood-editor-sidebar-collapsed";

function clampWidth(width: number): number {
  return Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, width));
}

function HamburgerIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export interface EditorShellProps {
  documents: DocumentSummary[];
  /** 나에게 공유된 문서 목록(P6-5). "내 문서" 목록과 분리해 사이드바 상단에 보여준다. */
  sharedDocuments?: SharedDocumentSummary[];
  children: React.ReactNode;
  userEmail?: string;
  /** 계정 폴더의 accountMeta.name(P5-5). 있으면 "이름(이메일)" 형식으로 표시한다. */
  userName?: string;
  onLogout?: () => void | Promise<void>;
}

/**
 * `/editor` 앱 셸의 반응형 래퍼. 데스크톱(`md` 이상)에서는 사이드바가 항상 고정 표시되고,
 * 모바일에서는 기본적으로 화면 밖에 숨겨져 있다가 좌상단 토글 버튼으로 오프캔버스
 * 드로어처럼 열린다(2026-08-25 UI 진단 — 375px 뷰포트에서 256px 고정 사이드바가 화면의
 * 68%를 차지해 본문이 사실상 쓸 수 없는 폭까지 줄어드는 문제를 해결).
 *
 * 데스크톱 전용으로 폭 조절(드래그) + 접기/펼치기(햄버거 아이콘)를 추가한다(2026-08-26,
 * 사용자 요청 — "문서함의 사이즈 조정 바와 닫기 열기 기능이 없다"). 모바일은 이미
 * 오프캔버스 드로어로 여닫히므로(위 `open`/`isMobile`) 이 둘은 건드리지 않는다 — 별개의
 * 상태(`collapsed`)로 관리한다.
 */
export function EditorShell({
  documents,
  sharedDocuments,
  children,
  userEmail,
  userName,
  onLogout,
}: EditorShellProps) {
  const [open, setOpen] = useState(false);
  // Tailwind의 `translate-x-0`/`-translate-x-full` 조합을 이 프로젝트의 Tailwind v4 설정
  // (v3 프리셋을 `@config`로 불러오는 호환 모드, design.md의 C1 참고)에서 토글해 보니
  // 클래스는 바뀌어도 실제 계산된 `translate` 값이 갱신되지 않는 현상이 있었다
  // (2026-08-25 확인). 이 프로젝트의 Tailwind 유틸리티 세대/특정성 규칙에 기대지 않도록,
  // 오프캔버스 여닫힘은 인라인 스타일 + matchMedia로 직접 제어한다.
  const [isMobile, setIsMobile] = useState(false);

  const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_WIDTH);
  const [collapsed, setCollapsed] = useState(false);
  const draggingRef = useRef(false);

  useEffect(() => {
    const mql = window.matchMedia(MOBILE_QUERY);
    // 서버 렌더링 시점에는 matchMedia를 쓸 수 없어 isMobile=false로 가정해야 하고, 마운트
    // 직후 실제 값으로 동기화해야 한다 — 의도된 2-pass 렌더링(ThemeToggle.tsx와 동일 패턴).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsMobile(mql.matches);
    const handleChange = (event: MediaQueryListEvent) => setIsMobile(event.matches);
    mql.addEventListener("change", handleChange);
    return () => mql.removeEventListener("change", handleChange);
  }, []);

  // 폭·접힘 상태는 사용자가 한 번 맞춰 두면 계속 유지되길 기대하는 개인 설정이라
  // localStorage에 저장한다(ThemeToggle.tsx와 같은 패턴 — try/catch로 감싸 프라이빗
  // 브라우징 등 저장이 막힌 환경에서도 기능 자체는 동작하게 한다).
  useEffect(() => {
    try {
      const storedWidth = window.localStorage.getItem(WIDTH_STORAGE_KEY);
      if (storedWidth) {
        const parsed = Number(storedWidth);
        if (!Number.isNaN(parsed)) {
          // 서버에는 저장된 폭이 없어 DEFAULT_WIDTH로 가정해야 하고, 마운트 직후 실제 값으로
          // 동기화해야 한다 — 의도된 2-pass 렌더링(위 useEffect들과 동일 패턴).
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setSidebarWidth(clampWidth(parsed));
        }
      }
      setCollapsed(window.localStorage.getItem(COLLAPSED_STORAGE_KEY) === "true");
    } catch {
      // 무시 — 기본값(펼침, 256px) 그대로 쓴다.
    }
  }, []);

  function persistWidth(width: number) {
    try {
      window.localStorage.setItem(WIDTH_STORAGE_KEY, String(width));
    } catch {
      // 무시.
    }
  }

  function persistCollapsed(value: boolean) {
    try {
      window.localStorage.setItem(COLLAPSED_STORAGE_KEY, String(value));
    } catch {
      // 무시.
    }
  }

  function startResize() {
    draggingRef.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }

  useEffect(() => {
    function handleMouseMove(event: MouseEvent) {
      if (!draggingRef.current) return;
      // 사이드바가 항상 화면 왼쪽에 붙어 있으므로(고정 x=0), 커서의 clientX가 곧
      // 원하는 폭이다 — 사이드바 자신의 위치를 따로 측정할 필요가 없다.
      setSidebarWidth(clampWidth(event.clientX));
    }
    function handleMouseUp() {
      if (!draggingRef.current) return;
      draggingRef.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      setSidebarWidth((current) => {
        persistWidth(current);
        return current;
      });
    }
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  // 방향키(ArrowLeft/ArrowRight)로 WIDTH_STEP만큼, Home/End로 최소/최대 폭까지 즉시 이동한다
  // — 마우스 드래그와 마찬가지로 clampWidth()를 거치고 결과를 곧바로 persistWidth()로
  // 저장해, 두 조작 경로가 항상 같은 범위·저장 방식을 공유하게 한다.
  function handleHandleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    let next: number | null = null;
    if (event.key === "ArrowLeft") next = sidebarWidth - WIDTH_STEP;
    else if (event.key === "ArrowRight") next = sidebarWidth + WIDTH_STEP;
    else if (event.key === "Home") next = MIN_WIDTH;
    else if (event.key === "End") next = MAX_WIDTH;
    if (next === null) return;

    event.preventDefault();
    const clamped = clampWidth(next);
    setSidebarWidth(clamped);
    persistWidth(clamped);
  }

  function toggleCollapsed(next: boolean) {
    setCollapsed(next);
    persistCollapsed(next);
  }

  const drawerHidden = isMobile && !open;

  // 사이드바(EditorSidebar)와 문서 편집 화면(children, DocumentEditor)이 함께 감싸이는
  // 유일한 지점이라(둘 다 여기 아래에서 렌더링된다) 이탈 경고(P0-1a)의 Provider를 여기
  // 하나에만 둔다 — "다른 문서로 이동" 가드가 사이드바 링크와 편집 화면의 뒤로가기
  // 링크 모두에 적용되려면 두 쪽이 같은 Context를 공유해야 한다.
  return (
    <UnsavedChangesProvider>
    <GlobalSearchModal />
    <div className="flex h-screen flex-col md:flex-row">
      <div className="flex items-center gap-3 border-b border-border bg-surface px-3 py-2 md:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="문서 목록 열기"
          className="rounded-btn p-2 text-foreground hover:bg-surface-raised"
        >
          <HamburgerIcon />
        </button>
        <span className="text-sm font-medium text-foreground">SFOOD IT Editor</span>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-30 bg-inverse-surface/40 md:hidden"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      {/*
        접힌 상태(데스크톱 전용)에서는 사이드바 자체가 폭 0으로 숨는 대신, 여기 이
        작은 버튼 하나로 다시 펼 수 있게 한다 — 사이드바 밖(본문 영역)에 있어야
        사이드바가 없어져도 항상 클릭할 수 있다.
      */}
      {collapsed && (
        <button
          type="button"
          onClick={() => toggleCollapsed(false)}
          aria-label="문서함 펼치기"
          title="문서함 펼치기"
          className="fixed left-3 top-3 z-40 hidden rounded-btn border border-border bg-surface p-2 text-foreground shadow-md transition-colors duration-default hover:bg-surface-raised md:block"
        >
          <HamburgerIcon />
        </button>
      )}

        {/*
          md:relative(md:static가 아니라) — 데스크톱에서 이 래퍼가 폭 조절 핸들
          (position: absolute)의 기준(containing block)이 돼야 한다. relative는
          static과 마찬가지로 일반 문서 흐름에 남아 md:flex-row 레이아웃에 그대로
          참여하면서(사이드바가 본문과 나란히 앉음), absolute 자식의 위치 기준
          역할까지 겸한다.
        */}
      <div
        className="fixed inset-y-0 left-0 z-40 shrink-0 transition-transform duration-default md:relative md:z-auto"
        style={{
          transform: drawerHidden ? "translateX(-100%)" : undefined,
          width: collapsed ? 0 : sidebarWidth,
          overflow: collapsed ? "hidden" : undefined,
        }}
      >
        <div style={{ width: sidebarWidth, height: "100%" }}>
          <EditorSidebar
            documents={documents}
            sharedDocuments={sharedDocuments}
            onNavigate={() => setOpen(false)}
            onCollapse={() => toggleCollapsed(true)}
            userEmail={userEmail}
            userName={userName}
            onLogout={onLogout}
          />
        </div>
        {/*
          드래그 핸들. "정말 얇게"(2026-08-26, 사용자 요청) — 평소엔 거의 안 보이다가
          (hover:bg-brand/50) 호버하면 브랜드색으로 살짝 드러난다. 실제 클릭 히트
          영역(w-1.5, 6px)은 눈에 보이는 선보다 조금 넓게 잡아 정밀하게 잡지 않아도
          드래그를 시작할 수 있게 한다. 모바일 드로어에는 폭 조절 개념이 없어 md 이상
          에서만 보인다.
        */}
        {!collapsed && (
          // 눈에 보이는 선 자체는 1px로 가늘게 하되(2026-08-26, 사용자 요청 — "조절
          // 바의 width를 더 얇게"), 클릭 히트 영역은 그보다 넓게(w-2.5, 10px) 잡아야
          // 실제로 드래그를 시작하기 쉽다 — 바깥(히트 영역)은 항상 투명하고, 안쪽의
          // 얇은 선만 바깥에 마우스가 올라갔을 때(group-hover) 브랜드색으로 드러난다.
          <div
            onMouseDown={startResize}
            onKeyDown={handleHandleKeyDown}
            role="separator"
            tabIndex={0}
            aria-orientation="vertical"
            aria-label="문서함 폭 조절"
            aria-valuenow={sidebarWidth}
            aria-valuemin={MIN_WIDTH}
            aria-valuemax={MAX_WIDTH}
            // right-0으로 이 요소의 오른쪽 끝을 패널 오른쪽 끝에 맞춘 뒤, translate-x-1/2
            // (양수)로 자기 폭의 절반만큼 오른쪽으로 더 밀어낸다 — 그래야 핸들이 경계선을
            // 걸치고 서서 절반은 패널 밖, 절반은 안쪽에 걸린다. 부호를 반대로(-translate-x-1/2)
            // 줬더니 핸들 전체가 패널 안쪽으로 더 들어가 버렸다(2026-08-26, 사용자 피드백 —
            // "왼쪽 안으로 들어가있어").
            //
            // 키보드 포커스 표시(sidebar-resize-handle:focus-visible, globals.css)는 이
            // 프로젝트가 Button류에 이미 쓰는 --color-brand 포커스 링과 톤을 맞췄다
            // (2026-09-07, P2-1b).
            className="sidebar-resize-handle group absolute inset-y-0 right-0 z-10 hidden w-2.5 translate-x-1/2 cursor-col-resize md:block"
          >
            <div className="mx-auto h-full w-px bg-transparent transition-colors duration-default group-hover:bg-brand/60" />
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">{children}</div>
    </div>
    </UnsavedChangesProvider>
  );
}
