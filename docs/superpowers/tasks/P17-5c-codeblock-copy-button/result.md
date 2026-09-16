# P17-5c: 코드 블록 복사 버튼 — 결과

## 커밋
- (커밋 예정 — 아래 "산출물" 참고)

## 변경 파일
- `src/components/editor/RichTextEditor.tsx`
  - `CodeCopyIcon` SVG 컴포넌트 추가 — 기존 `TableIcon`(P1-7a/P17-3) 선례와 같은 스타일
    (viewBox 0 0 24 24, stroke currentColor, strokeWidth 2, h-4 w-4)로 직접 그렸다.
  - `CodeBlockView`에 `useToast()`와 `handleCopy` 핸들러를 추가했다 —
    `navigator.clipboard.writeText(node.textContent)`로 코드 블록의 순수 텍스트(마크업
    제외)를 복사하고, 성공 시 `toast(..., "success")`, 실패(reject/예외) 시
    `toast(..., "danger")`를 띄운다.
  - `.code-block-toolbar`를 `flex items-center gap-1` 레이아웃으로 바꾸고, 언어 선택
    드롭다운(+절대위치 화살표)을 자체 `relative inline-block` 래퍼로 감싸 복사 버튼과
    나란히 놓이게 했다(화살표의 절대 위치가 툴바 전체가 아니라 드롭다운 박스 기준으로
    유지되도록).
  - 복사 버튼은 `@sfood/ui`의 `Button variant="ghost" size="sm"`, `aria-label="코드 복사"`.
- `src/components/editor/RichTextEditor.test.tsx` — "RichTextEditor 코드 블록 복사
  버튼(P17-5c)" describe 블록 추가(3개 테스트): 클릭 시 클립보드 복사 + 성공 토스트,
  복사 실패 시 실패 토스트, 코드 블록이 여러 개일 때 각 버튼이 자신의 코드만 복사.
  jsdom엔 `navigator.clipboard`가 없어 `Object.defineProperty`로 직접 모킹했다.
- `docs/product/prd.md` — P17-5c 항목 완료 표시, 진행률 갱신.

## 자체 검토
- **긍정**: 새 노드뷰 구조 없이 기존 `CodeBlockView`/`.code-block-toolbar`(P17-5b/P17-11)에
  버튼만 추가해 범위를 좁게 유지했다. 성공/실패 토스트 문구가 정확히 어떤 조건에서
  뜨는지 유닛 테스트로 고정했고, Browser pane 실브라우저에서도 클릭 → `handleCopy` →
  `navigator.clipboard.writeText` 호출 → (환경 제약으로 reject) → 실패 토스트 표시까지
  실제 DOM에서 확인했다(아래 "우려사항" 참고 — 성공 경로 자체는 이 환경에서 직접
  확인하지 못했지만 코드 경로는 동일하고 유닛 테스트로 커버된다).
- **주의사항**: `.code-block-toolbar`를 `relative inline-block`에서 `flex`로 바꾸면서
  드롭다운의 절대위치 화살표(▾)가 툴바 전체를 기준으로 어긋날 뻔했다 — 드롭다운+화살표를
  별도 `relative` 래퍼로 감싸 기존 위치 계산(드롭다운 박스 기준 `right-2`)이 그대로
  유지되도록 했다.
- **우려사항**: 이 세션의 Browser pane(헤드리스 Chromium)은 `clipboard-write` 권한이
  기본적으로 거부돼(`Write permission denied`, `javascript_tool`로 직접 확인) 복사
  버튼의 "성공" 경로를 실제 화면에서 끝까지 확인할 수 없었다 — 대신 (1) 실패 경로는
  실제 DOM에서 끝까지 확인했고(버튼 클릭 → 실패 토스트 렌더링), (2) 성공 경로는 같은
  `handleCopy` 함수 안에서 `await` 뒤 분기만 다른 코드이므로 유닛 테스트(clipboard
  모킹으로 resolve/reject 둘 다 재현)로 검증했다. 실제 사용자 브라우저(Chrome 등)는
  `https`/`localhost` 컨텍스트에서 클립보드 쓰기 권한을 기본 허용하므로 이 제약은
  이 세션의 도구 환경에 국한된 것으로 판단한다.

## P17-5c 후속 버그 수정(같은 PR, 사용자 실사용 확인 후 리포트)
사용자 지적: "라이트 모드일 때 마우스 오버하면 라이트 백그라운드가 되어서 잘 안보여.
전체적으로 다크톤인데 마우스 오버할 때 다크모드 처럼 CSS가 적용되어야 해."

- **원인**: 복사 버튼은 `@sfood/ui`의 `Button variant="ghost"`를 쓰는데, 이 variant는
  `hover:bg-surface-raised`로 마우스 오버 배경을 표시한다(`node_modules/@sfood/ui/dist/
  index.js` 확인). `--color-surface-raised`는 라이트 테마에서 `var(--white)`(`tokens/
  semantic.css`) — 코드 블록 배경을 항상 어둡게 고정해 둔(P17-11) 이 툴바 위에서, 라이트
  테마일 때만 마우스를 올리면 흰 배경이 튀어나와 보였다. P17-11에서 `--color-foreground`/
  `--color-border`/`--color-muted`는 이미 다크로 고정했지만 `--color-surface*` 계열은
  빠져 있었다.
- **조치**: `.code-block-toolbar`에 `--color-surface`/`--color-surface-raised`/
  `--color-surface-overlay`/`--color-surface-subtle`를 semantic.css의
  `[data-theme="dark"]` 값(`--gray-900`/`--gray-800`/`--gray-800`/`--gray-800`)으로
  고정 오버라이드했다 — 기존 `--color-foreground` 등과 같은 패턴이라 이 툴바 안에
  놓이는 어떤 디자인 시스템 컴포넌트의 hover/active 배경도 자동으로 항상 다크 테마
  값을 쓰게 된다.
- **재검증**: Browser pane에서 페이지를 라이트 테마(`data-theme="light"`)로 강제한 뒤,
  복사 버튼을 감싸는 `.code-block-toolbar`의 `getComputedStyle`로
  `--color-surface-raised`가 `#1f2937`(gray-800, 다크 테마 값과 동일)로 해석됨을
  확인했다 — 수정 전이었다면 `#ffffff`(white)였을 값이다. 버튼의 실제 클래스에
  `hover:bg-surface-raised`가 포함돼 있음도 함께 확인했다(이 값을 그대로 참조하므로
  마우스 오버 시 어두운 배경이 적용된다).

## 산출물
- `docs/superpowers/tasks/P17-5c-codeblock-copy-button/{task,plan,result,test}.md`
- `src/components/editor/RichTextEditor.tsx`, `RichTextEditor.test.tsx`
- `docs/product/prd.md`
