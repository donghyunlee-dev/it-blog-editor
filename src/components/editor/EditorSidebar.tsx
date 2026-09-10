"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, type KeyboardEvent } from "react";
import { Button, ChipGroup, EmptyState, Modal, Select, Tag, useToast } from "@sfood/ui";
import { BrandIcon } from "@/components/BrandIcon";
import { ThemeToggle } from "@/components/ThemeToggle";
import { AccountInfoModal } from "./AccountInfoModal";
import { DeletedDocumentsModal } from "./DeletedDocumentsModal";
import { FolderFormModal, type FolderFormMode } from "./FolderFormModal";
import { MoveDocumentModal } from "./MoveDocumentModal";
import { useUnsavedChanges } from "./UnsavedChangesContext";
import { formatAccountLabel } from "@/lib/account-display";
import type { DocumentSummary, SharedDocumentSummary } from "@/lib/editor/documents";
import type { FolderNode } from "@/lib/editor/folders";

/** P1-1c: 문서 목록을 이 개수만큼씩 점진적으로 보여준다("더 보기" 버튼). */
const PAGE_SIZE = 30;

/**
 * P7-4: 폴더 펼침/접힘 상태를 계정별이 아니라 브라우저별로 유지한다 — `EditorShell.tsx`의
 * 사이드바 폭/접힘 상태(`WIDTH_STORAGE_KEY`/`COLLAPSED_STORAGE_KEY`)와 같은 이유·같은
 * try/catch 패턴이다(프라이빗 브라우징 등 저장이 막힌 환경에서도 기능은 그대로 동작).
 * 폴더 하나하나 키를 따로 두지 않고 `{ [folderId]: boolean }` 객체 하나로 묶어 저장한다.
 */
const FOLDER_EXPANDED_STORAGE_KEY = "sfood-editor-folder-tree-expanded";

/**
 * `@sfood/ui`의 `Icon`은 `search`/`comment`만 제공해 폴더 트리에 쓸 아이콘이 없다 —
 * 이 파일의 기존 `StatusIcon`과 같은 스타일(`viewBox 0 0 20 20`, `stroke="currentColor"`)로
 * 직접 그린다. 펼침 화살표는 상태에 따라 90도 회전시켜 하나의 path로 양쪽을 표현한다.
 */
function ChevronIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 20 20"
      fill="none"
      className={`shrink-0 text-muted transition-transform duration-default ${expanded ? "rotate-90" : ""}`}
      aria-hidden="true"
    >
      <path d="M7 4l6 6-6 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function FolderIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 20 20" fill="none" className="shrink-0 text-muted" aria-hidden="true">
      <path
        d="M3 5.5A1.5 1.5 0 0 1 4.5 4h3.4l1.4 1.8h6.2A1.5 1.5 0 0 1 17 7.3v7.2A1.5 1.5 0 0 1 15.5 16h-11A1.5 1.5 0 0 1 3 14.5v-9z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** P7-5: 폴더 생성·이름변경·삭제 액션 아이콘. 나머지 아이콘과 같은 스타일로 직접 그린다. */
function PlusIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M13.5 3.5l3 3L6 17H3v-3z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M4 6h12M7.5 6V4.5A1.5 1.5 0 0 1 9 3h2a1.5 1.5 0 0 1 1.5 1.5V6m-7 0v9.5A1.5 1.5 0 0 0 7 17h6a1.5 1.5 0 0 0 1.5-1.5V6"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** P7-6: 문서 행의 "이동" 액션 아이콘 — 폴더로 옮긴다는 의미를 담아 화살표가 폴더로 들어가는 모양. */
function MoveToFolderIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M3 5.5A1.5 1.5 0 0 1 4.5 4h3.4l1.4 1.8h6.2A1.5 1.5 0 0 1 17 7.3v7.2A1.5 1.5 0 0 1 15.5 16h-11A1.5 1.5 0 0 1 3 14.5v-9z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
      <path
        d="M7.5 11.5l2.2-2.2m0 0l2.2 2.2m-2.2-2.2v5"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export interface EditorSidebarProps {
  documents: DocumentSummary[];
  /** 나에게 공유된 문서 목록(P6-5). 비어 있으면 이 영역 자체를 렌더링하지 않는다. */
  sharedDocuments?: SharedDocumentSummary[];
  /** 내 폴더 트리(P7-4). 없거나 빈 배열이면 기존과 동일하게 평평한 문서 목록만 보여준다. */
  folders?: FolderNode[];
  activePageId?: string;
  /** 모바일 오프캔버스 드로어에서 링크 클릭 시 드로어를 닫기 위한 콜백(데스크톱에서는 불필요). */
  onNavigate?: () => void;
  /** 데스크톱에서 사이드바를 접을 때 호출한다(EditorShell.tsx). 없으면 접기 버튼을 렌더링하지 않는다. */
  onCollapse?: () => void;
  /** 헤더의 검색 트리거 버튼 클릭 시 호출한다(P8-1, EditorShell.tsx의 GlobalSearchModal을 연다). 없으면 버튼을 렌더링하지 않는다. */
  onOpenSearch?: () => void;
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
/**
 * 헤더 검색 트리거 버튼(P8-1)과 모바일 상단 바(EditorShell.tsx)가 함께 쓴다 — 같은
 * 버튼을 두 군데(데스크톱 사이드바 헤더 행, 모바일 오프캔버스가 닫혀 있을 때 보이는 상단
 * 바)에 두는 것이라 StatusIcon처럼 여기서 한 번만 정의해 내보낸다.
 */
export function SearchTriggerIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.6" />
      <path d="M13.4 13.4L17 17" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

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
  folders = [],
  activePageId,
  onNavigate,
  onCollapse,
  onOpenSearch,
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
  const { toast } = useToast();
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

  // P7-4: 폴더 펼침/접힘 상태. 기본값(저장된 값이 없는 폴더)은 펼침이다 — 폴더가 있어도
  // 처음엔 기존 "다 보이는" 경험과 최대한 비슷하게 시작한다. 서버 렌더링 시점에는
  // localStorage를 읽을 수 없어 빈 객체(=전부 펼침)로 시작하고, 마운트 후 실제 값으로
  // 동기화한다 — EditorShell.tsx의 사이드바 폭/접힘 상태와 동일한 2-pass 패턴이라
  // hydration mismatch가 없다.
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(FOLDER_EXPANDED_STORAGE_KEY);
      if (stored) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setExpandedFolders(JSON.parse(stored));
      }
    } catch {
      // 무시 — 기본값(전부 펼침) 그대로 쓴다.
    }
  }, []);

  function toggleFolder(folderId: string) {
    setExpandedFolders((current) => {
      const next = { ...current, [folderId]: !(current[folderId] ?? true) };
      try {
        window.localStorage.setItem(FOLDER_EXPANDED_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // 무시.
      }
      return next;
    });
  }

  // P7-7: 편집 화면 헤더 브레드크럼에서 폴더를 누르면 `/editor?folder={id}`로 이동한다 —
  // 전용 폴더 상세 화면이 없어(P7-4 사이드바 트리 하나로 탐색을 통일한 기존 설계), 여기서
  // 그 폴더까지 조상 체인을 펼치고 스크롤·잠깐 강조해 "탐색 도착"을 대신한다. searchParams는
  // 라우터 컨텍스트가 없는 테스트에서도 usePathname처럼 null을 반환할 뿐 던지지 않는다.
  const searchParams = useSearchParams();
  const focusFolderId = searchParams?.get("folder") ?? null;
  const [highlightedFolderId, setHighlightedFolderId] = useState<string | null>(null);
  useEffect(() => {
    if (!focusFolderId) return;
    const target = folders.find((folder) => folder.id === focusFolderId);
    if (!target) return; // 폴더가 삭제된 뒤 남은 오래된 링크 등 — 조용히 무시한다.

    const ancestorIds: string[] = [];
    let current: FolderNode | undefined = target;
    while (current) {
      ancestorIds.push(current.id);
      const parentId: string | null = current.parentId;
      current = parentId ? folders.find((folder) => folder.id === parentId) : undefined;
    }
    // URL의 focusFolderId(외부 시스템 — 브라우저 주소창)가 바뀔 때만 반응하는 동기화라
    // 위 localStorage 로드 effect와 같은 이유로 이 규칙의 일반 사례(effect 안에서의
    // 무조건적 setState)에 해당하지 않는다.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setExpandedFolders((prev) => {
      const next = { ...prev };
      for (const id of ancestorIds) next[id] = true;
      try {
        window.localStorage.setItem(FOLDER_EXPANDED_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // 무시.
      }
      return next;
    });
    setHighlightedFolderId(focusFolderId);
    document
      .getElementById(`sidebar-folder-${focusFolderId}`)
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
    const highlightTimer = setTimeout(() => setHighlightedFolderId(null), 1600);
    // 뒤로가기로 같은 폴더를 다시 눌러도 매번 반응하도록 쿼리를 지운다(replace라 히스토리
    // 엔트리를 추가하지 않는다).
    router.replace("/editor");
    return () => clearTimeout(highlightTimer);
  }, [focusFolderId, folders, router]);

  // P7-5: 폴더 생성·이름변경은 같은 폼(FolderFormModal)을 모드로만 나눠 재사용한다.
  // 삭제는 문서 삭제(DocumentEditor.tsx)와 동일하게 window.confirm() 대신 Modal로
  // 확인받는다(CLAUDE.md UI 규칙) — 대상 폴더를 상태로 들고 있다가 확인 시에만 호출한다.
  const [folderFormState, setFolderFormState] = useState<FolderFormMode | null>(null);
  const [deleteFolderTarget, setDeleteFolderTarget] = useState<FolderNode | null>(null);
  const [deletingFolder, setDeletingFolder] = useState(false);

  // P7-6: 문서를 다른 폴더로 옮기는 모달의 대상 문서. 드래그앤드롭은 범위 밖이라
  // "이동" 메뉴/모달로만 구현한다(prd.md Phase 7 핵심 결정).
  const [moveDocumentTarget, setMoveDocumentTarget] = useState<DocumentSummary | null>(null);

  async function handleDeleteFolder() {
    if (!deleteFolderTarget) return;
    setDeletingFolder(true);
    try {
      const response = await fetch(`/api/editor/folders/${deleteFolderTarget.id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as
          | { error?: { message?: string } }
          | null;
        throw new Error(data?.error?.message ?? "폴더를 삭제하지 못했습니다.");
      }
      toast("폴더를 삭제했습니다.", "success");
      setDeleteFolderTarget(null);
      router.refresh();
    } catch (error) {
      toast(error instanceof Error ? error.message : "폴더를 삭제하지 못했습니다.", "danger");
    } finally {
      setDeletingFolder(false);
    }
  }

  // 폴더를 parentId 기준으로 묶어 트리 순회에 바로 쓸 수 있게 한다. 같은 부모 아래
  // 형제는 order로 정렬한다(폴더 배열 자체의 삽입 순서에 기대지 않는다).
  const childrenByParent = useMemo(() => {
    const map = new Map<string | null, FolderNode[]>();
    for (const folder of folders) {
      const siblings = map.get(folder.parentId) ?? [];
      siblings.push(folder);
      map.set(folder.parentId, siblings);
    }
    for (const siblings of map.values()) {
      siblings.sort((a, b) => a.order - b.order);
    }
    return map;
  }, [folders]);
  const topLevelFolders = childrenByParent.get(null) ?? [];

  // P7-6: MoveDocumentModal의 대상 폴더 <select>에 쓸 평평한 목록. 부모→자식 순서로
  // 깊이 우선 순회하면서, 깊이만큼 표(U+3000, 전각 공백)를 앞에 붙여 계층을 표시한다 —
  // 일반 ASCII 공백은 브라우저가 <option> 렌더링 시 접어버릴 수 있어 쓰지 않는다.
  const flatFolderOptions = useMemo(() => {
    const options: { id: string; label: string }[] = [];
    function walk(nodes: FolderNode[], depth: number) {
      for (const node of nodes) {
        options.push({ id: node.id, label: "　".repeat(depth) + node.name });
        walk(childrenByParent.get(node.id) ?? [], depth + 1);
      }
    }
    walk(childrenByParent.get(null) ?? [], 0);
    return options;
  }, [childrenByParent]);

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

  // P7-4: 필터링된 문서를 소속 폴더별로 묶는다(filteredDocuments 자체가 매 렌더 새로
  // 계산되는 값이라 memo 없이 그대로 따라간다). 폴더가 전혀 없는 계정(대부분의 현재
  // 사용자 — 폴더를 만드는 UI 자체가 아직 없다, P7-5)은 모든 문서의 folderId가 항상
  // null이라(P7-3에서 존재하는 폴더로만 배정 가능하도록 검증) unclassifiedDocuments가
  // filteredDocuments와 완전히 같아져, 기존 동작이 그대로 유지된다.
  const documentsByFolder = new Map<string, DocumentSummary[]>();
  for (const document of filteredDocuments) {
    if (document.folderId === null) continue;
    const siblings = documentsByFolder.get(document.folderId) ?? [];
    siblings.push(document);
    documentsByFolder.set(document.folderId, siblings);
  }
  const unclassifiedDocuments = filteredDocuments.filter((document) => document.folderId === null);

  // P7-8: 빈 폴더 안내는 검색어/태그 필터로 "지금 안 보일 뿐"인 폴더까지 "문서가 없다"고
  // 잘못 알리면 안 되므로, 필터링 전 원본 documents로 "이 폴더가 한 번이라도 문서를
  // 가진 적 있는지"를 따로 판단한다(documentsByFolder는 filteredDocuments 기준이라 이
  // 판단에는 쓸 수 없다).
  const folderIdsWithDocuments = new Set(
    documents
      .map((document) => document.folderId)
      .filter((folderId): folderId is string => folderId !== null)
  );

  // P1-1c: 필터링·정렬된 결과 중 처음 PAGE_SIZE개만 먼저 그린다. 검색어/태그/정렬이
  // 바뀌면 다시 PAGE_SIZE로 되돌린다 — 그렇지 않으면 필터를 바꿨을 때 이전 조건에서
  // 늘려둔 "더 보기" 상태가 새 조건에 엉뚱하게 이어진다. useEffect로 리셋하면 한 번
  // 더 오래된 개수로 그렸다가 다시 그리는 깜빡임이 생기므로, React 공식 문서가 권장하는
  // "렌더링 중 상태 조정" 패턴을 쓴다(https://react.dev/learn/you-might-not-need-an-effect
  // "Adjusting some state when a prop changes"). 폴더 안 문서는 페이지네이션하지 않는다
  // (P7-4 범위 밖 — task.md 참고) — 이 페이지네이션은 미분류 문서에만 적용된다.
  const filterKey = `${activeTag ?? ""} ${query} ${sortBy}`;
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [prevFilterKey, setPrevFilterKey] = useState(filterKey);
  if (filterKey !== prevFilterKey) {
    setPrevFilterKey(filterKey);
    setVisibleCount(PAGE_SIZE);
  }
  const visibleDocuments = unclassifiedDocuments.slice(0, visibleCount);
  const hasMore = unclassifiedDocuments.length > visibleDocuments.length;

  // P7-10: 방향키로 폴더 트리를 탐색하려면(WAI-ARIA tree/treeitem 패턴) 지금 화면에
  // 실제로 보이는 노드 순서를 알아야 한다 — 접힌 폴더 밑은 건너뛴다. 렌더링과 같은
  // 순서(자식 폴더 먼저, 그다음 그 폴더의 직속 문서)로 순회해 렌더 결과와 어긋나지
  // 않게 한다. "미분류" 문서 목록은 트리 바깥의 별도 목록이라 여기 포함하지 않는다.
  type TreeNode =
    | { type: "folder"; id: string; depth: number }
    | { type: "document"; id: string; depth: number; parentFolderId: string };

  function collectVisibleTreeNodes(nodes: FolderNode[], depth: number, acc: TreeNode[]): void {
    for (const node of nodes) {
      acc.push({ type: "folder", id: node.id, depth });
      const isExpanded = expandedFolders[node.id] ?? true;
      if (!isExpanded) continue;
      collectVisibleTreeNodes(childrenByParent.get(node.id) ?? [], depth + 1, acc);
      for (const doc of documentsByFolder.get(node.id) ?? []) {
        acc.push({ type: "document", id: doc.pageId, depth: depth + 1, parentFolderId: node.id });
      }
    }
  }
  const visibleTreeNodes: TreeNode[] = [];
  collectVisibleTreeNodes(topLevelFolders, 0, visibleTreeNodes);

  function treeNodeDomId(node: TreeNode): string {
    return node.type === "folder"
      ? `sidebar-folder-toggle-${node.id}`
      : `sidebar-document-link-${node.id}`;
  }

  function focusTreeNode(node: TreeNode | undefined) {
    if (!node) return;
    window.document.getElementById(treeNodeDomId(node))?.focus();
  }

  /**
   * WAI-ARIA 트리 뷰 패턴(방향키로 펼침/이동)을 폴더 토글 버튼·문서 링크에 공통으로
   * 붙인다. Tab 순서는 손대지 않는다 — 기존처럼 각 버튼/링크를 그대로 Tab으로도
   * 옮겨 다닐 수 있고, 방향키는 그 위에 얹는 추가 탐색 수단이다(P2-1b의 사이드바 폭
   * 조절 핸들처럼, 새 상호작용을 기존 포커스 이동 방식과 함께 두는 방식).
   */
  function handleTreeKeyDown(event: KeyboardEvent<HTMLElement>, node: TreeNode) {
    const index = visibleTreeNodes.findIndex((n) => n.type === node.type && n.id === node.id);
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        focusTreeNode(visibleTreeNodes[index + 1]);
        break;
      case "ArrowUp":
        event.preventDefault();
        focusTreeNode(visibleTreeNodes[index - 1]);
        break;
      case "Home":
        event.preventDefault();
        focusTreeNode(visibleTreeNodes[0]);
        break;
      case "End":
        event.preventDefault();
        focusTreeNode(visibleTreeNodes[visibleTreeNodes.length - 1]);
        break;
      case "ArrowRight": {
        if (node.type !== "folder") break; // 문서(리프)는 펼칠 자식이 없다.
        event.preventDefault();
        const isExpanded = expandedFolders[node.id] ?? true;
        if (!isExpanded) {
          toggleFolder(node.id);
        } else {
          const next = visibleTreeNodes[index + 1];
          if (next && next.depth > node.depth) focusTreeNode(next);
        }
        break;
      }
      case "ArrowLeft": {
        event.preventDefault();
        if (node.type === "folder") {
          const isExpanded = expandedFolders[node.id] ?? true;
          if (isExpanded) {
            toggleFolder(node.id);
            break;
          }
        }
        const parentId =
          node.type === "folder" ? (folders.find((f) => f.id === node.id)?.parentId ?? null) : node.parentFolderId;
        if (parentId !== null) {
          focusTreeNode({ type: "folder", id: parentId, depth: node.depth - 1 });
        }
        break;
      }
      default:
        break;
    }
  }

  function renderDocumentRow(document: DocumentSummary, depth: number, treeItem = false) {
    const isActive = document.pageId === currentPageId;
    // treeItem은 폴더 트리 안(renderFolderNode의 자식)에서만 true로 넘어오고, 그 경우
    // childDocuments는 항상 document.folderId로 그룹핑된 결과라 folderId가 null일 수 없다.
    const treeNode: TreeNode = {
      type: "document",
      id: document.pageId,
      depth,
      parentFolderId: document.folderId as string,
    };
    const row = (
      <Link
        id={`sidebar-document-link-${document.pageId}`}
        href={`/editor/${document.pageId}`}
        onClick={onNavigate}
        onNavigate={(event) => guardNavigate(event, `/editor/${document.pageId}`)}
        onKeyDown={treeItem ? (event) => handleTreeKeyDown(event, treeNode) : undefined}
        aria-current={isActive ? "page" : undefined}
        className={
          // P8-2: support.claude.com/ko 벤치마킹 실측값(design.md "4. 좌측 사이드바")
          // — 레퍼런스는 목록 항목 패딩이 `8px` 전방향, radius는 12px(이 프로젝트의
          // `--radius-card` 토큰과 같은 값)이다. 기존 `rounded-btn`(8px)·비대칭 패딩
          // (py-1.5/pr-3 = 6px/12px)을 이 값에 맞춘다 — 왼쪽 패딩은 폴더 트리 들여쓰기를
          // 감당하는 `<li>`의 inline style(`8 + depth * 14`)이 이미 depth 0에서 8px와
          // 일치해 따로 바꿀 필요가 없다.
          "block min-w-0 flex-1 rounded-card py-2 pr-2 transition-colors duration-default " +
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
        {document.tags.length > 0 && (
          <div className="mt-1 flex flex-wrap items-center gap-1.5 pl-[18px]">
            {document.tags.map((tag) => (
              <Tag key={tag}>{tag}</Tag>
            ))}
          </div>
        )}
      </Link>
    );
    // aria-selected는 treeitem의 필수 속성이다(jsx-a11y) — "지금 열려 있는 문서"를 이미
    // Link의 aria-current="page"로 표시하고 있어, 트리 안에서의 선택 상태도 같은 값을 쓴다.
    const treeItemAttrs = treeItem
      ? { role: "treeitem" as const, "aria-level": depth + 1, "aria-selected": isActive }
      : {};
    // P7-6: 옮길 수 있는 폴더가 하나도 없으면(계정에 폴더가 전혀 없음) "이동" 버튼
    // 자체를 숨긴다 — 눌러도 미분류(현재 상태)로만 되돌릴 수 있어 의미가 없다.
    if (flatFolderOptions.length === 0) {
      return (
        <li key={document.pageId} style={{ paddingLeft: 8 + depth * 14 }} {...treeItemAttrs}>
          {row}
        </li>
      );
    }
    return (
      <li
        key={document.pageId}
        className="group flex items-start gap-0.5 rounded-btn"
        style={{ paddingLeft: 8 + depth * 14 }}
        {...treeItemAttrs}
      >
        {row}
        <button
          type="button"
          aria-label="다른 폴더로 이동"
          title="이동"
          onClick={() => setMoveDocumentTarget(document)}
          // mt-2는 위 Link의 상단 패딩(py-2, P8-2)과 맞춰 첫 줄과 나란히 보이게 한다.
          className="mt-2 shrink-0 rounded-btn p-1 text-muted opacity-0 transition-opacity duration-default hover:bg-surface hover:text-foreground group-hover:opacity-100 group-focus-within:opacity-100"
        >
          <MoveToFolderIcon />
        </button>
      </li>
    );
  }

  /**
   * P7-4: 폴더 트리 재귀 렌더링. 폴더는 그 안 문서·하위 폴더의 필터 결과와 무관하게
   * 항상 보인다(task.md "범위 밖" — 검색으로 텅 빈 폴더를 숨기는 "스마트 필터링"은
   * 하지 않는다). 빈 폴더 전용 안내 문구는 P7-8이 맡는다 — 지금은 펼쳐도 그냥 빈 채로 둔다.
   */
  function renderFolderNode(folder: FolderNode, depth: number) {
    const isExpanded = expandedFolders[folder.id] ?? true;
    const childFolders = childrenByParent.get(folder.id) ?? [];
    const childDocuments = documentsByFolder.get(folder.id) ?? [];
    // P7-8: 하위 폴더도, (필터와 무관하게) 문서를 가진 적도 없는 진짜 빈 폴더에만 안내를
    // 보여준다 — 검색/태그 필터로 지금 안 보일 뿐인 폴더까지 "비어 있다"고 잘못 알리지
    // 않기 위해 filteredDocuments가 아니라 folderIdsWithDocuments(원본 기준)로 판단한다.
    const isReallyEmpty = childFolders.length === 0 && !folderIdsWithDocuments.has(folder.id);
    const treeNode: TreeNode = { type: "folder", id: folder.id, depth };
    return (
      <li
        key={folder.id}
        role="treeitem"
        aria-expanded={isExpanded}
        aria-level={depth + 1}
        // 폴더 자체는 "선택"되는 대상이 아니라 펼치고 접는 대상이라 항상 false다 —
        // jsx-a11y가 요구하는 필수 속성(treeitem은 aria-selected가 있어야 한다)이라
        // 값 없이 생략할 수는 없다.
        aria-selected={false}
      >
        {/*
          P7-5: 토글(펼침/접힘)과 액션 버튼(하위 폴더 추가·이름변경·삭제)은 서로 다른
          <button>이라 하나의 바깥 <div>로 나란히 둔다(버튼 중첩은 유효한 HTML이 아님).
          액션 버튼은 평소엔 숨겨져 있다가 행에 마우스를 올리거나(hover) 키보드로
          포커스가 들어오면(focus-within) 나타난다 — 항상 노출하면 폴더가 많을 때
          시각적으로 번잡해진다는 판단(사이드바 폭 조절 핸들의 "평소엔 거의 안 보이다가"
          패턴과 같은 원칙).
        */}
        <div
          id={`sidebar-folder-${folder.id}`}
          // P8-2: 문서 목록 행과 radius를 맞춘다(rounded-btn 8px → rounded-card 12px,
          // design.md "4. 좌측 사이드바" 벤치마킹 참고) — 같은 트리 안에서 폴더 행만
          // 다른 radius를 쓰면 어색하다.
          className={
            "group flex items-center gap-0.5 rounded-card pr-1 transition-colors duration-default hover:bg-surface-raised " +
            (highlightedFolderId === folder.id ? "bg-brand/10" : "")
          }
          style={{ paddingLeft: 8 + depth * 14 }}
        >
          <button
            type="button"
            id={`sidebar-folder-toggle-${folder.id}`}
            onClick={() => toggleFolder(folder.id)}
            onKeyDown={(event) => handleTreeKeyDown(event, treeNode)}
            aria-expanded={isExpanded}
            title={folder.name}
            // P8-2: 문서 행과 같은 높이가 되도록 py-1.5(6px) → py-2(8px)로 맞춘다.
            className="flex min-w-0 flex-1 items-center gap-1.5 py-2 text-left text-sm font-medium text-foreground"
          >
            <ChevronIcon expanded={isExpanded} />
            <FolderIcon />
            <span className="min-w-0 flex-1 truncate">{folder.name}</span>
          </button>
          <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity duration-default group-hover:opacity-100 group-focus-within:opacity-100">
            <button
              type="button"
              aria-label="하위 폴더 추가"
              title="하위 폴더 추가"
              onClick={() => setFolderFormState({ type: "create", parentId: folder.id })}
              className="rounded-btn p-1 text-muted transition-colors duration-default hover:bg-surface hover:text-foreground"
            >
              <PlusIcon />
            </button>
            <button
              type="button"
              aria-label="폴더 이름 변경"
              title="이름 변경"
              onClick={() =>
                setFolderFormState({ type: "rename", folderId: folder.id, currentName: folder.name })
              }
              className="rounded-btn p-1 text-muted transition-colors duration-default hover:bg-surface hover:text-foreground"
            >
              <PencilIcon />
            </button>
            <button
              type="button"
              aria-label="폴더 삭제"
              title="삭제"
              onClick={() => setDeleteFolderTarget(folder)}
              className="rounded-btn p-1 text-muted transition-colors duration-default hover:bg-surface hover:text-foreground"
            >
              <TrashIcon />
            </button>
          </div>
        </div>
        {isExpanded && (childFolders.length > 0 || childDocuments.length > 0) && (
          <ul className="flex flex-col gap-0.5" role="group">
            {childFolders.map((child) => renderFolderNode(child, depth + 1))}
            {childDocuments.map((document) => renderDocumentRow(document, depth + 1, true))}
          </ul>
        )}
        {isExpanded && isReallyEmpty && (
          <div style={{ paddingLeft: 8 + (depth + 1) * 14 }}>
            <EmptyState title="이 폴더에는 아직 문서가 없습니다." />
          </div>
        )}
      </li>
    );
  }

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
        {/*
          레퍼런스(support.claude.com/ko) 헤더의 검색 트리거 버튼(140×30px, radius:12px)을
          참고했다(design.md "벤치마킹" 절 "3. 헤더", P8-1). 이 프로젝트는 사이드바 폭이
          220~440px로 가변이라 고정 픽셀 크기를 그대로 옮기지 않고 내용물(아이콘+"검색")
          기준으로 자연스럽게 줄어들게 한다 — 단축키 힌트는 이미 목록 위(위 "Ctrl+K(Mac: ⌘K)"
          문구)에 있어 여기서 다시 pill로 반복하지 않는다. 새 검색 로직이 아니라 기존
          GlobalSearchModal(Ctrl+K)을 여는 트리거일 뿐이다.
        */}
        {onOpenSearch && (
          <button
            type="button"
            onClick={onOpenSearch}
            aria-label="전체 검색 (Ctrl+K)"
            title="전체 검색 (Ctrl+K)"
            className="flex shrink-0 items-center gap-1.5 rounded-btn bg-surface-subtle px-2.5 py-1.5 text-sm text-muted transition-colors duration-default hover:bg-surface-raised hover:text-foreground"
          >
            <SearchTriggerIcon />
            <span className="hidden sm:inline">검색</span>
          </button>
        )}
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
                    // P8-2: 문서 목록 행과 같은 이유로 8px 전방향 패딩·12px radius로 맞춘다.
                    className={
                      "block rounded-card py-2 pl-2 pr-2 transition-colors duration-default " +
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
        {/*
          P7-5: 폴더가 하나도 없는 계정도 이 버튼으로 첫 폴더를 만들 수 있어야 하므로
          (그 전까지는 폴더 기능 자체를 발견할 방법이 없었다), 문서 유무와 무관하게
          항상 보인다 — 아래 문서 목록/빈 상태 분기와 별개다.
        */}
        <div className="mb-2 flex items-center justify-between px-1">
          <p className="text-xs font-medium text-muted">폴더</p>
          <button
            type="button"
            aria-label="새 폴더 만들기"
            title="새 폴더 만들기"
            onClick={() => setFolderFormState({ type: "create", parentId: null })}
            className="rounded-btn p-1 text-muted transition-colors duration-default hover:bg-surface-raised hover:text-foreground"
          >
            <PlusIcon />
          </button>
        </div>
        {documents.length === 0 ? (
          <EmptyState title="아직 작성한 문서가 없습니다." />
        ) : filteredDocuments.length === 0 ? (
          <EmptyState title="조건에 맞는 문서가 없습니다." />
        ) : (
          // 예전엔 행 사이에 divide-y 구분선이 있었는데, "문서함을 좀 더 심플하게...
          // 구분 라인도 필요없어"라는 요청으로 뺐다(2026-08-26). 행 자체의 hover
          // 배경(아래 isActive 삼항)만으로도 행 구분은 충분하다.
          // P7-4: 폴더가 있는 계정만 트리 + "미분류" 레이블이 추가로 보인다 — 폴더가
          // 하나도 없으면(대부분의 현재 사용자) 이 블록 전체가 기존과 동일하게
          // 미분류 목록 하나만 그린다(topLevelFolders.length === 0이라 첫 두 블록이
          // 렌더링되지 않음).
          <>
            {topLevelFolders.length > 0 && (
              <ul className="mb-2 flex flex-col gap-0.5" role="tree" aria-label="폴더">
                {topLevelFolders.map((folder) => renderFolderNode(folder, 0))}
              </ul>
            )}
            {folders.length > 0 && unclassifiedDocuments.length > 0 && (
              <p className="px-2 pb-1 text-xs font-medium text-muted">미분류</p>
            )}
            {visibleDocuments.length > 0 && (
              <ul className="flex flex-col gap-0.5">
                {visibleDocuments.map((document) => renderDocumentRow(document, 0))}
              </ul>
            )}
          </>
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

      {folderFormState && (
        <FolderFormModal
          open={folderFormState !== null}
          onClose={() => setFolderFormState(null)}
          mode={folderFormState}
          onSaved={() => router.refresh()}
        />
      )}

      {moveDocumentTarget && (
        <MoveDocumentModal
          open={moveDocumentTarget !== null}
          onClose={() => setMoveDocumentTarget(null)}
          document={moveDocumentTarget}
          folderOptions={flatFolderOptions}
          onSaved={() => router.refresh()}
        />
      )}

      <Modal
        open={deleteFolderTarget !== null}
        onClose={() => setDeleteFolderTarget(null)}
        title="폴더 삭제"
        footer={
          <>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setDeleteFolderTarget(null)}
              disabled={deletingFolder}
            >
              취소
            </Button>
            <Button
              type="button"
              variant="danger"
              onClick={handleDeleteFolder}
              disabled={deletingFolder}
            >
              {deletingFolder ? "삭제 중..." : "삭제 확인"}
            </Button>
          </>
        }
      >
        &quot;{deleteFolderTarget?.name}&quot; 폴더를 삭제하시겠습니까? 안에 있던 하위
        폴더와 문서는 삭제되지 않고 상위 위치로 이동합니다.
      </Modal>
    </aside>
  );
}
