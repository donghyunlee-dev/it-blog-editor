"use client";

import { useState, type FormEvent } from "react";
import { Button, FormField, Input, Modal, useToast } from "@sfood/ui";

export type FolderFormMode =
  | { type: "create"; parentId: string | null }
  | { type: "rename"; folderId: string; currentName: string };

export interface FolderFormModalProps {
  open: boolean;
  onClose: () => void;
  mode: FolderFormMode;
  /** 저장 성공 시 호출한다(목록 새로고침은 호출부 책임 — `router.refresh()`). */
  onSaved: () => void;
}

/**
 * 폴더 생성·이름변경을 함께 다루는 폼(P7-5) — `AccountInfoModal.tsx`와 같은
 * FormField+Input+useToast 패턴을 그대로 따른다. 생성/이름변경은 폼 모양이
 * "이름 하나"로 완전히 같아 모드로만 나눈다(별도 컴포넌트로 쪼개지 않음).
 */
export function FolderFormModal({ open, onClose, mode, onSaved }: FolderFormModalProps) {
  // 호출부(EditorSidebar.tsx)가 `{folderFormState && <FolderFormModal ... />}`로 모드가
  // 바뀔 때마다 이 컴포넌트를 새로 마운트한다(닫힌 뒤에만 다른 모드로 다시 열 수 있어
  // 항상 null을 거쳐 리마운트됨) — 그래서 초기값을 `useEffect`로 동기화할 필요 없이
  // `useState` 초기값만으로 "생성은 빈 값, 이름변경은 현재 이름"이 항상 보장된다.
  const [name, setName] = useState(mode.type === "rename" ? mode.currentName : "");
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      const response =
        mode.type === "create"
          ? await fetch("/api/editor/folders", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ name, parentId: mode.parentId }),
            })
          : await fetch(`/api/editor/folders/${mode.folderId}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ name }),
            });
      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as
          | { error?: { message?: string } }
          | null;
        throw new Error(data?.error?.message ?? "폴더를 저장하지 못했습니다.");
      }
      toast(mode.type === "create" ? "폴더를 만들었습니다." : "폴더 이름을 변경했습니다.", "success");
      onClose();
      onSaved();
    } catch (error) {
      toast(error instanceof Error ? error.message : "폴더를 저장하지 못했습니다.", "danger");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={mode.type === "create" ? "새 폴더" : "폴더 이름 변경"}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <FormField label="폴더 이름" required>
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="예: 업무"
            autoFocus
          />
        </FormField>
        <Button type="submit" variant="primary" disabled={saving || !name.trim()}>
          {saving ? "저장 중..." : "저장"}
        </Button>
      </form>
    </Modal>
  );
}
