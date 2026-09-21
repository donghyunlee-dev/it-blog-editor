"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Modal, useToast } from "@sfood/ui";
import type { JSONContent } from "@tiptap/react";
import { RichTextEditor } from "./RichTextEditor";
import { TableOfContents } from "./TableOfContents";
import { TagInput } from "./TagInput";
import { PublishForm, type PublishFormInitial } from "./PublishForm";
import { ShareForm } from "./ShareForm";
import { useUnsavedChanges } from "./UnsavedChangesContext";
import {
  clearAutosaveSnapshot,
  readAutosaveSnapshot,
  writeAutosaveSnapshot,
  type AutosaveSnapshot,
} from "@/lib/editor/autosave-storage";
import type { SharingLastEditedBy } from "@/lib/editor/sharing";
import type { SharedAccount } from "@/lib/editor/documents";
import type { FolderNode } from "@/lib/editor/folders";
import { formatAccountLabel } from "@/lib/account-display";

/** Issue #1(P0-1b)에서 결정된 주기 — "1분마다 체크해서 저장한다". */
const AUTOSAVE_INTERVAL_MS = 60_000;

/**
 * P17-18(외부 UI 개선 제안 검토 후 채택 — 값은 사용자에게 직접 확인해 결정): 본문
 * 최대 폭을 기존 830px(P8-6, support.claude.com/ko 벤치마킹 실측값)에서 920px로
 * 확대한다. 그리고 표·코드블록처럼 넓어야 유리한 콘텐츠를 위해 "넓게 보기"를 켜면
 * 1200px까지 확장하는 Wide mode를 추가한다 — 이번엔 문서 전체 토글로만 만들고,
 * 블록(표/코드블록 등) 단위로 개별 확장하는 건 스키마 변경이 필요한 별도 후속
 * 작업으로 미룬다(Issue #161 결정 사항).
 */
const NORMAL_CONTENT_WIDTH = "max-w-[920px]";
const WIDE_CONTENT_WIDTH = "max-w-[1200px]";
const WIDE_MODE_STORAGE_KEY = "sfood-editor-wide-mode";

interface DocumentEditorProps {
  mode: "create" | "edit";
  pageId?: string;
  initialTitle?: string;
  initialDoc?: JSONContent;
  initialTags?: string[];
  initialVersion?: number;
  tagSuggestions?: string[];
  /** 게시 설정 오버레이의 초기값. mode="edit"일 때만 서버에서 내려준다. */
  initialPublishState?: PublishFormInitial;
  /** 문서 하단 풋터에 표시할 마지막 수정일(ISO). mode="edit"일 때만 서버에서 내려준다. */
  initialUpdatedAt?: string;
  /** 공유 기능(P6-7)의 마지막 수정자. 공유되거나 저장된 적 없으면 서버가 내려주지 않는다. */
  initialLastEditedBy?: SharingLastEditedBy;
  /** 로그인한 사람이 이 문서의 소유자인지(P6-2/P6-3) — "공유" 버튼은 소유자에게만 보인다. */
  isOwner?: boolean;
  /** 현재 공유된 대상 목록(P6-2/P6-3). mode="edit"일 때만 서버에서 내려준다. */
  initialSharedWith?: SharedAccount[];
  /**
   * 이 문서가 속한(또는, mode="create"에서 P15-1부터 이 문서가 만들어질) 폴더 경로(P7-7
   * 브레드크럼), 루트가 먼저 오는 순서. 폴더가 없으면 빈 배열/undefined다 — 그 경우
   * 헤더에 브레드크럼 자체를 렌더링하지 않는다.
   */
  folderPath?: FolderNode[];
  /**
   * P15-1: mode="create"에서 저장 시 이 폴더로 바로 배정한다(사이드바 폴더 행의 "+" →
   * `/editor/new?folder={id}`로 들어온 경우). mode="edit"에서는 쓰이지 않는다 — 폴더를
   * 옮기는 것은 사이드바의 "다른 폴더로 이동" 메뉴가 맡는다(P7-6).
   */
  initialFolderId?: string | null;
}

const EMPTY_DOC: JSONContent = {
  type: "doc",
  content: [{ type: "paragraph" }],
};

/**
 * ProseMirror의 doc 노드는 `block+`(블록 노드 1개 이상)을 요구하는데,
 * `getDocumentDetail`은 sourceDocument property가 없는 문서에 `{ type: "doc",
 * content: [] }`를 돌려준다. 그대로 넘기면 편집기가 스키마를 만족하지 않는 문서로
 * 초기화되므로 빈 문단 하나를 채워준다.
 */
function withAtLeastOneBlock(doc: JSONContent): JSONContent {
  return doc.content && doc.content.length > 0 ? doc : EMPTY_DOC;
}

/*
 * 헤더 버튼에 아이콘을 추가한다(2026-08-26, 사용자 피드백 — "버튼 스타일이 너무
 * 투박스러운데, 아이콘을 좀 넣거나"). `@sfood/ui`가 아이콘 세트를 제공하지 않아
 * (Button의 children으로 뭐든 넣을 수 있는 구조를 그대로 활용) 다른 파일들(예:
 * EditorSidebar.tsx의 DocumentIcon)과 같은 방식 — 획 기반의 작은 인라인 SVG를
 * 이 파일 안에 직접 둔다.
 */
/*
 * "게시 설정"은 지구본(GlobeIcon)이었는데 "언어/지역 설정"으로 읽히기 쉬웠고,
 * "저장"은 다운로드 화살표(SaveIcon)라 "다운로드"로 오해되기 쉬웠다(2026-08-26,
 * 사용자 피드백 — "의미가 안맞아"). 톱니바퀴(설정 전반에 가장 보편적으로 쓰이는
 * 기호)와 플로피 디스크(대부분의 오피스 도구에서 여전히 "저장"으로 통용되는 기호)로
 * 바꾼다.
 */
function SettingsIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="10" cy="10" r="3" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M10 2.5v2.2M10 15.3v2.2M17.5 10h-2.2M4.7 10h-2.2M15.6 4.4l-1.5 1.5M5.9 14.1l-1.5 1.5M15.6 15.6l-1.5-1.5M5.9 5.9L4.4 4.4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function SaveIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M4.5 3.5h8l3 3v9.5a1 1 0 0 1-1 1h-10a1 1 0 0 1-1-1v-11.5a1 1 0 0 1 1-1Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path d="M7 13.5h6v3.5H7v-3.5Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M7 3.5v3.5h5v-3.5" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  );
}

/** 흔히 쓰는 "공유" 아이콘(연결된 점 3개) — iOS/Android 공유 아이콘과 같은 형태라 낯익다. */
function ShareIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="15.5" cy="4.5" r="2" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="15.5" cy="15.5" r="2" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="4.5" cy="10" r="2" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M6.3 8.9l7.4-3.5M6.3 11.1l7.4 3.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * P17-18: "넓게 보기" 토글 아이콘 — 가운데 세로선(문서 경계) 양옆으로 바깥을 향하는
 * 화살표 두 개로 "좌우로 넓힌다"는 뜻을 나타낸다. 다른 헤더 아이콘과 같은 시각 스타일
 * (viewBox 0 0 20 20, stroke=currentColor, strokeWidth 1.5).
 */
function WideModeIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M10 3v14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path
        d="M6 7L3 10l3 3M14 7l3 3-3 3"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ArrowLeftIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M12 4l-6 6 6 6M6.5 10h11"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * 문서 제목 입력. `<input>`은 한 줄만 표시할 수 있어 긴 제목이 잘려 보이거나 가로
 * 스크롤이 필요했다(2026-08-26, 사용자 피드백). `<textarea rows={1}>`로 바꾸고
 * 내용이 늘어날 때마다(줄바꿈될 때마다) `scrollHeight`만큼 높이를 늘린다 — 흔히 쓰는
 * "auto-grow textarea" 패턴이다. Enter는 줄바꿈이 아니라 그냥 무시한다 — 제목은
 * 개념적으로 한 줄짜리 값이고(줄바꿈 문자가 들어가면 Confluence 페이지 제목으로
 * 그대로 저장될 때 문제가 된다), 길면 자동으로 다음 줄로 흘러넘치는 것과 사용자가
 * 직접 줄바꿈을 넣는 것은 다르다.
 */
function TitleTextarea({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

  return (
    <textarea
      ref={ref}
      aria-label="제목"
      placeholder="제목"
      rows={1}
      // 박스(Card)도 테두리도 없는 캔버스라, 포커스를 옮기기 전까지는 제목이 그냥
      // 고정된 텍스트처럼 보여 "여기 클릭하면 수정 가능"이라는 신호가 약했다
      // (2026-08-26, 사용자 요청 — "포커스가 되면 살짝 배경이 변경되면서... 수정이
      // 가능한지 판단이 되면 좋겠다"). px-2/-mx-2(패딩을 같은 크기의 음수 마진으로
      // 상쇄)로 평소 글자 위치는 그대로 두면서, 포커스 시에만 배경색이 살짝 넓게
      // 깔리게 한다 — 레이아웃이 움직이지 않는다.
      className="-mx-2 w-full resize-none overflow-hidden rounded-md border-none bg-transparent px-2 text-4xl font-bold leading-tight text-foreground outline-none transition-colors duration-default placeholder:text-muted focus:bg-surface-raised"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
        }
      }}
    />
  );
}

/**
 * 문서 마지막 수정일을 문서 하단 풋터에 `YYYY.MM.DD` 형식으로 보여준다(2026-08-26,
 * 사용자 요청 — "날짜 표시는 제거하고 페이지 열면서 하단에 풋터를 만들어서 날짜
 * 정보를 별도로 표시하자, 컨플루언스 문서 스타일로"). 예전에는 사이드바 목록 행에
 * 있었는데, 사이드바를 더 단순한 리스트로 바꾸면서 이쪽으로 옮겼다.
 */
