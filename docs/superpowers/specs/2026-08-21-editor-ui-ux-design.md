# 에디터 화면 UI/UX 설계

- 날짜: 2026-08-21
- 서브 프로젝트: SFOOD IT Editor 기획/설계 보강 — 2차(화면 UI/UX + 개인 에디터 기능 강화, 원래 별도 예정이었으나 한 번에 다루기로 함)
- 관련 문서: [docs/product/requirements.md](../../product/requirements.md), [docs/product/architecture.md](../../product/architecture.md), [docs/product/prd.md](../../product/prd.md), [docs/product/data-spec.md](../../product/data-spec.md), [docs/product/design.md](../../product/design.md), 1차 설계: [2026-08-21-confluence-content-structure-design.md](./2026-08-21-confluence-content-structure-design.md)

## 배경

1차 설계(콘텐츠 구조)는 Confluence 저장 방식만 다뤘고, 화면/UI/UX는 기존 최소 구현(제목+textarea, 버튼 몇 개) 그대로였다. 배포해도 실제로 안 쓰일 위험이 있다는 판단 하에 — 사용자가 이미 익숙한 Notion/Confluence/Medium류 문서 도구와 비교해 상호작용 방식을 다시 설계했다.

## 확정된 방향

1. **WYSIWYG 에디터로 전환.** 지금의 Markdown textarea를 버리고, 서식이 그대로 보이는 리치 에디터로 바꾼다.
2. **문서 원본을 에디터 고유 포맷(JSON)으로 저장.** Markdown이 표현 못 하는 서식(색상, 하이라이트, 표 병합)까지 쓰고 싶다는 요구가 있어, Markdown을 중간 형식으로 거치지 않고 에디터 JSON을 그대로 저장한다.
3. **저장은 수동 유지.** 자동저장은 도입하지 않는다 — 기존 버전 기반 동시수정 충돌(409) 처리를 그대로 재사용할 수 있어 설계가 단순하다.
4. **이미지는 붙여넣기/드래그앤드롭으로 즉시 업로드·삽입.**
5. **태그는 칩(chip) UI로 입력.**
6. **문서함 화면에 상태 뱃지(초안/게시됨) + 태그 + 태그 필터를 표시.**
7. **게시 설정 화면은 뷰어별 카드 목록** — 지금은 카드 1개(Tech Blog)뿐이지만, 뷰어가 늘어나도 화면 구조를 다시 설계할 필요가 없다.
8. **상호작용 패턴을 Notion/Confluence 방식으로.** 상단 고정 포맷 툴바 대신 텍스트 선택 시 뜨는 버블 툴바, `/` 슬래시 삽입 메뉴, 항상 떠 있는 좌측 사이드바(문서 목록+태그 필터)로 구성한 앱 셸(app shell) 구조로 바꾼다. 제목은 별도 입력창이 아니라 본문 위 큰 텍스트로 보이게 한다(구현은 가벼운 별도 입력 유지, 시각적으로만 통합).
9. **사내 디자인 시스템 `@sfood/ui`를 도입한다.** 화면을 직접 마크업하지 않고 이 라이브러리의 컴포넌트/템플릿을 쓴다. 자세한 도입 방법과 컴포넌트 매핑은 [docs/product/design.md](../../product/design.md)에 정리했다.

## 1차 지원 서식 범위 (YAGNI)

"Confluence가 표현 가능한 서식 전체"는 무한히 넓어질 수 있어 아래로 범위를 좁혔다. 목록 밖의 서식(목차 매크로, 그 외 Confluence 매크로 등)은 이번 설계에서 제외하고 필요해지면 그때 추가한다.

- 제목(H1~H3), 굵게/기울임/취소선, 글머리·번호 목록, 인용문, 코드블록, 링크, 이미지
- 글자 색상, 하이라이트(배경색)
- 표 + 셀 병합/분할
- Confluence 패널 매크로 3종(정보/경고/노트)

## 접근법 비교 — 에디터 엔진 & 저장 형식

**채택 — TipTap(ProseMirror 기반) + 에디터 JSON을 원본으로 저장**
React/Next.js 생태계에서 가장 성숙한 WYSIWYG 엔진이며, 글자색·하이라이트·표 병합이 공식 익스텐션으로 이미 있어 직접 구현할 부분이 적다. 슬래시 메뉴는 TipTap의 `@tiptap/suggestion` 유틸리티(멘션 기능과 같은 메커니즘)로, 버블 툴바는 `BubbleMenu` 컴포넌트로 구현 가능해 추가 라이브러리 없이 해결된다.

