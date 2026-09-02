# P1-7c: 코드블록에 문법 강조를 추가한다

## 배경
2026-08-27 [프로덕션 준비도 감사](https://claude.ai/code/artifact/87302c07-68d6-42ed-8712-9345547cb659)에서 지적된 항목. `RichTextEditor.tsx`는 지금까지 `@tiptap/starter-kit`이 기본 제공하는 `CodeBlock`(문법 강조 없는 단색 `<pre><code>`)만 쓰고 있었다.

## 수용 기준 (Acceptance Criteria)
- [ ] 코드블록(슬래시 메뉴 "코드블록", 기존 `toggleCodeBlock()` 그대로) 안에 입력한 코드가 키워드·문자열·주석 등 토큰별로 색이 다르게 강조된다.
- [ ] 언어를 직접 지정하지 않아도(자동 추정) 강조가 동작한다 — 이번 범위는 "문법 강조 추가"까지이고, 언어를 고르는 UI는 범위 밖(아래 참고).
- [ ] 강조 색상은 하드코딩 hex가 아니라 이 프로젝트의 기존 CSS 변수 토큰(`--color-brand`/`--color-success`/`--color-warning`/`--color-danger`/`--color-info`/`--color-secondary`/`--color-muted`)을 참조해, 다크/라이트 테마 전환에 자동으로 따라간다.
- [ ] 기존 "코드블록" 슬래시 메뉴 항목과 `toggleCodeBlock()` 커맨드가 그대로 동작한다(회귀 없음).

## 결정이 필요한 사항
없음 — 구현 방식(TipTap 공식 `@tiptap/extension-code-block-lowlight` + `lowlight`)과 언어 세트(`lowlight`의 `common` 번들, 공식 문서가 권장하는 기본값)는 순수 기술적 선택이라 GitHub Issue 없이 직접 정했다. 색상 매핑(토큰 종류 → 이 프로젝트의 시맨틱 컬러 토큰)도 디자인 시스템이 이미 제공하는 팔레트 안에서 관례적인 역할 배정(키워드=강조색, 문자열=success, 주석=muted 등)을 따른 것이라 별도 결정이 필요 없다.

## 범위 밖
- 코드블록에 언어를 직접 고르는 UI(드롭다운 등) — lowlight의 자동 언어 추정으로 대부분의 경우 충분하다고 판단했다. 자동 추정이 부정확한 사례가 실사용에서 나오면 별도 항목으로 추가한다.
- 공개 뷰어(Tech Blog)·Confluence storage 포맷에 강조 정보(언어·토큰)를 반영하는 것 — `tiptap-to-storage.ts`의 `codeBlock` 직렬화는 원래부터 `<pre><code>텍스트</code></pre>`로만 저장하고 강조는 순수 에디터 렌더링 단계에서만 일어난다(P1-7b의 `colwidth`와 같은 종류의 "에디터 자체 왕복은 문제없음, 외부 저장소는 범위 밖" 패턴).
- 코드블록 우측 상단 "복사" 버튼 등 부가 UI — PRD 항목이 "문법 강조"만 명시하고 있어 범위 밖.
