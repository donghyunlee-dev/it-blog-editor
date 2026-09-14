"use client";

import { useId, useRef, useState, type KeyboardEvent } from "react";
import { Tag } from "@sfood/ui";

export interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  suggestions: string[];
}

export function TagInput({ value, onChange, suggestions }: TagInputProps) {
  const [draft, setDraft] = useState("");
  // 예전에는 <datalist>(브라우저 네이티브 자동완성)를 썼는데, 다크 테마 토큰이 전혀
  // 적용되지 않아 대부분의 브라우저에서 OS 기본 라이트 배경 드롭다운으로 뜨는 문제가
  // 있었다(2026-08-26 UI 진단). 직접 스타일한 드롭다운으로 교체한다.
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listboxId = useId();

  function commitTag(tag: string) {
    const trimmed = tag.trim();
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed]);
    }
    setDraft("");
    setSuggestionsOpen(false);
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

  const candidates = suggestions.filter(
    (suggestion) => !value.includes(suggestion) && suggestion.toLowerCase().includes(draft.toLowerCase())
  );
  const showSuggestions = suggestionsOpen && draft.length > 0 && candidates.length > 0;

  return (
    // 태그가 어디에 입력되는 영역인지 눈에 잘 안 띈다는 피드백(2026-08-31)으로, 제목·본문과
    // 같은 "박스 없는 캔버스" 위에 있더라도 이 영역만큼은 테두리+배경으로 명확히 구획한다.
    // 검색창(EditorSidebar.tsx)·슬래시 메뉴 입력(RichTextEditor.tsx)과 같은
    // rounded-input/border-border/focus 시 border-brand+ring-brand 조합을 그대로 따른다 —
    // 포커스가 실제로는 안쪽 <input>에 걸리므로 focus-within으로 바깥 박스까지 강조한다.
    //
    // 2026-09-14(P12-2): 태그가 "검색용 가벼운 키워드"로 위상이 낮아지면서(태그 재검토, P12)
    // 라벨을 별도 줄로 두던 2줄 레이아웃을 1줄로 압축한다 — 라벨·칩·입력을 같은 flex 행에
    // 나란히 둔다(태그가 많아 줄바꿈되는 경우만 예외).
    <div className="relative flex flex-wrap items-center gap-2 rounded-input border border-border bg-surface px-2.5 py-1.5 transition-colors duration-default focus-within:border-brand focus-within:ring-2 focus-within:ring-brand">
      <span className="shrink-0 text-xs font-medium text-muted">태그</span>
      {value.map((tag) => (
        <Tag key={tag} onRemove={() => removeTag(tag)} removeLabel={`${tag} 삭제`}>
          {tag}
        </Tag>
      ))}
      <input
        ref={inputRef}
        className="min-w-[8rem] flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-placeholder"
        // 이전엔 "태그 입력"이라는 안내 문구뿐이었는데, 실제 태그 예시가 없어 뭘 적어야
        // 할지 감이 안 온다는 피드백(2026-08-31)으로 다른 곳(PublishForm의 slug 필드
        // 등)과 같은 "예: ..." 형식의 샘플 텍스트로 바꿨다. 태그가 이미 있으면(칩이 라벨
        // 역할을 대신하므로) 더 이상 보여주지 않는다(2026-09-14, P12-2 — 사용자 지적).
        placeholder={value.length === 0 ? "예: React, Backend" : undefined}
        aria-label="태그"
        value={draft}
        onChange={(event) => {
          setDraft(event.target.value);
          setSuggestionsOpen(true);
        }}
        onFocus={() => setSuggestionsOpen(true)}
        // 후보 목록 클릭보다 blur가 먼저 발생해 목록이 닫혀버리지 않도록 한 프레임
        // 늦춰서 닫는다.
        onBlur={() => setTimeout(() => setSuggestionsOpen(false), 100)}
        onKeyDown={handleKeyDown}
        role="combobox"
        aria-expanded={showSuggestions}
        aria-autocomplete="list"
        aria-controls={listboxId}
      />
      {showSuggestions && (
        <ul
          id={listboxId}
          role="listbox"
          className="absolute left-0 top-full z-10 mt-1 max-h-48 w-56 overflow-y-auto rounded-card border border-border bg-surface p-1 shadow-md"
        >
          {candidates.map((candidate) => (
            <li key={candidate}>
              <button
                type="button"
                role="option"
                aria-selected={false}
                className="block w-full rounded px-2 py-1 text-left text-sm text-foreground hover:bg-surface-raised"
                // input의 onBlur보다 먼저 실행되도록 mousedown에서 커밋한다(click은
                // blur 이후에 발생해 늦게 잡히면 목록이 이미 닫혀 있을 수 있다).
                onMouseDown={(event) => {
                  event.preventDefault();
                  commitTag(candidate);
                  inputRef.current?.focus();
                }}
              >
                {candidate}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
