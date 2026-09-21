# P17-17: 좁은 화면에서 목차를 드로어로 열기 — 검증 기록

## 자동화 테스트
| 커맨드 | 결과 |
|---|---|
| `npx vitest run src/components/editor/TableOfContents.test.tsx src/components/editor/EditorShell.test.tsx src/components/editor/DocumentEditor.test.tsx` | 통과 (82/82 — TableOfContents 21개(신규 4개 포함), EditorShell+DocumentEditor 61개) |
| `npx eslint src/components/editor/TableOfContents.tsx src/components/editor/TableOfContents.test.tsx` | 통과 (경고/에러 없음) |
| `npm run build` | 통과 (컴파일·타입체크·정적 페이지 생성 모두 성공, 디버그 라우트 없음 확인) |

## 수동 검증
- `/editor/[pageId]`는 AX Auth 로그인 게이트 뒤에 있어 이 세션에서 직접 열 수 없다.
  `EditorShell`은 그 게이트와 무관한 독립 컴포넌트라, `/dev-preview-toc-drawer`
  (임시 라우트, 검증 후 즉시 삭제)에서 `EditorShell` + 실제 h2/h3가 있는 컨테이너 +
  `TableOfContents`를 함께 마운트해 Browser pane(Chromium)에서 확인했다.
- 세 breakpoint를 `resize_window`로 재현해 `getComputedStyle`로 실측:
  1. **375px(모바일)**: 토글 버튼 `display: "none"`.
  2. **1024px(노트북, md~xl 구간)**: 토글 버튼 `display: "flex"`, 우측 레일의 부모
     `display: "none"`.
  3. **1440px(데스크톱, xl 이상)**: 토글 버튼 `display: "none"`, 우측 레일의 부모
     `display: "block"`.
- 1024px에서 실제 클릭 흐름 확인: 토글 버튼 클릭 → "이 페이지" 제목·닫기 버튼·헤딩
  3개(첫 섹션/하위 섹션/두 번째 섹션)가 있는 드로어가 열림 → 드로어 안 "하위 섹션"
  링크 클릭 → `scrollIntoView` 호출 확인은 자동화 테스트로, 이 수동 검증에서는
  클릭 직후 `dialog`의 `aria-hidden`이 `"false"`→(짧은 지연 후) `"true"`로 바뀌는
  것을 확인해 드로어가 실제로 닫힘을 확인했다.

## 발견된 문제와 조치
- **원인**: 기존 테스트("헤딩 엘리먼트에 어떤 속성도 쓰지 않는다")가
  `document.querySelectorAll("h2, h3")`로 전역 DOM을 스캔했는데, `@sfood/ui`의
  `Drawer`가 `title` prop을 접근성용 실제 `<h2>`로 그려서(디자인 시스템 자체 구현)
  이 검증과 무관한 `<h2>`가 하나 더 생겨 실패했다.
- **조치**: `Harness`의 실제 본문 컨테이너에 `data-testid="content"`를 추가하고,
  그 테스트만 이 컨테이너로 스코프를 좁혔다(전역 `document` 대신).
- **재검증 결과**: `npx vitest run src/components/editor/TableOfContents.test.tsx` —
  21/21 통과.

## 검증 중 새로 발견한 결정 사항
없음.

## 최종 판정
- [x] 수용 기준(`task.md`)을 모두 만족함 — PRD 갱신 가능.
