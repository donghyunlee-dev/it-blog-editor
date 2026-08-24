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
    // 한글 등 조합형 입력(IME) 중에 Enter를 누르면 브라우저가 "조합 확정"과
    // "키 입력"을 동시에 이 이벤트로 보낸다. isComposing을 확인하지 않으면
    // 조합이 끝나기 전에 태그가 커밋되어 마지막 글자가 잘리거나 중복 입력된다.
    if (event.nativeEvent.isComposing) {
      return;
    }
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
