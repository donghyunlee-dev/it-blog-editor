# P9-2: 콜아웃 아이콘 선택 UI — 구현 계획

> **[Issue #101](https://github.com/sfood-pioneer-1st/sfood-it-editor/issues/101) 답변 대기 중** — 큐레이션 이모지 목록이 확정되기 전까지 Step 2(목록 상수)를 채울 수 없어 착수하지 않는다. 나머지 단계는 답변과 무관하게 미리 확정해 둔다.

## Global Constraints
- 새 npm 패키지(이모지 피커 라이브러리 등)를 설치하지 않는다 — 기존 `Popover`(`@sfood/ui`) + 정적 그리드로 충분하다(글자색/하이라이트 스와치와 동일한 접근).
- `@sfood/ui`에는 이모지 피커나 아이콘 선택 컴포넌트가 없다(`Icon` 컴포넌트는 2종만 지원, 확인됨) — 이번 그리드는 이 프로젝트 로컬 컴포넌트로 만든다.
- 패널은 `content: "block+"`를 유지한다 — NodeView를 추가해도 내부 리치텍스트 편집(ProseMirror `NodeViewContent`)은 그대로 TipTap이 담당하게 하고, 아이콘 트리거 버튼만 NodeView가 얹는다.

## Files
- Modify: `src/components/editor/RichTextEditor.tsx` (`Panel` 노드에 `addNodeView` 추가, `PanelIconPicker` 컴포넌트 신설, 큐레이션 이모지 목록 상수)
- Modify: `src/components/editor/RichTextEditor.test.tsx`
- Modify: `src/app/globals.css` (아이콘 트리거 버튼 스타일 — 기존 `.panel` flex 레이아웃 재사용, 새 레이아웃 클래스 최소 추가)

## Steps
- [ ] **Step 1**: `Panel` 노드에 `addNodeView()`를 추가해 React `NodeViewWrapper`(`@tiptap/react`) 기반 컴포넌트로 전환한다 — 기존 `renderHTML`은 저장/외부 렌더링 경로(예: 읽기 전용 뷰) 대비 그대로 남겨 둔다.
- [ ] **Step 2**: `CURATED_PANEL_ICONS` 상수 배열을 정의한다 — **[Issue #101](https://github.com/sfood-pioneer-1st/sfood-it-editor/issues/101) 답변으로 확정된 목록 그대로** 채운다(현재 TBD).
- [ ] **Step 3**: `PanelIconPicker` 컴포넌트 — 현재 `icon` attrs를 트리거 버튼(현재 아이콘 표시)으로 보여주고, 클릭하면 `Popover` 안에 `CURATED_PANEL_ICONS`를 그리드(`SwatchGrid`와 같은 `grid grid-cols-*` 패턴, 원 대신 이모지 버튼)로 렌더링한다. 클릭 시 `updateAttributes({ icon })`으로 즉시 반영한다.
- [ ] **Step 4**: `NodeViewWrapper`가 `panel panel-{panelType}` 클래스를 유지한 채 `PanelIconPicker`(아이콘 트리거) + `NodeViewContent`(본문 편집 영역, `.panel-content`)를 나란히 렌더링하도록 구성한다.
- [ ] **Step 5**: `RichTextEditor.test.tsx` — 아이콘 버튼 클릭 → 팝오버 열림 → 이모지 클릭 → attrs 갱신을 검증(기존 글자색 스와치 테스트 패턴 재사용), 키보드(Tab 포커스+Enter 열기+Escape 닫기) 동작 검증, 패널 본문 편집이 NodeView 도입 후에도 그대로 동작하는지 회귀 검증.
- [ ] **Step 6**: `npx vitest run RichTextEditor.test.tsx`, `npx eslint src/components/editor/RichTextEditor.tsx`, `npm run build`로 확인한다.

각 Step은 `npx vitest run RichTextEditor.test.tsx`로 검증 가능한 단위로 쪼갠다.
