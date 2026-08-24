"use client";

import { useId, useState, type KeyboardEvent } from "react";
import { Tag } from "@sfood/ui";

export interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  suggestions: string[];
}

export function TagInput({ value, onChange, suggestions }: TagInputProps) {
  const [draft, setDraft] = useState("");
  const datalistId = useId();

  function commitDraft() {
    const tag = draft.trim();
    if (tag && !value.includes(tag)) {
      onChange([...value, tag]);
    }
    setDraft("");
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      commitDraft();
    }
  }

  function removeTag(tag: string) {
    onChange(value.filter((existing) => existing !== tag));
  }

  const candidates = suggestions.filter(
    (suggestion) => !value.includes(suggestion) && suggestion.toLowerCase().includes(draft.toLowerCase())
  );

  return (
    <div className="flex flex-wrap items-center gap-2">
      {value.map((tag) => (
        <Tag key={tag} onRemove={() => removeTag(tag)} removeLabel={`${tag} 삭제`}>
          {tag}
        </Tag>
      ))}
      <input
        className="flex-1 min-w-[8rem] bg-transparent text-sm outline-none"
        placeholder="태그 입력"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={handleKeyDown}
        list={datalistId}
      />
      <datalist id={datalistId}>
        {candidates.map((candidate) => (
          <option key={candidate} value={candidate} />
        ))}
      </datalist>
    </div>
  );
}
