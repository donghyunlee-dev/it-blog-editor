"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Button, ChipGroup, EmptyState, Modal, Select, Tag } from "@sfood/ui";
import { BrandIcon } from "@/components/BrandIcon";
import { ThemeToggle } from "@/components/ThemeToggle";
import { AccountInfoModal } from "./AccountInfoModal";
import { DeletedDocumentsModal } from "./DeletedDocumentsModal";
import { useUnsavedChanges } from "./UnsavedChangesContext";
import { formatAccountLabel } from "@/lib/account-display";
import type { DocumentSummary, SharedDocumentSummary } from "@/lib/editor/documents";

/** P1-1c: 문서 목록을 이 개수만큼씩 점진적으로 보여준다("더 보기" 버튼). */
const PAGE_SIZE = 30;

export interface EditorSidebarProps {
  documents: DocumentSummary[];
  /** 나에게 공유된 문서 목록(P6-5). 비어 있으면 이 영역 자체를 렌더링하지 않는다. */
  sharedDocuments?: SharedDocumentSummary[];
  activePageId?: string;
  /** 모바일 오프캔버스 드로어에서 링크 클릭 시 드로어를 닫기 위한 콜백(데스크톱에서는 불필요). */
  onNavigate?: () => void;
  /** 데스크톱에서 사이드바를 접을 때 호출한다(EditorShell.tsx). 없으면 접기 버튼을 렌더링하지 않는다. */
  onCollapse?: () => void;
  /** 로그인한 사용자 이메일. 있으면 사이드바 하단에 로그아웃과 함께 표시한다. */
  userEmail?: string;
  /** 계정 폴더의 accountMeta.name(P5-5). 있으면 "이름(이메일)" 형식으로 표시한다. */
  userName?: string;
  /** 로그아웃 서버 액션. 없으면 하단 로그아웃 영역 자체를 렌더링하지 않는다. */
  onLogout?: () => void | Promise<void>;
}

/**
 * 게시 상태를 "게시됨"/"초안" 글자 대신 아이콘 + 색으로만 표시한다(2026-08-26, 사용자
 * 요청 — "텍스트 말고 아이콘과 색상 등으로, 사람이 보고 알 수만 있으면 돼"). 색만으로
 * 구분하면 색맹 사용자가 놓칠 수 있어 모양도 함께 다르게 한다 — 게시됨은 속이 찬 원 +
 * 체크, 초안은 점선 테두리 원. `title`로 호버 시 텍스트를 보여주고 `aria-label`로
 * 스크린리더에도 의미를 남겨, "텍스트를 없앤다"가 "의미까지 없앤다"가 되지 않게 한다.
 * 원래는 문서 아이콘(DocumentIcon, 제목 옆)과 별도로 두 번째 줄에 있었는데, "페이지
 * 아이콘 제거하고 게시 아이콘을 넣어달라"는 요청으로 제목 옆 자리를 이걸로 대체했다
 * (2026-08-26).
 */