function formatUpdatedAt(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}.${month}.${day}`;
}

/**
 * P17-15: 헤더 저장 상태 표시(아래 `SaveStatusIndicator` 참고)가 "✓ 저장됨 13:27"처럼
 * 방금 저장된 시각을 짧게 보여줄 때 쓴다. `formatUpdatedAt`(날짜, 세션을 넘나드는
 * "최종 수정" 풋터용)과 달리 같은 세션 안에서 방금 일어난 저장을 가리키므로 날짜 없이
 * 시:분만 24시간제로 보여준다.
 */
function formatSavedTime(date: Date): string {
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

/**
 * P17-15(외부 UI 개선 제안 검토 후 채택): 저장 버튼 하나만으로는 "지금 수정 중인지,
 * 저장이 필요한지, 방금 저장됐는지"를 알 수 없다는 지적 — 예전엔 이 상태가 풋터의
 * 조용한 텍스트(`mode === "edit" && initialUpdatedAt`일 때만, 자동 저장 성공/진행
 * 중에만)로만 있어 눈에 잘 안 띄고, 첫 저장 전(mode="create")이나 방금 만든 문서에는
 * 아예 표시가 없었다. 저장 버튼 바로 옆(헤더)으로 끌어올려 항상 같은 자리에서 셋 중
 * 하나로 보여준다 — 우선순위는 "저장 중" > "변경사항 있음" > "저장됨 HH:MM". 아직
 * 한 번도 저장한 적 없고 변경도 없는 새 문서(mode="create", 열자마자)는 셋 다 해당이
 * 없어 아무것도 표시하지 않는다.
 */
function SaveStatusIndicator({
  isSaving,
  isDirty,
  lastSavedAt,
}: {
  isSaving: boolean;
  isDirty: boolean;
  lastSavedAt: Date | null;
}) {
  const label = isSaving
    ? "저장 중..."
    : isDirty
      ? "변경사항 있음"
      : lastSavedAt
        ? `저장됨 ${formatSavedTime(lastSavedAt)}`
        : null;

  if (!label) {
    return null;
  }

  return (
    <span
      role="status"
      aria-live="polite"
      className={[
        "hidden shrink-0 items-center gap-1 text-xs sm:flex",
        isDirty && !isSaving ? "text-muted" : "text-success",
      ].join(" ")}
    >
      {!isDirty && !isSaving && (
        <svg width="12" height="12" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path d="M4 10.5l4 4 8-9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
      {label}
    </span>
  );
}

export function DocumentEditor({
  mode,
  pageId,
  initialTitle = "",
  initialDoc = EMPTY_DOC,
  initialTags = [],
  initialVersion,
  tagSuggestions = [],
  initialPublishState,
  initialUpdatedAt,
  initialLastEditedBy,
  isOwner = false,
  initialSharedWith = [],
  folderPath = [],
  initialFolderId = null,
}: DocumentEditorProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { isDirty, setDirty, guardNavigate } = useUnsavedChanges();
  const [title, setTitle] = useState(initialTitle);
  const [doc, setDoc] = useState<JSONContent>(withAtLeastOneBlock(initialDoc));
  const [tags, setTags] = useState<string[]>(initialTags);
  const [version, setVersion] = useState(initialVersion);
  const [lastEditedBy, setLastEditedBy] = useState(initialLastEditedBy);
  // P17-15: 페이지를 처음 열었을 때 이미 저장돼 있던 문서(mode="edit")는 그 최종
  // 수정 시각을 "저장됨" 상태의 초깃값으로 삼는다 — 새 문서(mode="create")는 아직
  // 저장한 적이 없으므로 null로 시작해 SaveStatusIndicator가 아무것도 표시하지 않는다.
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(
    mode === "edit" && initialUpdatedAt ? new Date(initialUpdatedAt) : null
  );
  // P17-18: 문서 내용이 아니라 "이 브라우저를 쓰는 사람의 보기 취향"이라 서버에 저장하지
  // 않는다 — 사이드바 폭·접힘(EditorShell.tsx)과 같은 이유로 localStorage에 둔다.
  // 서버에는 이 값이 없어 항상 false(기본 폭)로 가정해야 하고, 마운트 직후 실제 값으로
  // 동기화해야 한다(EditorShell.tsx의 같은 패턴 참고) — 그래서 초깃값은 항상 false다.
  const [wideMode, setWideMode] = useState(false);
  // P14-2: "삭제"·"이력"은 사이드바 문서 옵션(⋯) 메뉴로 옮겨가서 status는 더 이상
  // "deleting"을 가질 필요가 없다 — 저장 중 여부만 추적한다.
  const [status, setStatus] = useState<"idle" | "saving">("idle");
  const [publishModalOpen, setPublishModalOpen] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [recoverableSnapshot, setRecoverableSnapshot] =
    useState<AutosaveSnapshot | null>(null);
  // P8-5: 우측 목차(TableOfContents)가 이 컨테이너 안의 실제 렌더링된 h2/h3 DOM을
  // 직접 훑는다 — RichTextEditor.tsx를 감싸는 경계를 그대로 ref로 넘긴다.
  const richTextContainerRef = useRef<HTMLDivElement>(null);

  /**
   * 1분 주기 타이머(아래)는 매 키 입력마다 다시 만들어지면 안 된다("1분마다 체크"는
   * 고정 주기지 "마지막 입력 후 1분"이 아니다, P0-1b). 타이머는 mode/pageId가 바뀔
   * 때만 다시 등록하고, 실제로 저장할 "지금 값"은 이 ref들로 읽는다.
   */
  const titleRef = useRef(title);
  const docRef = useRef(doc);
  const tagsRef = useRef(tags);
  const versionRef = useRef(version);
  const isDirtyRef = useRef(isDirty);
  const statusRef = useRef(status);
  useEffect(() => {
    titleRef.current = title;
    docRef.current = doc;
    tagsRef.current = tags;
    versionRef.current = version;
    isDirtyRef.current = isDirty;
    statusRef.current = status;
  });

  // P17-18: EditorShell.tsx의 사이드바 폭·접힘 저장과 같은 패턴 — try/catch로 감싸
  // 프라이빗 브라우징 등 저장이 막힌 환경에서도 기능 자체(토글)는 동작하게 한다.
  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setWideMode(window.localStorage.getItem(WIDE_MODE_STORAGE_KEY) === "true");
    } catch {
      // 무시 — 기본값(좁게, false) 그대로 쓴다.
    }
  }, []);

  function toggleWideMode() {
    setWideMode((current) => {
      const next = !current;
      try {
        window.localStorage.setItem(WIDE_MODE_STORAGE_KEY, String(next));
      } catch {
        // 무시.
      }
      return next;
    });
  }

  /** 제목·본문·태그 중 하나라도 바뀌면 "저장하지 않은 변경사항 있음"으로 표시한다
   * (P0-1a — EditorShell의 UnsavedChangesProvider가 이 값을 보고 탭 닫기/앱 내부 이동을
   * 막는다). */
  function handleTitleChange(value: string) {
    setTitle(value);
    setDirty(true);
  }
  function handleDocChange(value: JSONContent) {
    setDoc(value);
    setDirty(true);
  }
  function handleTagsChange(value: string[]) {
    setTags(value);
    setDirty(true);
  }

  /** 응답 본문에서 공통 에러 형식의 메시지를 꺼낸다(비-JSON 응답이면 기본 문구). */
  async function errorMessageOf(response: Response, fallback: string) {
    const data = (await response.json().catch(() => null)) as {
      error?: { message?: string };
    } | null;
    return data?.error?.message ?? fallback;
  }

  /**
   * 태그는 문서 저장 API가 아니라 전용 엔드포인트로 저장한다. 문서 본문 저장이 이미
   * 성공한 뒤에 호출되므로, 실패를 예외로 올려 "저장 실패"로 보이게 하면 사실과 다르다.
   * 그래서 실패 사유를 문자열로 돌려주고 호출부가 경고 토스트로 구분해 알린다.
   *
   * `retryOnNotFound`는 새 문서를 만든 직후에만 켠다(2026-09-02, 실사용 확인) — 문서
   * 생성 응답(`POST /api/editor/documents`)이 이미 확인된 뒤 그 pageId로 곧바로 태그를
   * 저장하는데도 `PUT .../tags`가 404를 던지는 사례를 서버 로그로 확인했다. 원인을
   * 추적해보니 `getTags`가 쓰는 Confluence 라벨 조회(`listLabels`)가, 방금 만든 페이지의
   * 속성(`authorMeta`)은 이미 읽을 수 있는데도(같은 요청의 `requireDocumentOwner`는
   * 통과함) 그보다 늦게 반영되는 것으로 보인다 — Confluence의 라벨 하위 시스템이 방금
   * 생성된 페이지를 아직 인식하지 못한 것과 일치하는 증상이다. 기존 문서를 수정할 때는
   * 이런 "막 생성된 페이지" 지연이 있을 이유가 없어 재시도를 켜지 않는다 — 그때의 404는
   * 진짜로 문서가 삭제된 경우일 수 있어(`getTags`의 기존 주석 참고), 불필요하게 재시도로
   * 늦게 알리고 싶지 않다.
   */
  async function saveTags(
    currentPageId: string,
    options?: { retryOnNotFound?: boolean }
  ): Promise<string | null> {
    const maxAttempts = options?.retryOnNotFound ? 3 : 1;
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        const response = await fetch(
          `/api/editor/documents/${currentPageId}/tags`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ tags }),
          }
        );
        if (response.ok) {
          return null;
        }
        if (response.status === 404 && attempt < maxAttempts) {
          await new Promise((resolve) => setTimeout(resolve, 600 * attempt));
          continue;
        }
        return await errorMessageOf(response, "태그 저장에 실패했습니다.");
      } catch (err) {
        if (attempt < maxAttempts) {
          await new Promise((resolve) => setTimeout(resolve, 600 * attempt));
          continue;
        }
        return err instanceof Error ? err.message : "태그 저장에 실패했습니다.";
      }
    }
    return "태그 저장에 실패했습니다.";
  }

  /**
   * 문서를 열었을 때(마운트 시 1회) 이 문서의 임시 저장본이 남아있는지 확인한다
   * (P0-1b). `savedAt`이 서버에서 방금 불러온 문서의 최종 수정 시각(`initialUpdatedAt`)
   * 보다 최신이면 "서버가 아직 반영하지 못한 편집"이라는 뜻이라 복구를 묻는다. 그보다
   * 오래됐거나 같으면 이미 반영된(또는 애초에 무의미한) 오래된 흔적이므로 조용히 지운다.
   */
  useEffect(() => {
    if (mode !== "edit" || !pageId) {
      return;
    }
    const snapshot = readAutosaveSnapshot(pageId);
    if (!snapshot) {
      return;
    }
    const isNewerThanServer =
      !initialUpdatedAt ||
      new Date(snapshot.savedAt).getTime() > new Date(initialUpdatedAt).getTime();
    if (isNewerThanServer) {
      // localStorage는 서버 렌더링 시점에 읽을 수 없어 마운트 이후에만 확인할 수
      // 있다 — recoverableSnapshot의 초기값(null)은 서버·클라이언트 첫 렌더에서
      // 항상 같으므로(Modal이 처음엔 항상 닫혀 있음) hydration mismatch가 없는
      // 의도된 2-pass 패턴이다(ThemeToggle.tsx/EditorShell.tsx와 동일).
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRecoverableSnapshot(snapshot);
    } else {
      clearAutosaveSnapshot(pageId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, pageId]);

  function recoverFromSnapshot() {
    if (!recoverableSnapshot || !pageId) {
      return;
    }
    setTitle(recoverableSnapshot.title);
    setDoc(withAtLeastOneBlock(recoverableSnapshot.doc));
    setTags(recoverableSnapshot.tags);
    setDirty(true);
    clearAutosaveSnapshot(pageId);
    setRecoverableSnapshot(null);
  }

  function discardSnapshot() {
    if (pageId) {
      clearAutosaveSnapshot(pageId);
    }
    setRecoverableSnapshot(null);
  }

  /**
   * 1분마다 호출된다(등록 자체는 아래 useEffect, mode/pageId가 바뀔 때만 다시 만든다).
   * 변경사항이 없거나(조건 1) 이미 저장·삭제가 진행 중이면 건너뛴다. 저장을 시도하기
   * 전에 먼저 localStorage에 임시 저장해(조건 3) Confluence 저장이 실패해도 복구할 수
   * 있게 해둔다. 태그는 자동 저장 대상이 아니다(task.md "범위 밖" 참고).
   */
  async function performAutosave() {
    if (!pageId || !isDirtyRef.current || statusRef.current !== "idle") {
      return;
    }

    const snapshotTitle = titleRef.current;
    const snapshotDoc = docRef.current;
    const snapshotTags = tagsRef.current;
    writeAutosaveSnapshot(pageId, {
      title: snapshotTitle,
      doc: snapshotDoc,
      tags: snapshotTags,
    });

    try {
      const response = await fetch(`/api/editor/documents/${pageId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: snapshotTitle,
          doc: snapshotDoc,
          version: versionRef.current,
        }),
      });
      if (!response.ok) {
        throw new Error(await errorMessageOf(response, "자동 저장에 실패했습니다."));
      }
      const data = await response.json();
      setVersion(data.version);
      setLastEditedBy(data.lastEditedBy);
      setDirty(false);
      setLastSavedAt(new Date());
      clearAutosaveSnapshot(pageId);
      // 헤더의 저장 상태 표시(P17-15, SaveStatusIndicator)만으로는 이미 다른 곳을 보고
      // 있으면 놓치기 쉽다는 실사용 피드백(2026-08-27)으로, 매 분 뜨더라도 눈에 띄는
      // 토스트를 함께 띄운다 — 실패 시에는 이미 토스트를 쓰고 있어(아래 catch) 성공
      // 쪽만 없었다.
      toast("자동 저장됨", "success");
    } catch (err) {
      toast(
        `자동 저장에 실패했습니다(로컬에는 임시 저장되었습니다): ${
          err instanceof Error ? err.message : "알 수 없는 오류"
        }`,
        "warning"
      );
    }
  }

  useEffect(() => {
    if (mode !== "edit" || !pageId) {
      return;
    }
    const intervalId = window.setInterval(() => {
      void performAutosave();
    }, AUTOSAVE_INTERVAL_MS);
    return () => window.clearInterval(intervalId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, pageId]);

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    setStatus("saving");

    try {
      let currentPageId = pageId;

      if (mode === "create") {
        const response = await fetch("/api/editor/documents", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, doc, folderId: initialFolderId }),
        });
        if (!response.ok) {
          throw new Error(await errorMessageOf(response, "저장에 실패했습니다."));
        }
        const data = await response.json();
        currentPageId = data.pageId;
      } else {
        const response = await fetch(`/api/editor/documents/${pageId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, doc, version }),
        });
        if (!response.ok) {
          // 버전 충돌(409)이면 서버가 최신 버전 번호를 담은 안내 문구를 보내므로
          // 그대로 토스트에 띄운다.
          throw new Error(await errorMessageOf(response, "저장에 실패했습니다."));
        }
        const data = await response.json();
        setVersion(data.version);
        setLastEditedBy(data.lastEditedBy);
      }

      // 문서 본문 저장이 성공한 시점부터 다시 "저장하지 않은 변경사항 없음"으로
      // 취급한다(P0-1a). 태그 저장이 뒤이어 실패해도(아래 경고 토스트) 본문 자체는
      // 이미 저장됐으므로 이탈 경고를 계속 띄우는 건 사실과 다르다.
      setDirty(false);
      setLastSavedAt(new Date());

      // 새 문서도 생성 응답으로 받은 pageId로 곧바로 태그를 저장한다. 그렇지 않으면
      // 첫 저장에서 입력한 태그가 조용히 사라진다.
      const tagError = currentPageId
        ? await saveTags(currentPageId, { retryOnNotFound: mode === "create" })
        : null;
      if (tagError) {
        toast(`문서는 저장했지만 태그 저장에 실패했습니다: ${tagError}`, "warning");
      } else {
        toast("저장되었습니다.", "success");
      }

      if (mode === "create") {
        // layout.tsx(사이드바)는 클라이언트 네비게이션에서 다시 실행되지 않으므로,
        // 새 문서가 목록에 즉시 나타나도록 명시적으로 새로고침한다. refresh()를 push()보다
        // 먼저 부르면 라우터 캐시 무효화가 곧바로 이어지는 push의 네비게이션에 의해
        // 취소되어, 저장 직후 사이드바에 새 문서가 바로 안 보이는 경우가 있었다
        // (2026-08-26 실사용 확인) — push를 먼저 완료시키고 그 다음에 refresh한다.
        if (currentPageId) {
          router.push(`/editor/${currentPageId}`);
        }
        router.refresh();
        return;
      }

      // 제목이 바뀌었을 수 있으므로 사이드바 목록도 새로고침한다(페이지 이동은 없음).
      router.refresh();
    } catch (err) {
      toast(
        err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.",
        "danger"
      );
    } finally {
      setStatus("idle");
    }
  }

  return (
    /*
      박스(Card)로 감싸지 않고 페이지 전체가 에디터 캔버스처럼 보이도록 구성한다(2026-08-25,
      사용자 피드백). "탐색기로"·삭제·게시 설정·저장 등 필요한 기능은 전부 상단 헤더 한 곳에
      모으고, 그 아래는 제목·태그·본문만 이어지는 순수 캔버스다. 헤더는 `sticky top-0`으로
      부모(EditorShell의 `overflow-y-auto` 영역)를 기준으로 스크롤해도 계속 보인다 — 문서가
      길어져도 "저장" 버튼을 찾으러 스크롤할 필요가 없어, 저해상도 노트북처럼 화면이 낮은
      환경에서도 안정적으로 쓸 수 있다.
      글자 크기는 2단계로 나눈다: 헤더 링크·버튼·태그·안내 문구 등 UI 크롬은 `text-sm`으로
      압축해 저해상도 노트북에서도 세로 공간을 아낀다. 제목·본문은 반대로 사내 문서 뷰어
      (SF-Note) 캡쳐와 실측 비교해(2026-08-26) 표준 크기로 되돌렸다 — 제목 `text-4xl`(36px)은
      본문 리치 텍스트의 `prose` 기본 H1 크기(36px, RichTextEditor.tsx 참고)와 맞춰, 나중에
      사용자가 본문에 제목1을 직접 넣어도 문서 제목보다 커지지 않도록 위계를 유지한다.
    */
    <form onSubmit={handleSave}>
      {/* 시각적으로는 보이지 않지만, 이 화면의 h1을 대신한다 — 카드/페이지 제목을 없앤 뒤로
          문서 제목 편집 입력창(<input>, 헤딩 요소 아님)이 화면에서 유일한 "제목처럼 보이는"
          텍스트라 스크린리더 사용자에게는 페이지 목적을 알려줄 실제 헤딩이 없어진다. */}
      <h1 className="sr-only">{mode === "create" ? "새 문서 작성" : "문서 편집"}</h1>
      {/*
        h-14(56px) — 사이드바 상단 브랜딩 행(EditorSidebar.tsx)과 같은 고정 높이를
        준다. 둘 다 py-3 + 내용물 높이로 계산에 맡겼을 때는 이론상 맞아야 할 높이가
        실제로는 어긋나 보였다(2026-08-26, 사용자 피드백 — "패널과 헤더 라인 높이가
        안맞아서"). 고정 높이로 못박아 항상 정확히 맞춘다.
      */}
      <header className="sticky top-0 z-10 flex h-14 items-center justify-between gap-4 border-b border-border bg-background px-6">
        <div className="flex min-w-0 flex-1 items-center gap-1">
          {/*
            "문서함"이라는 글자가 화면 어디에도 없는데(사이드바에는 그런 제목이 없다)
            링크에서만 "문서함"을 언급해 뭘 가리키는지 알기 어려웠다(2026-08-26, 사용자
            피드백). 화살표 아이콘만 남기고 텍스트는 뺐다 — 문서 목록으로 돌아간다는
            의미는 aria-label/title로 스크린리더·툴팁에 남긴다.
          */}
          <Link
            href="/editor"
            // 저장하지 않은 변경사항이 있으면 즉시 이동하지 않고 확인 Modal을 띄운다
            // (P0-1a, EditorShell의 UnsavedChangesProvider). onNavigate는 next/link의
            // 내장 prop(v15.3.0+)으로, SPA 네비게이션에서만 호출된다.
            onNavigate={(event) => guardNavigate(event, "/editor")}
            aria-label="문서함으로 돌아가기"
            title="문서함으로 돌아가기"
            className="shrink-0 rounded-btn p-1.5 text-foreground transition-colors duration-default hover:bg-surface-raised"
          >
            <ArrowLeftIcon />
          </Link>

          {/*
            P7-7: 문서가 폴더에 속해 있으면(document.folderId, page.tsx가 조회) 헤더에
            그 경로를 보여준다 — "지금 이 문서가 어디 있는지" 항상 알 수 있게 하는 것이
            수용 기준이다. 폴더가 없는 문서(대부분)는 folderPath가 빈 배열이라 이 블록
            자체가 렌더링되지 않아 기존 헤더와 완전히 같다. 각 폴더를 누르면
            `/editor?folder={id}`로 이동한다 — 사이드바(EditorSidebar.tsx)가 이 쿼리를
            읽어 그 폴더까지 펼치고 스크롤·강조한다(전용 폴더 상세 화면은 없다, P7-4의
            사이드바 트리 하나로 탐색을 통일하는 기존 설계와 같은 이유).

            P8-3: support.claude.com/ko 벤치마킹(design.md "5. 본문 콘텐츠 상단")의 시각
            스펙 중 항목 간 gap:8px만 반영한다(gap-1→gap-2, 구분자 포함 모든 항목이
            균등하게 8px씩 벌어지도록 바깥 nav와 각 span 안쪽 모두 적용). 나머지 값은
            이 프로젝트의 더 상위 규칙과 충돌해 적용하지 않았다 — 폰트 13px는 design.md
            "2. 사이즈" 표가 "헤더 버튼/링크"를 text-sm(14px)로 이미 고정해 둔 규칙과
            충돌하고, 색 #595959는 CLAUDE.md의 토큰 우선 원칙에 따라 기존 text-muted를
            유지하며, margin-bottom:16px는 이 브레드크럼이 고정 높이(h-14) 헤더 바 안에
            있어 그대로 주면 헤더 높이가 깨진다(자세한 근거는 task.md 참고).
          */}
          {folderPath.length > 0 && (
            <nav
              aria-label="문서 위치"
              className="flex min-w-0 items-center gap-2 overflow-hidden text-sm text-muted"
            >
              {folderPath.map((folder, index) => (
                <span key={folder.id} className="flex min-w-0 items-center gap-2">
                  {index > 0 && <span aria-hidden="true">/</span>}
                  <Link
                    href={`/editor?folder=${folder.id}`}
                    onNavigate={(event) => guardNavigate(event, `/editor?folder=${folder.id}`)}
                    title={folder.name}
                    className="truncate rounded-btn px-1 py-0.5 transition-colors duration-default hover:bg-surface-raised hover:text-foreground"
                  >
                    {folder.name}
                  </Link>
                </span>
              ))}
            </nav>
          )}
        </div>

        {/*
          예전엔 버튼마다 글자가 있었는데, "아이콘만 봐도 알 수 있다"는 피드백으로
          아이콘만 남겼다(2026-08-26). 이력·삭제는 2026-09-14(P14-2)에 헤더에서 빠졌다 —
          Notion·Confluence 등과 비교한 뒤, 사이드바 문서 행의 옵션(⋯) 메뉴로 옮겨
          "기능이 늘어나도 헤더에 아이콘을 추가하지 않는" 방향으로 정리했다(기능 자체는
          `EditorSidebar.tsx`에 그대로 남아 있다).
        */}
        <div className="flex items-center gap-2">
          {/* P17-18: 저장 여부·소유권과 무관한 "보기 취향"이라 mode/pageId 조건 없이
              항상 보인다(새 문서를 작성하는 동안에도 표나 코드블록은 넓게 보고 싶을 수
              있다). */}
          <Button
            type="button"
            variant="secondary"
            size="md"
            className="!px-2.5"
            aria-label={wideMode ? "좁게 보기" : "넓게 보기"}
            title={wideMode ? "좁게 보기" : "넓게 보기"}
            aria-pressed={wideMode}
            onClick={toggleWideMode}
          >
            <WideModeIcon />
          </Button>
          {mode === "edit" && pageId && (
            <Button
              type="button"
              variant="secondary"
              size="md"
              // Button의 md 크기는 px-4(16px)로 아이콘+텍스트 조합용 좌우 여백이다.
              // 아이콘만 남긴 뒤로는 옆으로 지나치게 넓적해 보여, 좌우만 좁힌다
              // (2026-08-26, 사용자 피드백 — "아이콘 width 폭도 좀 줄여줘"). Button의
              // className은 클래스 문자열 뒤에 이어붙긴 하지만 Tailwind 유틸리티는
              // 생성 순서로 우선순위가 갈리므로, 뒤에 놓는 것만으로는 px-4를 확실히
              // 못 이긴다 — `!` 접두사(important)로 확실히 이기게 한다.
              className="!px-2.5"
              aria-label="게시 설정"
              title="게시 설정"
              onClick={() => setPublishModalOpen(true)}
              disabled={status !== "idle"}
            >
              <SettingsIcon />
            </Button>
          )}
          {/* "공유" 버튼은 소유자에게만 보인다(재공유 방지, P6-2/P6-3) — 공유받은
              사람이 이 문서를 열어도 이 버튼 자체가 없어 재공유를 시도할 방법이 없다. */}
          {mode === "edit" && pageId && isOwner && (
            <Button
              type="button"
              variant="secondary"
              size="md"
              className="!px-2.5"
              aria-label="공유"
              title="공유"
              onClick={() => setShareModalOpen(true)}
              disabled={status !== "idle"}
            >
              <ShareIcon />
            </Button>
          )}
          {/* P17-15: 저장 버튼 바로 옆의 상태 표시 — 위 `SaveStatusIndicator` 주석 참고.
              좁은 화면(모바일 오프캔버스 드로어)에서는 아이콘 버튼들도 이미 빠듯해
              `sm:flex`(컴포넌트 내부)로 숨긴다 — 저장 자체는 버튼 아이콘만으로도
              여전히 가능하다. */}
          <SaveStatusIndicator isSaving={status === "saving"} isDirty={isDirty} lastSavedAt={lastSavedAt} />
          {/*
            size="sm"(약 28px 높이)는 모바일 터치 타겟으로 여유가 없다(2026-08-26 UI 진단).
            EditorShell이 375px 폭 모바일 오프캔버스 드로어까지 지원하는데 헤더 액션만
            데스크톱 전용 크기로 고정돼 있던 문제라 size="md"(약 36px)로 통일한다.
          */}
          <Button
            type="submit"
            variant="primary"
            size="md"
            className="!px-2.5"
            aria-label={status === "saving" ? "저장 중" : "저장"}
            title={status === "saving" ? "저장 중" : "저장"}
            disabled={status !== "idle"}
          >
            <SaveIcon />
          </Button>
        </div>
      </header>

      {/*
        예전엔 제목·본문·풋터 사이가 전부 gap-4(16px)로 균일해서 이 셋이 서로 어떤
        관계인지(어디까지가 "문서 헤더"이고 어디부터 "쓰는 영역"인지) 시각적 위계가 안
        느껴졌다(2026-08-26, 사용자 피드백 — "간격이 균일해서 위계가 안 느껴짐"). 제목→
        본문은 넓게(여기부터 진짜 쓰는 영역이라는 전환), 본문→태그·풋터는 그보다 좁게
        차등을 준다.

        태그 입력은 2026-09-14(P12-2)부터 제목 아래가 아니라 본문 다음(풋터 바로 위)에
        온다 — 태그의 역할이 "검색용 가벼운 키워드"로 좁혀지면서(P12) 상단 "문서 메타"
        묶음만큼의 비중을 둘 이유가 없어졌고, 라벨+입력 2줄 구성이 상단 공간을 많이
        차지한다는 지적(사용자 피드백)에도 대응한다. 새 문서 작성(`mode === "create"`)도
        태그를 붙일 수 있어야 하므로, 풋터(`mode === "edit"` 전용)와 달리 모드와 무관하게
        항상 렌더링한다.
      */}
      {/*
        P8-8: 우측 목차(TOC)는 더 이상 이 줄에 없다 — EditorShell의 우측 레일 슬롯으로
        옮겼다(TableOfContents.tsx, EditorShell.tsx의 TocRailContext 주석 참고). 예전엔
        여기서 본문+TOC를 `justify-center gap-12`로 한 묶음처럼 가운데 정렬했는데, TOC가
        스크롤 영역 밖 독립된 컬럼이 되면서 본문 하나만 가운데 정렬하면 된다.
      */}
      {/*
        P8-6 후속(2026-09-14): `px-6`(좌우 24px)을 본문 폭 상한과 같은 엘리먼트에 두면
        Tailwind 기본 box-sizing(border-box)상 그 패딩이 안에서 깎여나가, 실제 읽기
        영역이 레퍼런스(순수 텍스트 폭)보다 좁아진다("문서 컨텐츠의 WIDTH가 참고
        사이트와 달라 — 830px로 읽은 거 같은데, 우리 컨텐츠는 여백 포함해서 830"이라는
        지적으로 발견). 이 바깥 줄로 `px-6`을 옮기면 폭 상한은 본문 자신만의 순수
        폭이 되고, `px-6`은 그 박스 전체를 감싸는 여유 공간(좁은 화면에서만 실제로
        줄어드는 가장자리 여백)이 된다.

        P17-18: 폭 상한 자체는 830px(P8-6 벤치마킹 값)에서 920px로 올렸다 — 외부
        리뷰가 "본문을 무조건 넓히지는 말라"고 짚었듯, 일반 문장이 많은 Wiki 문서는
        한 줄이 너무 길어지면 오히려 읽기 힘들어진다는 우려에 동의해 급격히 늘리지
        않았다. 표·코드블록처럼 넓어야 유리한 콘텐츠를 위한 1200px "넓게 보기"는
        위 헤더의 토글(`wideMode`)로만 켤 수 있다 — 기본값은 여전히 920px다.
      */}
      <div className="flex justify-center px-6">
        <div className={`flex w-full flex-col py-10 ${wideMode ? WIDE_CONTENT_WIDTH : NORMAL_CONTENT_WIDTH}`}>
          {/* 제목은 TipTap 문서 안의 노드가 아니라 별도의 가벼운 입력이다. 저장 시
              sourceDocument property에 본문과 함께 저장된다(P0-7 — Confluence page의
              실제 title은 내부 고유키일 뿐이라 이 값을 그대로 쓰지 않는다).
              <input>은 원래 한 줄이라 제목이 길면 안 잘리고 가로 스크롤이 생겼다
              (2026-08-26, 사용자 피드백 — "긴 경우 wordwrap 해서 내려서 보이게").
              <input>은 애초에 여러 줄을 표시할 수 없는 요소라 <textarea>로 바꾸고,
              useAutoGrowHeight로 줄바꿈될 때마다 높이를 늘린다. Enter는 줄바꿈이
              아니라 "제목 입력 끝"으로 취급해 막는다(제목은 개념적으로 한 줄이다). */}
          <TitleTextarea value={title} onChange={handleTitleChange} />

          {/*
            예전엔 새 문서를 열면 곧바로 "문서를 저장한 뒤에 이미지를 끌어다 놓거나
            붙여넣을 수 있습니다"라는 안내문이 떴는데, 화면 어디에도 이미지 관련 UI가
            없는 상태에서 맥락 없이 떠서 무슨 기능을 말하는 건지 알기 어려웠다
            (2026-08-26, 사용자 피드백 — "이게 무슨 기능 설명인지 이해가 안된다").
            같은 안내는 이제 실제로 이미지를 붙여넣거나 끌어다 놓으려는 "그 순간"에
            토스트로 뜬다(RichTextEditor.tsx의 handleDrop/handlePaste) — 필요한
            시점에 필요한 사람에게만 보이므로, 미리 띄워두던 이 문구는 그냥 뺀다.
          */}
          <div className="mt-6" ref={richTextContainerRef}>
            <RichTextEditor content={doc} onChange={handleDocChange} pageId={pageId} />
          </div>

          <div className="mt-4">
            <TagInput value={tags} onChange={handleTagsChange} suggestions={tagSuggestions} />
          </div>

          {/*
            예전엔 사이드바 목록 행에 수정일이 있었는데, 사이드바를 더 단순한 리스트로
            바꾸면서(2026-08-26, "문서함을 좀 더 심플하게") 날짜 정보를 문서를 열었을 때
            보이는 하단 풋터로 옮겼다 — 컨플루언스 등 문서 도구들이 흔히 쓰는, 구분선 +
            옅은 글자의 메타 정보 풋터 형태를 따른다.
          */}
          {/* P17-15: 실시간 저장 상태("저장 중"/"변경사항 있음"/"저장됨 HH:MM")는 헤더의
              `SaveStatusIndicator`로 옮겨갔다 — 이 풋터는 세션을 넘나드는 이력 정보
              (최종 수정 날짜·수정자)만 남긴다. */}
          {mode === "edit" && initialUpdatedAt && (
            <footer className="mt-4 flex items-center border-t border-border pt-4 text-xs text-muted">
              <span>
                최종 수정: {formatUpdatedAt(initialUpdatedAt)}
                {/* P6-7: 생성 직후(아직 한 번도 수정 저장을 거치지 않은 문서) 또는 이 기능
                    이전에 마지막으로 저장된 문서는 lastEditedBy가 없어 표시되지 않는다 —
                    updateDocument(수정 저장)만 이 값을 채우고, createDocument(최초 생성)는
                    채우지 않는다. */}
                {lastEditedBy && (
                  <> · 마지막 수정자: {formatAccountLabel(lastEditedBy.email, lastEditedBy.name)}</>
                )}
              </span>
            </footer>
          )}
        </div>
      </div>
      {/* 화면에는 아무것도 그리지 않는다(항상 null 반환) — EditorShell 우측 레일로
          자신을 밀어 넣는 역할만 한다(TableOfContents.tsx 상단 주석 참고). */}
      <TableOfContents containerRef={richTextContainerRef} doc={doc} />

      {/*
        P0-1b — 이 문서를 마지막으로 불러온 뒤(initialUpdatedAt 기준) 자동 저장이
        Confluence에는 반영하지 못했지만 이 브라우저의 localStorage에는 남아있는
        편집이 있을 때만 뜬다(대부분은 정상적으로 이미 저장돼 있어 뜨지 않는다).
      */}
      <Modal
        open={recoverableSnapshot !== null}
        onClose={discardSnapshot}
        title="임시 저장된 내용이 있습니다"
        footer={
          <>
            {/* variant="primary"를 여기서 쓰지 않는다 — 헤더의 "저장" 버튼이 이미 이
                화면의 유일한 primary다(CLAUDE.md 규칙). "무시"는 로컬에만 있던 임시본을
                버리는 동작이라 danger, "복구"는 그보다 덜 위험한 secondary로 구분한다. */}
            <Button type="button" variant="danger" onClick={discardSnapshot}>
              무시
            </Button>
            <Button type="button" variant="secondary" onClick={recoverFromSnapshot}>
              복구
            </Button>
          </>
        }
      >
        이 문서를 마지막으로 불러온 뒤 Confluence에 저장하지 못한 임시 저장본이
        있습니다{recoverableSnapshot && `(${formatUpdatedAt(recoverableSnapshot.savedAt)} 기준)`}.
        복구하시겠습니까?
      </Modal>

      {mode === "edit" && pageId && initialPublishState && (
        // PublishForm은 폼 태그를 쓰지 않는다(자동 저장이라 제출 버튼이 없다) — 이
        // 바깥의 문서 저장 <form>과 중첩돼도 안전하다(HTML은 <form> 중첩을 허용하지
        // 않으므로, 예전처럼 PublishForm 자체가 <form>이었다면 이 위치에 못 둔다).
        // 삭제 확인 모달(내용이 문장 한 줄)과 달리 토글+입력 필드가 여러 개라 기본
        // "md"(28rem, globals.css의 max-w-md 복구 참고)보다 넉넉한 폭이 필요해 "lg"
        // (max-w-2xl, 42rem)를 쓴다.
        <Modal
          open={publishModalOpen}
          onClose={() => setPublishModalOpen(false)}
          title="게시 설정"
          size="lg"
        >
          <PublishForm pageId={pageId} initial={initialPublishState} />
        </Modal>
      )}

      {mode === "edit" && pageId && isOwner && (
        <Modal open={shareModalOpen} onClose={() => setShareModalOpen(false)} title="문서 공유">
          <ShareForm pageId={pageId} initialSharedWith={initialSharedWith} />
        </Modal>
      )}
    </form>
  );
}