**기각 — Markdown을 원본으로 유지하되 확장 문법 사용**
색상·하이라이트를 비표준 Markdown 확장 문법으로 표현하는 방식도 있으나, 결국 "Markdown이 아닌 것"을 다루게 되면서 Markdown 원본의 이점(가독성, 표준성)을 잃는다. 에디터 JSON을 원본으로 쓰는 게 더 일관적이다.

## 데이터 모델 변경 (1차 설계 대비)

1차 설계 및 그 구현 플랜은 아직 코드로 실행되지 않았으므로, 지금 바꿔도 데이터 마이그레이션 부담이 없다.

- `sourceMarkdown: { markdown: string }` → **`sourceDocument: { doc: JSONContent }`**(TipTap/ProseMirror JSON 트리)로 대체한다.
- `authorMeta`, `publishMetadata`(뷰어별 구조), 태그(Confluence 라벨), Restriction 기반 숨김 메커니즘 등 1차 설계의 나머지 내용은 그대로 유효하다 — 바뀌는 건 "문서 본문 원본을 어떤 형태로 저장하는가"뿐이다.
- Confluence 페이지의 `body`(storage format)는 여전히 "렌더링용 산출물" 위치를 유지한다. 새 변환기(`src/lib/editor/tiptap-to-storage.ts`, 가칭)가 TipTap JSON을 순회하며 노드/마크 타입별로 Confluence storage format(XHTML)을 만든다.
  - `heading(level)` → `<h1>`~`<h3>`
  - `bold`/`italic`/`strike` 마크 → `<strong>`/`<em>`/`<s>`
  - `textStyle` 마크의 color/backgroundColor → `<span style="color:...;background-color:...">`
  - `bulletList`/`orderedList`/`listItem` → `<ul>`/`<ol>`/`<li>`
  - `blockquote` → `<blockquote>`, `codeBlock` → `<pre><code>`
  - `table`/`tableRow`/`tableCell`(colspan/rowspan 포함) → `<table><tr><td colspan=".." rowspan="..">`
  - 패널 노드(정보/경고/노트) → `<ac:structured-macro ac:name="info|warning|note">...</ac:structured-macro>`
  - 이미지 노드는 1차 설계와 동일하게 `confluence-attachment://{filename}` 참조 → `<ac:image>`
- 기존 `markdownToStorageFormat`(marked 기반)은 더 이상 쓰이지 않는다. `buildAttachmentImageReference`(첨부 참조 스킴)는 그대로 재사용한다.

## 화면 설계

### 앱 셸 (신규)
`src/app/editor/layout.tsx`에 좌측 사이드바(`@sfood/ui`의 `Sidebar`)를 두고, `/editor`·`/editor/new`·`/editor/[pageId]`·`/editor/[pageId]/publish`가 모두 이 레이아웃 하위에서 렌더링된다(Next.js 중첩 레이아웃 — 사이드바가 페이지 전환마다 다시 그려지지 않는다).

- 사이드바 내용: 문서 목록(제목, `StatusBadge`로 초안/게시됨 표시, `Tag`로 태그 표시), 상단에 태그 필터(`ChipGroup`, 클라이언트 사이드 필터링), "새 문서" 버튼. 현재 열려 있는 문서는 강조 표시.
- `/editor`(문서함)는 사이드바만 있고 본문 영역은 `EmptyState`("문서를 선택하거나 새로 작성하세요")를 보여준다.