export function StatusIcon({ isPublished }: { isPublished: boolean }) {
  if (isPublished) {
    return (
      <svg
        width="13"
        height="13"
        viewBox="0 0 20 20"
        className="shrink-0 text-success"
        role="img"
        aria-label="게시됨"
      >
        <title>게시됨</title>
        <circle cx="10" cy="10" r="8" fill="currentColor" fillOpacity="0.18" />
        <path
          d="M6.3 10.2l2.3 2.3 5-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 20 20"
      className="shrink-0 text-muted"
      role="img"
      aria-label="초안"
    >
      <title>초안</title>
      <circle
        cx="10"
        cy="10"
        r="7.2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeDasharray="2.4 2.4"
      />
    </svg>
  );
}

/**
 * `/editor/{pageId}` 형태의 경로에서 pageId를 추출한다.
 *
 * - `/editor/new`는 문서가 아니라 "새 문서 작성" 경로이므로 pageId로 취급하지 않는다.
 */
export function extractPageIdFromPathname(
  pathname: string | null
): string | undefined {
  if (!pathname) {
    return undefined;
  }
  const match = pathname.match(/^\/editor\/([^/]+)$/);
  const candidate = match?.[1];
  return candidate && candidate !== "new" ? candidate : undefined;
}

export function EditorSidebar({
  documents,
  sharedDocuments = [],
  activePageId,
  onNavigate,
  onCollapse,
  userEmail,
  userName,
  onLogout,
}: EditorSidebarProps) {
  // layout.tsx는 서버 컴포넌트라 현재 경로를 직접 알 수 없으므로, activePageId가
  // 명시적으로 주어지지 않으면(실제 앱에서는 항상 이 경우) 클라이언트에서
  // usePathname으로 현재 열려 있는 문서를 알아낸다. usePathname은 라우터 컨텍스트가
  // 없어도 null을 반환할 뿐 던지지 않으므로 라우터 프로바이더 없는 테스트에서도 안전하다.
  const pathname = usePathname();
  const currentPageId = activePageId ?? extractPageIdFromPathname(pathname);
  // 편집 중인 문서에 저장하지 않은 변경사항이 있으면, 이 사이드바의 링크(로고/"새
  // 문서"/문서 행)로 다른 화면으로 이동하려 할 때도 확인을 받는다(P0-1a). 이 훅이
  // 반환하는 guardNavigate는 <Link>의 내장 onNavigate prop용이고, 이 컴포넌트 자체의
  // props에 있는 onNavigate(모바일 드로어를 닫는 onClick 콜백)와는 별개다 — 혼동하지
  // 않도록 아래에서 각 <Link>에 onClick={onNavigate}와 onNavigate={guardNavigate(...)}를
  // 함께 둔다.
  const { guardNavigate } = useUnsavedChanges();
  const router = useRouter();
  // P1-2b: 삭제된 문서를 복구할 수 있는 Modal. 복구에 성공하면 이 목록(서버 컴포넌트
  // props)이 최신 상태를 반영하도록 router.refresh()로 다시 조회한다.
  const [deletedDocsOpen, setDeletedDocsOpen] = useState(false);
  // P5-4: 계정 정보를 스스로 열고 닫아 확인·수정하는 팝업. 온보딩(P5-2, `/welcome`)과
  // 달리 강제 흐름이 아니라 사용자가 원할 때만 여는 것이라 Modal로 유지한다.
  const [accountInfoOpen, setAccountInfoOpen] = useState(false);

  const [activeTag, setActiveTag] = useState<string | null>(null);
  // 문서가 많아지면 태그 필터만으로는 원하는 문서를 찾기 어렵다(2026-08-26, 사용자
  // 피드백 — "탐색기에 문서가 많을 경우에 보기 안좋은 문제"). 제목 기준 클라이언트
  // 필터를 추가한다.
  const [query, setQuery] = useState("");
  // P1-1b: 정렬 옵션. 기본값은 최신순 — listDocuments()가 반환하는 순서(초안 뒤에
  // 게시 문서를 이어붙인, Confluence API가 준 순서)는 최신순도 제목순도 아니라서
  // 문서가 늘어나면 원하는 문서를 찾기 어렵다는 지적(감사 리포트)에 대응한다.
  const [sortBy, setSortBy] = useState<"updatedAt" | "title">("updatedAt");

  const allTags = useMemo(
    () => Array.from(new Set(documents.flatMap((document) => document.tags))),
    [documents]
  );

  const filteredDocuments = documents
    .filter((document) => !activeTag || document.tags.includes(activeTag))
    .filter((document) => {
      const q = query.trim().toLowerCase();
      if (!q) {
        return true;
      }
      // P1-1a: 제목뿐 아니라 태그도 검색 대상이다 — DocumentSummary.tags는 이미
      // 클라이언트에 내려와 있어 추가 조회 없이 확장할 수 있다. 본문(문서 내용)
      // 검색은 다루지 않는다(docs/superpowers/tasks/P1-1a-search-by-tag-and-content/
      // task.md 참고 — listDocuments의 기존 N+1 비용을 더 늘리는 문제라 별도 결정 필요).
      return (
        document.title.toLowerCase().includes(q) ||
        document.tags.some((tag) => tag.toLowerCase().includes(q))
      );
    })
    // 필터(태그·검색어)를 먼저 적용한 뒤에만 정렬한다 — filter()가 매번 새 배열을
    // 반환하므로 이 sort()가 documents prop 원본을 건드리지 않는다.
    .sort((a, b) =>
      sortBy === "title"
        ? a.title.localeCompare(b.title, "ko")
        : new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );

  // P1-1c: 필터링·정렬된 결과 중 처음 PAGE_SIZE개만 먼저 그린다. 검색어/태그/정렬이
  // 바뀌면 다시 PAGE_SIZE로 되돌린다 — 그렇지 않으면 필터를 바꿨을 때 이전 조건에서
  // 늘려둔 "더 보기" 상태가 새 조건에 엉뚱하게 이어진다. useEffect로 리셋하면 한 번
  // 더 오래된 개수로 그렸다가 다시 그리는 깜빡임이 생기므로, React 공식 문서가 권장하는
  // "렌더링 중 상태 조정" 패턴을 쓴다(https://react.dev/learn/you-might-not-need-an-effect
  // "Adjusting some state when a prop changes").
  const filterKey = `${activeTag ?? ""} ${query} ${sortBy}`;
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [prevFilterKey, setPrevFilterKey] = useState(filterKey);
  if (filterKey !== prevFilterKey) {
    setPrevFilterKey(filterKey);
    setVisibleCount(PAGE_SIZE);
  }
  const visibleDocuments = filteredDocuments.slice(0, visibleCount);
  const hasMore = filteredDocuments.length > visibleDocuments.length;

  return (
    // 폭을 더 이상 여기서 고정하지 않는다(w-64 → w-full) — EditorShell.tsx가 드래그로
    // 조절한 폭을 바깥 래퍼(inline style)로 정하고, 이 <aside>는 그 폭을 그대로
    // 채운다(2026-08-26, 사용자 요청 — "사이즈 조정 바").
    <aside className="flex h-full w-full shrink-0 flex-col border-r border-border bg-surface">
      {/*
        예전에는 데스크톱 사이드바 어디에도 제품명이 없어서(모바일 상단 바에만
        "SFOOD IT Editor" 텍스트가 있었다) 화면만 보면 어떤 서비스인지 알 수 없었다
        (2026-08-26, 사용자 피드백). 로고 마크 + 제품명을 사이드바 최상단에 고정한다.
        로고는 처음엔 글자 "S" 하나짜리 플레이스홀더였는데, 로그인 화면 브랜드
        일러스트(BrandPanelArt)를 축약한 아이콘(BrandIcon)으로 교체했다. 오른쪽 끝에는
        데스크톱 전용 접기 버튼을 둔다(모바일은 이미 오프캔버스 드로어라 별개 —
        onCollapse가 없으면 아예 렌더링하지 않는다).
      */}
      {/*
        py-3 + 내용물 높이로 계산에 맡겼더니, DocumentEditor.tsx 헤더와 이론상
        같은 높이가 나와야 하는데도(각자 다른 내용물 — 아이콘/버튼 조합 — 이라
        실제로는 미묘하게 어긋났다) 실제로는 국경선이 안 맞았다(2026-08-26, 사용자
        피드백 — "패널과 헤더 라인 높이가 안맞아서 굉장히 불편해"). 계산에 맡기지
        않고 h-14(56px)로 두 헤더 모두 못을 박아 항상 정확히 맞춘다.
      */}
      <div className="flex h-14 shrink-0 items-center gap-2 border-b border-border px-3">
        {/*
          제품명을 누르면 메인 화면(/editor)으로 이동한다(2026-08-26, 사용자 요청).
          rounded-btn을 재사용해 나머지 아이콘 버튼들과 같은 hover/focus-visible
          스타일을 공유한다 — 별도 스타일을 새로 만들지 않는다.
        */}
        <Link
          href="/editor"
          onClick={onNavigate}
          onNavigate={(event) => guardNavigate(event, "/editor")}
          className="flex min-w-0 flex-1 items-center gap-2 rounded-btn py-1 pl-1 -ml-1 transition-colors duration-default hover:bg-surface-raised"
        >
          <BrandIcon size={24} className="shrink-0 rounded" />
          <span className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">
            SFOOD IT Editor
          </span>
        </Link>
        {onCollapse && (
          <button
            type="button"
            onClick={onCollapse}
            aria-label="문서함 접기"
            title="문서함 접기"
            className="hidden shrink-0 rounded-btn p-1.5 text-muted transition-colors duration-default hover:bg-surface-raised hover:text-foreground md:block"
          >
            {/*
              화살표 쪽 + 세로선이 붙어 있는 모양이 알파벳 "K"처럼 보인다는 피드백으로
              (2026-08-26) 다시 그렸다 — 패널(바깥 사각형)을 세로선으로 나누고 왼쪽
              칸에 작은 화살표를 넣는, 에디터에서 흔히 쓰는 "사이드바 접기" 아이콘
              모양으로 바꿨다.
            */}
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <rect x="2.5" y="3.5" width="15" height="13" rx="2" stroke="currentColor" strokeWidth="1.4" />
              <line x1="8" y1="3.5" x2="8" y2="16.5" stroke="currentColor" strokeWidth="1.4" />
              <path
                d="M6 8l-1.6 2 1.6 2"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        )}
      </div>

      {/*
        "새 문서"와 아래 검색 입력 사이 구분선을 없앴다(2026-08-26, 사용자 피드백 —
        "새문서와 검색 사이 라인은 불필요하다"). 이 둘은 같은 "컨트롤 영역"이라 굳이
        나눌 필요가 없고, 진짜 구분이 필요한 경계(컨트롤 영역 ↔ 문서 목록)는 검색
        입력 쪽 border-b가 그대로 맡는다.
      */}
      <div className="p-3 pb-0">
        {/*
          @sfood/ui의 Button은 <button>만 지원해 href를 받을 수 없다(ButtonHTMLAttributes 기반).
          실제 페이지 이동이 필요하므로 Link를 쓰되, 이 사이드바의 유일한 1차 액션이라는 의미를
          살리기 위해 Button variant="primary"와 동일한 토큰 클래스를 그대로 재사용한다.
        */}
        <Link
          href="/editor/new"
          onClick={onNavigate}
          onNavigate={(event) => guardNavigate(event, "/editor/new")}
          className="inline-flex w-full items-center justify-center gap-2 rounded-btn bg-brand px-4 py-2 text-sm font-medium text-on-brand transition-colors duration-default hover:bg-brand-hover"
        >
          <svg width="15" height="15" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          새 문서
        </Link>
      </div>

      {/*
        "내 문서"와 섞이지 않도록 분리된 영역이다(P6-5, prd.md "공유받은 문서 목록 조회").
        비어 있으면 영역 자체를 렌더링하지 않는다 — 빈 상태 문구도 두지 않는다(대부분의
        사용자에게는 평생 안 보일 영역이라, 있지도 않은 걸 "없다"고 설명할 필요가 없다).
      */}
      {sharedDocuments.length > 0 && (
        <div className="flex flex-col gap-1 border-b border-border p-3">
          <p className="px-1 text-xs font-medium text-muted">공유받은 문서</p>
          <ul className="flex flex-col gap-0.5">
            {sharedDocuments.map((document) => {
              const isActive = document.pageId === currentPageId;
              const ownerLabel = formatAccountLabel(document.ownerEmail, document.ownerName);
              return (
                <li key={document.pageId}>
                  <Link
                    href={`/editor/${document.pageId}`}
                    onClick={onNavigate}
                    onNavigate={(event) => guardNavigate(event, `/editor/${document.pageId}`)}
                    aria-current={isActive ? "page" : undefined}
                    title={`공유자: ${ownerLabel}`}
                    className={
                      "block rounded-btn py-1.5 pl-2 pr-3 transition-colors duration-default " +
                      (isActive
                        ? "sidebar-row-active text-foreground"
                        : "text-foreground hover:bg-surface-raised")
                    }
                  >
                    <div className="flex items-start gap-1">
                      <span className="mt-0.5">
                        <StatusIcon isPublished={document.isPublished} />
                      </span>
                      <p className="min-w-0 truncate text-sm font-medium">{document.title}</p>
                    </div>
                    <p className="mt-0.5 truncate pl-[18px] text-xs text-muted">{ownerLabel}</p>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {documents.length > 0 && (
        <div className="flex flex-col gap-2 border-b border-border p-3">
          <label className="sr-only" htmlFor="sidebar-doc-search">
            문서 제목·태그 검색
          </label>
          <input
            id="sidebar-doc-search"
            type="search"
            placeholder="문서 검색"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="w-full rounded-input border border-border bg-surface px-3 py-1.5 text-sm text-foreground outline-none placeholder:text-placeholder focus:border-brand focus:ring-2 focus:ring-brand"
          />
          {/*
            이 검색창은 제목·태그만 본다(위 label 참고). 본문까지 찾고 싶을 때 쓸 수 있는
            Ctrl+K 전체 검색(GlobalSearchModal.tsx, P1-1a 후속)이 있다는 걸 알리는 힌트다 —
            그 모달은 자체적으로 열림 상태를 관리해(EditorShell.tsx에 한 번만 마운트) 여기서
            직접 열 수는 없다.
          */}
          <p className="text-xs text-muted">본문까지 찾으려면 Ctrl+K(Mac: ⌘K)</p>
          <label className="sr-only" htmlFor="sidebar-doc-sort">
            문서 정렬
          </label>
          <Select
            id="sidebar-doc-sort"
            value={sortBy}
            onChange={(event) =>
              setSortBy(event.target.value as "updatedAt" | "title")
            }
            options={[
              { value: "updatedAt", label: "최신순" },
              { value: "title", label: "제목순" },
            ]}
          />
        </div>
      )}

      {allTags.length > 0 && (
        <div className="border-b border-border p-3">
          <ChipGroup
            items={allTags.map((tag) => ({ id: tag, label: tag }))}
            value={activeTag ?? ""}
            onChange={(id) =>
              setActiveTag((current) => (current === id ? null : id))
            }
          />
        </div>
      )}

      <nav className="flex-1 overflow-y-auto p-3" aria-label="문서 목록">
        {documents.length === 0 ? (
          <EmptyState title="아직 작성한 문서가 없습니다." />
        ) : filteredDocuments.length === 0 ? (
          <EmptyState title="조건에 맞는 문서가 없습니다." />
        ) : (
          // 예전엔 행 사이에 divide-y 구분선이 있었는데, "문서함을 좀 더 심플하게...
          // 구분 라인도 필요없어"라는 요청으로 뺐다(2026-08-26). 행 자체의 hover
          // 배경(아래 isActive 삼항)만으로도 행 구분은 충분하다.
          <ul className="flex flex-col gap-0.5">
            {visibleDocuments.map((document) => {
              const isActive = document.pageId === currentPageId;
              return (
                <li key={document.pageId}>
                  <Link
                    href={`/editor/${document.pageId}`}
                    onClick={onNavigate}
                    onNavigate={(event) =>
                      guardNavigate(event, `/editor/${document.pageId}`)
                    }
                    aria-current={isActive ? "page" : undefined}
                    // 왼쪽 강조 테두리 바는 빼고 배경색만 쓴다 — 사용자 피드백: "이
                    // 패턴은 AI가 자주 만드는 디자인이야"(2026-08-26). 위아래 패딩을
                    // py-2(8px)에서 py-1.5(6px)로 좁혀 목록을 더 촘촘하게 만들고,
                    // 왼쪽은 pl-2(8px, 기존 px-3 대비 4px 절약)로 줄여 제목이 잘리기
                    // 전까지 보이는 글자 수를 늘렸다(2026-08-26, 사용자 요청 — "왼쪽
                    // 공백도 좀 줄여서 제목이 더 보이게"). 오른쪽은 그대로 pr-3(12px)
                    // 둬서 리사이즈 핸들과 부딪히지 않게 여유를 남긴다.
                    className={
                      "block rounded-btn py-1.5 pl-2 pr-3 transition-colors duration-default " +
                      (isActive
                        ? "sidebar-row-active text-foreground"
                        : "text-foreground hover:bg-surface-raised")
                    }
                  >
                    {/*
                      예전엔 제목 옆에 문서 아이콘(모든 행에서 똑같아 정보가 없었다)이
                      있었는데, 게시 상태 아이콘으로 바꿨다 — 한눈에 게시됨/초안을
                      구분할 수 있어 더 쓸모 있는 자리다(2026-08-26, "페이지 아이콘
                      제거하고 게시 아이콘을 넣어줘"). 날짜는 문서를 열었을 때 보이는
                      풋터로 옮겨서(DocumentEditor.tsx) 여기서는 뺐다. 아이콘·간격도
                      같은 이유로 좁혔다(14px→13px, gap-1.5→gap-1).
                    */}
                    <div className="flex items-start gap-1">
                      <span className="mt-0.5">
                        <StatusIcon isPublished={document.isPublished} />
                      </span>
                      <p className="min-w-0 truncate text-sm font-medium">
                        {document.title}
                      </p>
                    </div>
                    {document.tags.length > 0 && (
                      <div className="mt-1 flex flex-wrap items-center gap-1.5 pl-[18px]">
                        {document.tags.map((tag) => (
                          <Tag key={tag}>{tag}</Tag>
                        ))}
                      </div>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
        {/* P1-1c: 문서가 많으면 한 번에 다 그리지 않고 점진적으로 보여준다. */}
        {hasMore && (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="mt-2 w-full"
            onClick={() => setVisibleCount((current) => current + PAGE_SIZE)}
          >
            더 보기
          </Button>
        )}
      </nav>

      {/*
        문서 목록(nav)과 계정 정보 사이에 별도로 분리한 "문서 관련 기능" 영역이다
        (2026-08-28, 사용자 요청 — "페이지 관련된 기능이 있으면 별도의 영역을
        분리하는 게 좋겠어"). 지금은 "삭제된 문서" 하나뿐이지만, 문서 자체를
        다루는(개별 문서 열기가 아닌) 기능이 늘어나면 이 자리에 계속 추가한다.
      */}
      <div className="border-t border-border p-2">
        <button
          type="button"
          onClick={() => setDeletedDocsOpen(true)}
          className="flex w-full items-center gap-2 rounded-btn px-2 py-1.5 text-xs text-muted transition-colors duration-default hover:bg-surface-raised hover:text-foreground"
        >
          {/*
            휴지통(삭제) 아이콘 대신 "되돌리기" 아이콘을 쓴다(2026-08-28, 사용자
            요청 — 이 버튼은 삭제하는 동작이 아니라 삭제된 것을 복구하는 동작이라
            휴지통 아이콘이 오해를 준다는 지적).
          */}
          <svg width="14" height="14" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path
              d="M4.5 8A6 6 0 1 1 6 13.5"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
            />
            <path
              d="M4.5 4v4h4"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          삭제된 문서
        </button>
      </div>

      {onLogout && (
        // 예전에는 이메일 아래에 "로그아웃"이 풀폭 텍스트로 세로로 쌓여 있어 어색했고,
        // 화면 맨 아래-왼쪽 구석이라 브라우저 확장 프로그램이 그리는 플로팅 버튼(예:
        // 노션 웹 클리퍼의 원형 "N" 아이콘 — 이 앱 코드와 무관한 브라우저 확장 UI다)에
        // 가려지기도 했다(2026-08-26, 사용자 피드백). 한 줄에 이메일 + 테마 토글 +
        // 아이콘형 로그아웃 버튼으로 압축해 세로 공간을 줄이고, 텍스트 대신 아이콘
        // 버튼이라 확장 프로그램 아이콘과도 덜 헷갈린다.
        <form
          action={onLogout}
          className="flex items-center gap-1 border-t border-border p-3"
        >
          {/*
            P5-4: 이메일 표시 자체를 계정 정보 팝업 진입점으로 쓴다 — 별도 아이콘을
            더하지 않고, 로그아웃 버튼과 같은 hover 스타일(hover:bg-surface-raised
            hover:text-foreground)을 줘서 클릭 가능하다는 것을 알린다.
          */}
          <button
            type="button"
            onClick={() => setAccountInfoOpen(true)}
            title="계정 정보"
            className="min-w-0 flex-1 truncate rounded-btn px-1 py-0.5 text-left text-xs text-muted transition-colors duration-default hover:bg-surface-raised hover:text-foreground"
          >
            {/* P5-5: 이름이 있으면 "이름(이메일)" 형식으로, 없으면(하위 호환) 이메일만. */}
            {userEmail && formatAccountLabel(userEmail, userName)}
          </button>
          <ThemeToggle />
          <button
            type="submit"
            aria-label="로그아웃"
            title="로그아웃"
            className="rounded-btn p-1.5 text-muted transition-colors duration-default hover:bg-surface-raised hover:text-foreground"
          >
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path
                d="M8 17H4.5A1.5 1.5 0 0 1 3 15.5v-11A1.5 1.5 0 0 1 4.5 3H8M13 14l4-4-4-4M17 10H8"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </form>
      )}

      <Modal
        open={deletedDocsOpen}
        onClose={() => setDeletedDocsOpen(false)}
        title="삭제된 문서"
      >
        <DeletedDocumentsModal onRestored={() => router.refresh()} />
      </Modal>

      <Modal
        open={accountInfoOpen}
        onClose={() => setAccountInfoOpen(false)}
        title="계정 정보"
      >
        <AccountInfoModal />
      </Modal>
    </aside>
  );
}
