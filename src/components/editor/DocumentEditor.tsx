"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Modal, useToast } from "@sfood/ui";
import type { JSONContent } from "@tiptap/react";
import { RichTextEditor } from "./RichTextEditor";
import { TagInput } from "./TagInput";
import { PublishForm, type PublishFormInitial } from "./PublishForm";

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
function TrashIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M4 6h12M8 6V4.5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1V6M6 6l.7 10.5a1 1 0 0 0 1 .9h4.6a1 1 0 0 0 1-.9L14 6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

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
}: DocumentEditorProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [title, setTitle] = useState(initialTitle);
  const [doc, setDoc] = useState<JSONContent>(withAtLeastOneBlock(initialDoc));
  const [tags, setTags] = useState<string[]>(initialTags);
  const [version, setVersion] = useState(initialVersion);
  const [status, setStatus] = useState<"idle" | "saving" | "deleting">("idle");
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [publishModalOpen, setPublishModalOpen] = useState(false);

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
   */
  async function saveTags(currentPageId: string): Promise<string | null> {
    try {
      const response = await fetch(
        `/api/editor/documents/${currentPageId}/tags`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tags }),
        }
      );
      if (!response.ok) {
        return await errorMessageOf(response, "태그 저장에 실패했습니다.");
      }
      return null;
    } catch (err) {
      return err instanceof Error ? err.message : "태그 저장에 실패했습니다.";
    }
  }

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    setStatus("saving");

    try {
      let currentPageId = pageId;

      if (mode === "create") {
        const response = await fetch("/api/editor/documents", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, doc }),
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
      }

      // 새 문서도 생성 응답으로 받은 pageId로 곧바로 태그를 저장한다. 그렇지 않으면
      // 첫 저장에서 입력한 태그가 조용히 사라진다.
      const tagError = currentPageId ? await saveTags(currentPageId) : null;
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

  async function handleDelete() {
    if (!pageId) {
      return;
    }

    setDeleteModalOpen(false);
    setStatus("deleting");

    try {
      const response = await fetch(`/api/editor/documents/${pageId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error(await errorMessageOf(response, "삭제에 실패했습니다."));
      }
      // 삭제된 문서가 사이드바 목록에서 즉시 사라지도록 새로고침한다.
      router.refresh();
      router.push("/editor");
    } catch (err) {
      toast(
        err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.",
        "danger"
      );
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
        {/*
          "문서함"이라는 글자가 화면 어디에도 없는데(사이드바에는 그런 제목이 없다)
          링크에서만 "문서함"을 언급해 뭘 가리키는지 알기 어려웠다(2026-08-26, 사용자
          피드백). 화살표 아이콘만 남기고 텍스트는 뺐다 — 문서 목록으로 돌아간다는
          의미는 aria-label/title로 스크린리더·툴팁에 남긴다.
        */}
        <Link
          href="/editor"
          aria-label="문서함으로 돌아가기"
          title="문서함으로 돌아가기"
          className="rounded-btn p-1.5 text-foreground transition-colors duration-default hover:bg-surface-raised"
        >
          <ArrowLeftIcon />
        </Link>

        {/*
          예전엔 버튼마다 글자가 있었는데, "아이콘만 봐도 알 수 있다"는 피드백으로
          아이콘만 남겼다(2026-08-26). 순서도 설정→저장→삭제로 바꿨다 — 파괴적
          동작(삭제)이 맨 끝이라 저장과는 여전히 붙어 있어서, 구분선으로 물리적으로
          갈라둔다(오클릭 방지, 이전 지적과 같은 이유).
        */}
        <div className="flex items-center gap-2">
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
          {mode === "edit" && pageId && (
            <>
              <span className="h-6 w-px bg-border" aria-hidden="true" />
              <Button
                type="button"
                variant="danger"
                size="md"
                className="!px-2.5"
                aria-label={status === "deleting" ? "삭제 중" : "삭제"}
                title={status === "deleting" ? "삭제 중" : "삭제"}
                onClick={() => setDeleteModalOpen(true)}
                disabled={status !== "idle"}
              >
                <TrashIcon />
              </Button>
            </>
          )}
        </div>
      </header>

      {/*
        예전엔 제목·태그·본문·풋터 사이가 전부 gap-4(16px)로 균일해서 이 넷이 서로
        어떤 관계인지(어디까지가 "문서 헤더"이고 어디부터 "쓰는 영역"인지) 시각적
        위계가 안 느껴졌다(2026-08-26, 사용자 피드백 — "간격이 균일해서 위계가 안
        느껴짐"). 제목→태그는 좁게(같은 "문서 메타" 묶음), 태그→본문은 넓게(여기부터
        진짜 쓰는 영역이라는 전환), 본문→풋터는 그 중간으로 차등을 준다.
      */}
      <div className="mx-auto flex max-w-[820px] flex-col px-6 py-10">
        {/* 제목은 TipTap 문서 안의 노드가 아니라 별도의 가벼운 입력이다. 저장 시
            Confluence 페이지 제목으로 그대로 쓰이므로 본문과 분리해서 관리한다.
            <input>은 원래 한 줄이라 제목이 길면 안 잘리고 가로 스크롤이 생겼다
            (2026-08-26, 사용자 피드백 — "긴 경우 wordwrap 해서 내려서 보이게").
            <input>은 애초에 여러 줄을 표시할 수 없는 요소라 <textarea>로 바꾸고,
            useAutoGrowHeight로 줄바꿈될 때마다 높이를 늘린다. Enter는 줄바꿈이
            아니라 "제목 입력 끝"으로 취급해 막는다(제목은 개념적으로 한 줄이다). */}
        <TitleTextarea value={title} onChange={setTitle} />

        <div className="mt-2">
          <TagInput value={tags} onChange={setTags} suggestions={tagSuggestions} />
        </div>

        {/*
          예전엔 새 문서를 열면 곧바로 "문서를 저장한 뒤에 이미지를 끌어다 놓거나
          붙여넣을 수 있습니다"라는 안내문이 떴는데, 화면 어디에도 이미지 관련 UI가
          없는 상태에서 맥락 없이 떠서 무슨 기능을 말하는 건지 알기 어려웠다
          (2026-08-26, 사용자 피드백 — "이게 무슨 기능 설명인지 이해가 안된다").
          같은 안내는 이제 실제로 이미지를 붙여넣거나 끌어다 놓으려는 "그 순간"에
          토스트로 뜬다(RichTextEditor.tsx의 handleDrop/handlePaste) — 필요한
          시점에 필요한 사람에게만 보이므로, 미리 띄워두던 이 문구는 그냥 뺀다.
        */}
        <div className="mt-6">
          <RichTextEditor content={doc} onChange={setDoc} pageId={pageId} />
        </div>

        {/*
          예전엔 사이드바 목록 행에 수정일이 있었는데, 사이드바를 더 단순한 리스트로
          바꾸면서(2026-08-26, "문서함을 좀 더 심플하게") 날짜 정보를 문서를 열었을 때
          보이는 하단 풋터로 옮겼다 — 컨플루언스 등 문서 도구들이 흔히 쓰는, 구분선 +
          옅은 글자의 메타 정보 풋터 형태를 따른다.
        */}
        {mode === "edit" && initialUpdatedAt && (
          <footer className="mt-4 border-t border-border pt-4 text-xs text-muted">
            최종 수정: {formatUpdatedAt(initialUpdatedAt)}
          </footer>
        )}
      </div>

      <Modal
        open={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="문서 삭제"
        footer={
          <>
            {/* Button은 type을 지정하지 않으면 form 안에서 submit으로 동작하므로,
                모달 버튼에는 반드시 type="button"을 명시한다. */}
            <Button
              type="button"
              variant="secondary"
              onClick={() => setDeleteModalOpen(false)}
            >
              취소
            </Button>
            <Button type="button" variant="danger" onClick={handleDelete}>
              삭제 확인
            </Button>
          </>
        }
      >
        이 문서를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
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
    </form>
  );
}
