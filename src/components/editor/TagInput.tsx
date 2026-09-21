"use client";

import { useId, useRef, useState, type KeyboardEvent } from "react";
import { Popover, Tag } from "@sfood/ui";

export interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  suggestions: string[];
}

/**
 * P17-16(외부 UI 개선 제안 검토 후 채택): 예전엔 이 자리 전체가 항상 열린 테두리+배경
 * 입력 박스(`border border-border bg-surface`)라 "문서 마지막에 거대한 Form 필드가
 * 하나 붙어 있다"는 지적을 받았다. 위치(문서 하단, P12-2 결정)는 그대로 두고, 상시
 * 입력창 대신 칩 + "태그 추가" 트리거만 평소에 보이게 하고, 실제 입력·검색은 트리거를
 * 눌렀을 때만 뜨는 `@sfood/ui`의 `Popover`(`node_modules/@sfood/ui/dist/index.d.ts`
 * 확인 — trigger 클릭으로 열리고 바깥 클릭/Escape로 닫히는 것까지 이미 구현돼 있어
 * 직접 열림 상태를 관리할 필요가 없다) 안으로 옮긴다.
 */
function TagAddIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function TagInput({ value, onChange, suggestions }: TagInputProps) {
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const listboxId = useId();

  function commitTag(tag: string) {
    const trimmed = tag.trim();
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed]);
    }
    setDraft("");
    inputRef.current?.focus();
  }

  function commitDraft() {
    commitTag(draft);
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

  // draft가 빈 문자열이면 모든 문자열이 ""를 포함하므로(빈 검색어 = 필터 없음), 팝오버를
  // 막 열었을 때(아직 아무것도 안 쳤을 때)도 남은 추천 태그 전체를 곧바로 보여준다 —
  // 예전처럼 "뭔가 입력해야만" 뜨지 않는다(GPT 제안의 "검색 또는 둘러보기" 팝오버 방식).
  const candidates = suggestions.filter(
    (suggestion) => !value.includes(suggestion) && suggestion.toLowerCase().includes(draft.toLowerCase())
  );

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="shrink-0 text-xs font-medium text-muted">태그</span>
      {value.map((tag) => (
        <Tag key={tag} onRemove={() => removeTag(tag)} removeLabel={`${tag} 삭제`}>
          {tag}
        </Tag>
      ))}
      <Popover
        trigger={
          <button
            type="button"
            className="inline-flex shrink-0 items-center gap-1 rounded-btn px-2 py-1 text-xs font-medium text-muted transition-colors duration-default hover:bg-surface-raised hover:text-foreground"
          >
            <TagAddIcon />
            태그 추가
          </button>
        }
      >
        <div className="flex w-56 flex-col gap-2">
          <input
            ref={inputRef}
            autoFocus
            className="w-full rounded-input border border-border bg-surface px-2 py-1.5 text-sm text-foreground outline-none focus:border-brand focus:ring-2 focus:ring-brand"
            placeholder="태그 검색 또는 입력..."
            aria-label="태그"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={handleKeyDown}
            role="combobox"
            aria-expanded={candidates.length > 0}
            aria-autocomplete="list"
            aria-controls={listboxId}
          />
          {candidates.length > 0 && (
            <ul id={listboxId} role="listbox" className="max-h-48 overflow-y-auto">
              {candidates.map((candidate) => (
                <li key={candidate}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={false}
                    className="block w-full rounded px-2 py-1 text-left text-sm text-foreground hover:bg-surface-raised"
                    onClick={() => commitTag(candidate)}
                  >
                    {candidate}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Popover>
    </div>
  );
}
