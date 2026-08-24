"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Modal, useToast } from "@sfood/ui";
import type { JSONContent } from "@tiptap/react";
import { RichTextEditor } from "./RichTextEditor";
import { TagInput } from "./TagInput";

interface DocumentEditorProps {
  mode: "create" | "edit";
  pageId?: string;
  initialTitle?: string;
  initialDoc?: JSONContent;
  initialTags?: string[];
  initialVersion?: number;
  tagSuggestions?: string[];
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

export function DocumentEditor({
  mode,
  pageId,
  initialTitle = "",
  initialDoc = EMPTY_DOC,
  initialTags = [],
  initialVersion,
  tagSuggestions = [],
}: DocumentEditorProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [title, setTitle] = useState(initialTitle);
  const [doc, setDoc] = useState<JSONContent>(withAtLeastOneBlock(initialDoc));
  const [tags, setTags] = useState<string[]>(initialTags);
  const [version, setVersion] = useState(initialVersion);
  const [status, setStatus] = useState<"idle" | "saving" | "deleting">("idle");
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

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
        // 새 문서가 목록에 즉시 나타나도록 명시적으로 새로고침한다.
        router.refresh();
        if (currentPageId) {
          router.push(`/editor/${currentPageId}`);
        }
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
    <form className="stack" onSubmit={handleSave}>
      {/* 제목은 TipTap 문서 안의 노드가 아니라 별도의 가벼운 입력이다. 저장 시
          Confluence 페이지 제목으로 그대로 쓰이므로 본문과 분리해서 관리한다. */}
      <input
        type="text"
        aria-label="제목"
        placeholder="제목"
        className="w-full border-none bg-transparent text-3xl font-bold text-foreground outline-none placeholder:text-muted"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
      />

      <TagInput value={tags} onChange={setTags} suggestions={tagSuggestions} />

      <RichTextEditor content={doc} onChange={setDoc} pageId={pageId} />

      {!pageId && (
        <p className="text-xs text-muted">
          문서를 저장한 뒤에 이미지를 끌어다 놓거나 붙여넣을 수 있습니다.
        </p>
      )}

      <div className="toolbar">
        <div className="flex gap-2">
          {mode === "edit" && pageId && (
            <>
              <Button
                type="button"
                variant="danger"
                onClick={() => setDeleteModalOpen(true)}
                disabled={status !== "idle"}
              >
                {status === "deleting" ? "삭제 중..." : "삭제"}
              </Button>
              <Link
                href={`/editor/${pageId}/publish`}
                className="button button-secondary"
              >
                게시 설정
              </Link>
            </>
          )}
        </div>

        <Button type="submit" variant="primary" disabled={status !== "idle"}>
          {status === "saving" ? "저장 중..." : "저장"}
        </Button>
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
    </form>
  );
}
