# P1-7b: 표 컬럼 리사이즈를 활성화한다

## 배경
2026-08-27 [프로덕션 준비도 감사](https://claude.ai/code/artifact/87302c07-68d6-42ed-8712-9345547cb659)에서 지적된 항목. `RichTextEditor.tsx`는 그동안 `Table.configure({ resizable: false })`로 컬럼 리사이즈를 꺼둔 상태였다. TipTap `@tiptap/extension-table`(prosemirror-tables 기반)은 `resizable: true`만 켜면 드래그로 컬럼 너비를 조절하는 기능을 이미 제공한다.

**이 항목은 P1-7a(표 행/열 컨트롤)와 실제로 얽혀 있다.** `resizable: true`가 되면 표 노드의 렌더링 경로 자체가 바뀐다 — `@tiptap/extension-table`의 `addNodeView()`는 `resizable`이 켜지면 `null`을 반환해 스스로는 NodeView를 등록하지 않고, 대신 `columnResizing()` 플러그인(prosemirror-tables)이 **자기 자신의 `nodeViews` 등록**을 통해 표의 View 클래스를 생성한다. 이때 View 생성자에 넘기는 인자가 `(node, cellMinWidth, view)` 세 개뿐이라, P1-7a의 `StickyTableView`가 그동안 의존하던 `getPos`(네 번째 인자)를 받을 방법이 없다 — `resizable: true`로 바꾸면 P1-7a에서 만든 표별 sticky 툴바가 그대로 깨진다. 그래서 이번 작업은 리사이즈 활성화와 함께 `StickyTableView`가 "커서가 이 표 안에 있는가"를 계산하는 방식을 `getPos`(생성자 인자) 의존에서 `findParentNodeClosestToPos`(현재 선택 기준으로 역산, `@tiptap/extension-table`이 `deleteRow`/`deleteColumn`에서 이미 쓰는 것과 같은 유틸) 기반으로 바꿔, 두 렌더링 경로(리사이즈 켜짐/꺼짐) 모두에서 동일하게 동작하도록 고친다.

## 수용 기준 (Acceptance Criteria)
- [ ] `Table.configure({ resizable: true, ... })`로 컬럼 리사이즈가 켜진다 — 표의 컬럼 경계에 드래그 가능한 손잡이가 나타나고, 드래그하면 그 컬럼(과 필요 시 다음 컬럼)의 너비가 바뀐다.
- [ ] prosemirror-tables의 `columnResizing`/`resize-cursor`/`column-resize-handle`은 라이브러리가 CSS를 전혀 제공하지 않으므로(코드로 확인), `globals.css`에 손잡이가 보이고 드래그 중 커서가 바뀌는 최소 스타일을 추가한다. 표가 컨테이너보다 넓어질 수 있으므로 `.tableWrapper`에 가로 스크롤도 함께 추가한다(TipTap 공식 문서가 리사이즈 활성화 시 함께 권장하는 CSS).
- [ ] P1-7a의 표별 sticky 툴바(행/열 추가·삭제, 셀 병합/분할)가 `resizable: true`에서도 동일하게 동작한다 — 기존 P1-7a 테스트 스위트(9건)가 새 설정 그대로 통과해야 한다(회귀 없음).
- [ ] 문서에 표가 여러 개 있을 때도 커서가 있는 표에만 툴바가 뜨는 동작이 유지된다.

## 결정이 필요한 사항
없음 — `handleWidth`(5px)/`cellMinWidth`(25px)/`lastColumnResizable`(true)는 TipTap/prosemirror-tables의 기본값을 그대로 쓴다. 이 값들을 바꿔야 할 구체적인 이유가 없어 GitHub Issue 없이 기본값 유지로 직접 정했다(P0-4b와 같은 근거).

## 범위 밖
- **공개 뷰어(Tech Blog)에서 리사이즈된 컬럼 너비가 반영되지 않는다.** `tiptap-to-storage.ts`(TipTap JSON → Confluence storage HTML 변환)는 표 셀의 `colspan`/`rowspan`만 직렬화하고 `colwidth`는 직렬화하지 않는다 — 그 변환 결과(`bodyValue`)는 Confluence 페이지 자체의 렌더링 산출물일 뿐, 에디터가 다시 불러올 때는 `sourceDocument` property의 원본 TipTap JSON(`colwidth` 포함)을 그대로 쓰므로(`documents.ts`) **에디터 안에서 저장·재로드하는 것 자체는 문제없이 컬럼 너비를 보존한다.** 다만 이 저장소 밖의 Tech Blog Viewer가 `colwidth`를 인식하지 못하면 거기서는 리사이즈가 반영 안 될 수 있다 — P0-5b와 같은 이유(뷰어는 별도 저장소, 범위 밖)로 문서화만 하고 고치지 않는다.
- 실제 마우스 드래그로 손잡이를 끌어 너비가 바뀌는 상호작용 자체의 자동화 테스트 — happy-dom은 실제 레이아웃(`offsetWidth` 등 기하 정보)을 계산하지 않아 드래그 기반 리사이즈를 의미 있게 재현할 수 없다(이 프로젝트의 기존 "리치 편집 상호작용 테스트는 범위 밖" 원칙과 같은 이유). `resizable: true` 설정 자체와 기존 표 컨트롤 회귀 없음만 자동화로 검증하고, 실제 드래그 동작은 실제 화면에서 사용자가 확인한다.