### 편집 화면 (`/editor/new`, `/editor/[pageId]`)
- 제목: 본문 위에 큰 글자로 보이는 별도의 가벼운 입력(문서 트리에 포함하지 않음 — 포함하면 추출/중복 방지 로직이 늘어나 구현이 복잡해지는데, 보이는 결과는 같아서 굳이 그렇게 하지 않는다).
- 태그: 제목 아래, 본문 위. 칩 UI로 입력(Enter/쉼표로 확정), 문서함에서 이미 쓰인 태그를 자동완성 후보로 보여준다.
- 본문: TipTap 에디터. 새 줄에서 `/`를 입력하면 슬래시 메뉴(제목/목록/표/이미지/코드블록/정보·경고·노트 패널)가 뜨고, 텍스트를 선택하면 버블 툴바(굵게/기울임/취소선/글자색/하이라이트/링크)가 뜬다. 표 안에 커서가 있을 때는 셀 병합/분할 버튼이 추가로 노출된다.
- 이미지: 에디터 영역에 드래그하거나 클립보드에서 붙여넣으면 자동 업로드되고 그 위치에 바로 삽입된다(업로드 중 로딩 표시).
- 하단 버튼: 저장(`Button variant="primary"`, 1개만), 삭제(`Button variant="danger"`, 클릭 시 `window.confirm()` 대신 `Modal` 확인창), 게시 설정 이동(`Button variant="secondary"`). 저장은 수동, 저장 성공/실패는 `Toast`로 안내(기존 인라인 에러 텍스트 대체). 버전 충돌(409) 처리는 1차 설계·기존 코드와 동일하게 유지한다.

### 게시 설정 화면 (`/editor/[pageId]/publish`)
- 최상단에 문서 전체 게시 토글(`Switch`).
- 그 아래 뷰어별 `Card` 목록. 지금은 "Tech Blog" 카드 1개, 카드 안에 그 뷰어만의 slug·메타 설명(`FormField` + `Input`/`Textarea`)이 있다. 뷰어가 늘어나면 카드가 하나 더 생기는 구조.

### 로그인 화면 (`/login`)
`@sfood/ui`의 `LoginSimple` 템플릿으로 교체한다. 이메일/비밀번호 로그인이 아니므로 `onLogin`/`onSignup` 콜백은 쓰지 않고, 로고·버튼 슬롯만 커스터마이징해 "MS 계정으로 로그인" 버튼(AX Auth 리다이렉트 링크)을 넣는다.

## 디자인 시스템 도입

`@sfood/ui`(사내 컴포넌트 라이브러리)를 새로 설치하고, 기존 `globals.css`의 커스텀 클래스를 단계적으로 대체한다. Tailwind CSS도 이 프로젝트에 처음 도입된다(`@sfood/ui`가 Tailwind 프리셋 기반). 설치 방법, 토큰 레퍼런스, 화면별 컴포넌트 매핑, Do/Don't 가이드는 [docs/product/design.md](../../product/design.md)에 정리했고, `CLAUDE.md`에도 "UI 컴포넌트는 `@sfood/ui`를 쓴다"는 지침을 추가했다.

## 기존 산출물에 대한 영향

이 설계는 1차 설계(콘텐츠 구조)가 승인된 뒤, 그 구현이 착수되기 전에 나온 것이라 아직 코드 충돌은 없다. 다만 아래 문서는 이 설계에 맞춰 갱신이 필요하다.

- `docs/product/data-spec.md`의 Document 엔티티: `sourceMarkdown` property → `sourceDocument` property로 교체.
- `docs/product/architecture.md`의 기술 스택: TipTap, `@sfood/ui`, Tailwind CSS 추가.
- `docs/product/prd.md`: 화면 정의 표를 이 설계 기준으로 갱신, "개인 에디터 기능 강화(2차)" 항목을 이 설계로 구체화.
- `docs/superpowers/plans/2026-08-21-confluence-content-structure-implementation.md`: Task 10~12(`publish.ts`의 문서 본문 관련 부분, `PublishForm.tsx`)가 이 설계와 어긋나지 않는지 다시 확인하고 필요한 만큼 다시 쓴다. 게시 생명주기(이동·제한 토글) 자체는 이 설계와 무관하게 유효하다.

## 검증이 필요한 가정

- `ChipGroup`(`@sfood/ui`)이 자유 텍스트 입력 방식의 태그 추가를 지원하는지, 선택 전용인지 — Storybook의 해당 컴포넌트 스토리를 구현 전에 직접 확인한다. 지원하지 않으면 `Input` + `ChipGroup`(표시용)을 조합한 커스텀 입력을 만든다.
- 기존 브랜드 색상(`#e4002b`)을 `@sfood/ui` 토큰에 그대로 반영할지, 디자인 시스템 기본값을 쓸지 — 디자인 담당자 확인 필요.

## 범위 밖

- 목차(TOC) 매크로, 1차 지원 목록 밖의 그 외 Confluence 매크로.
- 자동저장.
- 모바일 반응형·다크 모드(요구사항으로 제기되지 않음 — 필요해지면 별도로 다룬다).
