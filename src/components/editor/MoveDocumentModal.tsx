"use client";

import { useState, type FormEvent } from "react";
import { Button, FormField, Modal, Select, useToast } from "@sfood/ui";
import type { DocumentSummary } from "@/lib/editor/documents";

/** 대상 폴더 선택지 하나 — `label`은 트리 깊이만큼 들여쓴 표시용 텍스트다. */
export interface FolderOption {
  id: string;
  label: string;
}

export interface MoveDocumentModalProps {
  open: boolean;
  onClose: () => void;
  document: DocumentSummary;
  /** 내 폴더 트리를 평평하게 편 목록(부모→자식 순서, 깊이만큼 들여쓴 라벨) — `EditorSidebar.tsx`가 만든다. */
  folderOptions: FolderOption[];
  /** 이동 성공 시 호출한다(목록 새로고침은 호출부 책임 — `router.refresh()`). */
  onSaved: () => void;
}

/**
 * 문서를 다른 폴더로 옮기거나 미분류로 되돌리는 모달(P7-6) — "이동" 메뉴/모달 방식으로
 * 먼저 구현한다(드래그앤드롭은 범위 밖, prd.md Phase 7 핵심 결정 참고). `FolderFormModal.tsx`
 * 와 같은 FormField+useToast 패턴을 따르되, 이름 입력 대신 대상 폴더 `Select`를 쓴다.
 */
export function MoveDocumentModal({
  open,
  onClose,
  document,
  folderOptions,
  onSaved,
}: MoveDocumentModalProps) {
  // 이 컴포넌트도 FolderFormModal.tsx와 같은 이유로 호출부가 대상 문서가 바뀔 때마다
  // 새로 마운트하므로(닫힌 뒤에만 다른 문서를 다시 열 수 있음), 초기값을 useEffect로
  // 동기화할 필요 없이 useState 초기값만으로 충분하다.
  const [folderId, setFolderId] = useState(document.folderId ?? "");
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      const response = await fetch(`/api/editor/documents/${document.pageId}/folder`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folderId: folderId || null }),
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as
          | { error?: { message?: string } }
          | null;
        throw new Error(data?.error?.message ?? "문서를 이동하지 못했습니다.");
      }
      toast("문서를 이동했습니다.", "success");
      onClose();
      onSaved();
    } catch (error) {
      toast(error instanceof Error ? error.message : "문서를 이동하지 못했습니다.", "danger");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={`"${document.title}" 이동`}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <FormField label="대상 폴더">
          <Select
            value={folderId}
            onChange={(event) => setFolderId(event.target.value)}
            options={[
              { value: "", label: "미분류" },
              ...folderOptions.map((option) => ({ value: option.id, label: option.label })),
            ]}
          />
        </FormField>
        <Button type="submit" variant="primary" disabled={saving}>
          {saving ? "이동 중..." : "이동"}
        </Button>
      </form>
    </Modal>
  );
}
