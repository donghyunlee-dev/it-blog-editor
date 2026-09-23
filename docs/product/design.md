# 🎨 디자인 시스템 적용 가이드 — SFOOD IT Editor

## 개요
- 사내 디자인 시스템 `@sfood/ui`(Storybook 문서: https://sfood-design-system.vercel.app/?path=/docs/docs-getting-started--docs)를 이 프로젝트에 도입한다.
- 지금까지 `src/app/globals.css`에 직접 만들어 쓰던 커스텀 클래스(`.page`, `.card`, `.button-primary` 등)는 `@sfood/ui` 컴포넌트와 토큰으로 단계적으로 대체한다.
- 관련 문서: [requirements.md](./requirements.md), [architecture.md](./architecture.md), [prd.md](./prd.md), 화면 설계는 [docs/superpowers/specs/2026-08-21-editor-ui-ux-design.md](../superpowers/specs/2026-08-21-editor-ui-ux-design.md) 참고.

## 정책 레퍼런스 — 폰트·사이즈·컬러톤·간격·영역별 기준

이 절은 변경 이력이 아니라 **지금 이 순간 적용돼 있는 규칙**만 정리한다. 다른 세션에서 새
화면/컴포넌트를 만들 때 이 절부터 확인한다 — 왜 이렇게 정했는지 배경이 궁금하면 문서 아래
쪽의 해당 절(같은 키워드로 검색)을 참고한다. 이 절의 서술과 실제 코드가 다르면 코드가
맞고, 이 문서를 갱신해야 한다(CLAUDE.md의 "실제 구현 우선" 원칙과 동일).

### 1. 폰트

- 본문 폰트는 **Pretendard Variable**이다. `pretendard` npm 패키지를 `next/font/local`로
  self-host하고(`src/app/layout.tsx`의 `pretendard` 상수, CSS 변수 `--font-pretendard`),
  `<html>`에 그 `variable` 클래스를 심어 전역에서 쓴다. 사내 실서비스
  `ax-wiki.s-food.ai`와 동일한 폰트다.
- `globals.css`의 `body` 규칙 하나가 스택 전체(`var(--font-pretendard), "Malgun Gothic",
  "맑은고딕", -apple-system, system-ui, Roboto, "Helvetica Neue", sans-serif`)를 정의한다.
  **새 컴포넌트에서 폰트를 따로 지정하지 않는다** — 항상 body에서 상속받는다.
- 기본 굵기는 `font-weight: 500`(UI 크롬 전반). 예외는 리치 텍스트 본문(`.ProseMirror`)뿐이다
  — 라이트 모드 400, 다크 모드 450(다크 배경에서 얇은 글자가 더 흐려 보이는 것을 보정).
- 헤딩(`h1`~`h3`, `@layer base`)은 전역적으로 `font-weight: 700`, `letter-spacing: -0.18px`다.

### 2. 사이즈 (글자 크기 스케일)

텍스트 크기는 아래 표 밖의 임의 값(`text-lg`, `text-xl`, `text-3xl` 등)을 새로 쓰지 않는다.

| 그룹 | 크기 | 대상 |
|---|---|---|
| UI 크롬 | `text-sm`(14px) | 헤더 버튼/링크, 태그, 안내·풋터 문구, 사이드바 목록 행, 폼 라벨 등 화면을 구성하는 모든 요소 |
| 문서 제목 | `text-4xl`(36px) `font-bold` | `DocumentEditor`의 제목 입력(`TitleTextarea`) — 본문 리치 텍스트 H1과 크기를 맞춰, 사용자가 본문에 제목1을 넣어도 문서 제목보다 커지지 않게 한다 |
| 리치 텍스트 본문 | 표준 `prose` 스케일 — 본문 16px, H1 36px/H2 24px/H3 20px | `RichTextEditor`의 `EditorContent`(`className="prose max-w-none"`) — `prose-sm`으로 낮추지 않는다 |
| 소개/랜딩 화면 타이틀 | `text-2xl`(24px), `Typography variant="h2"` | 문서가 아닌 소개성 화면(`/editor` 첫 화면 등)의 큰 타이틀 |

### 3. 컬러톤

- 색상은 항상 `@sfood/ui` 토큰(CSS 변수)만 참조한다. hex/Tailwind 팔레트 클래스 하드코딩
  (`text-gray-900`, `#e4002b` 등) 금지, `--color-*` 토큰 재정의 금지.
- 브랜드 원색은 `--color-brand`(`#d65050`, 라이트/다크 공통). 더 어두운 텍스트가 필요하면
  `--color-brand-hover`(`#b02929`), 아주 옅은 배경엔 `--color-brand-subtle`/`--color-brand-light`.
- **브랜드색을 배경에 옅게 섞을 때**는 하드코딩 대신
  `color-mix(in srgb, var(--color-brand) N%, var(--color-surface))` 패턴을 쓴다. 기존 예:
  `.sidebar-row-active`(10%, 활성 행), `.sidebar-row-hover`(5%, 활성 행보다 옅은 호버,
  2026-09-14 P13-2), `.spotlight-card`(6%, 소개 화면 대표 기능 카드),
  `.spotlight-icon-chip`(15%, transparent와 믹스).
- **작은 텍스트에 브랜드색을 직접 쓸 때는 라이트/다크 각각 대비를 실측한다.**
  `--color-brand`를 그대로 쓰면 밝은 배경 위에서 대비가 미달(예: 3.8:1, 기준 4.5:1)일 수
  있다 — 라이트에서는 `--color-brand-hover`, 다크에서는 `--brand-300`처럼 테마별로 다른
  톤을 쓴다(`.spotlight-accent-text` 패턴 재사용).
- 다크 모드 오버라이드는 항상 두 조건을 함께 짝짓는다:
  `@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { ... } }` (OS 다크+
  앱이 명시적으로 라이트를 고르지 않은 경우) **와** `[data-theme="dark"] { ... }`(사용자가
  ThemeToggle로 명시 선택). 하나만 쓰면 "OS는 다크, 앱은 라이트로 명시 선택" 같은 조합에서
  깨진다.
- 모든 텍스트/아이콘 색은 WCAG AA(일반 텍스트 4.5:1, 큰 텍스트·아이콘류 3:1)를 만족해야
  한다. 새 색상 조합을 추가할 때 "괜찮아 보인다"로 판단하지 않고, 상대휘도 계산(브라우저
  `getComputedStyle`로 실제 렌더링 색을 읽어 계산)으로 직접 검증한다.
- `@sfood/ui` 컴포넌트 자체가 라이트 전용 하드코딩 팔레트를 쓰면(`Alert`, `Toast`) 컴포넌트
  소스를 고칠 수 없으므로, 실제 렌더링되는 유틸리티 클래스를 대상으로 `!important` 오버라이드로
  대응한다(`globals.css`의 `[role="alert"].bg-red-50` 계열, `.fixed.bottom-4.right-4.z-50 >
  .text-white` 참고).

### 4. 간격 (Spacing)

- 편집 화면 페이지 여백: `px-6`(24px, 좌우) `py-10`(40px, 위아래).
- **위계가 다른 영역 사이는 간격 크기를 다르게 준다** — 모든 블록을 같은 gap으로 나열하지
  않는다. `DocumentEditor` 기준(2026-09-14, P12-2 갱신 — 태그 입력이 제목 아래에서 본문
  하단으로 이동):
  - 제목 → 본문: `mt-6`(24px) — 여기부터 "쓰는 영역"이라는 전환이라 넓게
  - 본문 → 태그: `mt-4`(16px) — 태그는 이제 "검색용 가벼운 키워드"(Phase 12)라 본문보다
    낮은 위상으로, 풋터와 비슷한 톤의 간격을 준다
  - 태그 → 풋터: `mt-4`(16px) + `border-t` — 태그·풋터 모두 "본문 다음의 부가 정보" 묶음
- 리스트 행 사이는 구분선(`divide-y`) 대신 `gap-0.5`(2px) + hover 배경만으로 구분한다
  (사이드바 문서 목록) — 항목이 많은 목록에서 구분선은 시각적 잡음이 된다.
- 카드/모달 내부 패딩은 `Card`/`Modal`의 기본 `padding` prop(`sm`/`md`/`lg`)을 그대로 쓰고
  임의로 재정의하지 않는다.

### 5. 영역별 기준

**헤더(공통)**
- 사이드바 상단 브랜딩 행과 `DocumentEditor` 상단 헤더는 항상 `h-14`(56px) **고정** 높이를
  쓴다 — 내용물 높이 계산에 맡기지 않는다(두 헤더가 나란히 있을 때 라인이 어긋나 보인 사례
  있음).
- `DocumentEditor` 헤더는 `sticky top-0`이라 스크롤 중에도 계속 보인다.
- 헤더 1차 액션(저장)만 `variant="primary"`, 파괴적 액션(삭제)은 `variant="danger"`, 나머지
  (게시 설정 등)는 `variant="secondary"` — 한 화면에 `primary`는 항상 1개(아래 Do/Don't
  참고).
- 아이콘만 있는 버튼은 반드시 `aria-label`+`title`을 함께 준다. 파괴적 액션 버튼은 인접
  버튼과 `<span className="h-6 w-px bg-border" />` 구분선으로 물리적으로 떨어뜨려 오클릭을
  막는다.

**사이드바 (`EditorSidebar`/`EditorShell`)**
- 폭: 기본 256px, 최소 220px(브랜딩 행이 잘리지 않는 실측 최소 폭 + 여유), 최대 440px.
  `localStorage`에 폭/접힘 상태를 저장해 세션 간 유지한다.
- 데스크톱 전용으로 드래그 리사이즈(클릭 히트 영역 10px, 시각적으로는 1px 선이 hover 시에만
  브랜드색으로 드러남)와 햄버거 아이콘 접기/펼치기를 지원한다. 모바일은 별개 상태(오프캔버스
  드로어)로만 여닫는다 — 둘을 섞지 않는다.
- 브랜딩 행(로고+제품명)은 `/editor`(메인 화면)로 이동하는 링크다.
- 문서 목록 행: `rounded-card py-1 pl-2 pr-2`(추가 왼쪽 들여쓰기는 `<li>`의 inline style이
  담당). 2026-09-14(P13-1) — P8-2 때 `py-1.5`(6px)에서 `py-2`(8px)로 올렸다가, 문서가
  적어도 목록이 화면 상당 부분을 차지한다는 지적으로 다시 `py-1.5`로 되돌렸다(폴더 행도
  같은 높이로 함께 조정). 2026-09-22(P17-21) — 문서가 많아지면 리스트가 길어져 화면에
  보이는 문서 수가 적다는 지적으로 `py-1`(4px)까지 한 번 더 줄였다(폴더 행·공유받은
  문서 행도 함께 조정). 게시 상태는 텍스트가 아니라 아이콘(게시됨=속이 찬 체크 원,
  초안=점선 원)+색으로만 표시하고, `role="img"`+`aria-label`로 의미를 남긴다.
- **행 왼쪽 안쪽 여백 + 호버 배경(2026-09-14, P13-2)**: `pl-2`가 없어 상태 아이콘이 선택/호버
  배경 박스 왼쪽 끝에 바로 붙어 보인다는 지적으로 문서 행에 `pl-2`(폴더 행은 `pl-1`)를
  추가했다. 별개로, 폴더·문서 행의 `hover:bg-surface-raised`가 라이트 모드에서 아무 효과가
  없다는 것도 발견했다 — `node_modules/@sfood/ui/tokens/semantic.css`를 보면 라이트 모드
  `:root`에서 `--color-surface-raised`가 `--color-surface`와 같은 값(`var(--white)`)이다.
  위 "브랜드색을 배경에 옅게 섞을 때" 절의 `.sidebar-row-active`가 이미 같은 문제를 겪어 `color-mix()`로 직접
  배경을 만드는 방식을 썼는데, 호버에는 그 처리가 없었다. 같은 방식으로
  `.sidebar-row-hover:hover { color-mix(in srgb, var(--color-brand) 5%, var(--color-surface)) }`
  를 `globals.css`에 추가하고, 폴더 행·문서 행(내 문서·공유받은 문서)의 `hover:bg-surface-raised`를
  이 클래스로 교체했다(선택 상태의 10% 믹스보다 옅은 5%). 사이드바의 다른
  `hover:bg-surface-raised` 사용처(아이콘 버튼 등)는 같은 문제가 있을 수 있으나 이번 범위에서는
  다루지 않았다 — 별도 조사 필요.
- **깊이별 들여쓰기 제거 + 폴더/문서 아이콘 왼쪽 위치 정렬(2026-09-22, P17-24)**: 폴더
  트리 깊이가 늘어날수록 `INDENT_BASE_PX + depth * INDENT_STEP_PX`(깊이당 +20px)로
  왼쪽 들여쓰기를 키우던 것을, 페이지 제목이 보일 공간이 줄어든다는 지적으로 깊이와
  무관한 고정 `INDENT_BASE_PX`(8px)로 되돌렸다 — 폴더/문서는 앞의 아이콘(화살표·폴더
  ·게시 상태)만으로도 구분되므로 깊이별 들여쓰기가 굳이 필요 없다는 판단. 같은 요청의
  후속으로, 폴더 행의 안쪽 왼쪽 여백을 문서 행과 같은 `pl-2`(기존 `pl-1`)로 맞춰 폴더의
  접힘/펼침 화살표와 문서의 게시 상태 아이콘이 항상 같은 x좌표(8px 들여쓰기 + 8px
  안쪽 여백 = 16px)에서 시작하도록 했다.

**문서 편집 캔버스 (`DocumentEditor` + `RichTextEditor`)**
- `Card`로 감싸지 않는다 — 페이지 전체가 에디터 캔버스처럼 보이게 한다(로그인 화면도 같은
  원칙, 아래 참고).
- 본문 최대 폭은 `max-w-[820px]`(사내 문서 뷰어 SF-Note 실측 기준).
- 제목/본문 모두 **포커스 시에만** 배경색이 옅게(`--color-surface-raised`) 깔리는 방식으로
  "수정 가능 영역"을 알린다 — `padding` + 같은 크기의 음수 `margin`으로 평소 레이아웃은
  그대로 유지한다(포커스 전 상태에서 테두리·그림자로 먼저 티내지 않는다).
  **주의(2026-09-23, P17-25)**: 이 상쇄 패턴은 요소의 `width`가 `auto`(기본 block
  요소 — 본문의 `.ProseMirror`)일 때만 음수 마진만큼 박스가 저절로 넓어져 좌우
  대칭이 맞는다. `width: 100%`처럼 값이 고정된 요소(제목 `<textarea>`, `w-full`)에
  이 패턴을 그대로 쓰면 마진만큼 옆으로 밀리기만 하고 박스가 넓어지지 않아, 한쪽
  끝(패딩만큼)이 짧아진다 — 실제로 제목 텍스트 영역이 본문보다 16px 좁았던 버그의
  원인이었다. `width: 100%` 계열에 이 패턴을 쓸 때는 `w-[calc(100%+<마진 합>)]`처럼
  마진으로 줄어드는 만큼을 폭에 미리 더해야 한다(`DocumentEditor.tsx`의
  `TitleTextarea` 참고).
- 빈 문서에는 `@tiptap/extension-placeholder`로 안내 문구를 띄우고, 캔버스 최소 높이는
  매직넘버 고정값이 아니라 `calc(100dvh - 220px)`(뷰포트에서 헤더/제목/태그/여백을 뺀
  나머지)로 계산한다.

**소개/랜딩 화면 (`/editor` 첫 화면)**
- 문서가 없는 상태를 빈 화면으로 방치하지 않고, 이 서비스를 처음 보는 사람에게 제품을
  소개하는 화면으로 취급한다.
- 여러 기능을 나열할 때 전부 같은 무게로 두지 않는다 — 가장 차별화된 기능 하나를
  `.spotlight-card`(브랜드색을 옅게 섞은 배경)로 먼저 보여주고, 나머지는 그보다 작은 보조
  카드 그리드(`Card` 컴포넌트, `grid-cols-1 sm:grid-cols-2`)로 내려 시각적 위계를 만든다.

**모달**
- 확인이 필요한 삭제 등은 `Modal`(+ `footer`에 취소/확인 버튼)을 쓴다. `window.confirm()`
  금지.
- 내용이 토글/입력 필드 여러 개로 복잡하면 `size="lg"`, 문장 한두 줄이면 기본(`size="md"`).
- 설정류 모달(게시 설정 등)은 별도 "저장" 버튼을 두지 않고 각 필드 변경 시 즉시 저장한 뒤
  `role="status" aria-live="polite"`로 저장 상태를 알린다. `Switch`처럼 "즉시 반영"을
  암시하는 컨트롤을 쓸 거면 실제로 즉시 저장되게 만든다 — "나중에 저장" 버튼과 짝짓지
  않는다.

**포커스 · 버튼 공통**
- 클릭 가능한 모든 요소는 `cursor: pointer`와 `:focus-visible { outline: 2px solid
  var(--color-brand); outline-offset: 2px; }`를 갖는다. `rounded-btn` 클래스(모든
  `Button`과 버튼형 링크가 가짐)가 이를 전역으로 제공하므로, 새 버튼형 요소는 이 클래스를
  그대로 재사용한다 — 직접 포커스 스타일을 새로 정의하지 않는다.

## 설치 및 설정

Storybook의 "Getting Started" 문서 기준. 실제 설치는 구현 플랜(Task로 정리)에서 진행한다.

**1. 설치**
```bash
npm install @sfood/ui
```
`@sfood/ui`는 public npm 레지스트리에 배포되어 있어 별도 저장소 접근 권한 없이 설치할 수 있다.

**2. Tailwind 설정** — 이 프로젝트는 아직 Tailwind CSS를 쓰지 않으므로, `@sfood/ui` 도입 시 Tailwind 자체도 함께 새로 설치해야 한다. 실제 설치된 버전은 Tailwind v4(`tailwindcss@^4.3.3`)이고, `@sfood/ui/tailwind.config.js`는 v3 형식의 preset이다.

```js
// tailwind.config.js — v3 형식 preset은 그대로 두되, v4가 이를 읽으려면
// globals.css 쪽에서 반드시 `@config`로 명시적으로 불러와야 한다(아래 참고).
import sfoodPreset from '@sfood/ui/tailwind.config.js'

export default {
  presets: [sfoodPreset],
  content: [
    './src/**/*.{ts,tsx}',
    './node_modules/@sfood/ui/dist/**/*.js',
  ],
}
```

> **v4 주의사항 (Task 최종 리뷰 fix wave에서 확인된 사항, C1)**: Tailwind v4는 `tailwind.config.js`를
> 더 이상 자동으로 찾아 읽지 않는다. `content`가 아니라 `@source`로 스캔 대상을 지정하고,
> `node_modules`는 v4에서 기본적으로 스캔 대상에서 제외되므로(v3의 `content` 배열과 다르게)
> `@sfood/ui`처럼 `node_modules`에 설치된 패키지의 클래스를 스캔하려면 별도로 `@source`를
> 추가해야 한다. v3 형식 `presets` config를 계속 쓰려면 `@config`로 명시적으로 로드해야
> 하며, 이 지시어들을 빠뜨리면 빌드는 에러 없이 성공하지만 `bg-brand`/`border-border`/
> `rounded-btn`/`text-on-brand` 등 모든 토큰 유틸리티 클래스가 생성되지 않는다(컴파일된
> CSS에 아예 존재하지 않음 — 런타임 에러도, 콘솔 경고도 없어 알아채기 어렵다). 이 프로젝트의
> `src/app/globals.css`는 `@import "tailwindcss";` 바로 다음에 아래 세 줄을 추가해 이를
> 해결한다:
> ```css
> @import "tailwindcss";
> @config "../../tailwind.config.js";
> @source "../../node_modules/@sfood/ui/dist";
> @plugin "@tailwindcss/typography";
> ```
> (`@plugin "@tailwindcss/typography"`는 에디터 화면의 `prose` 클래스를 위한 것으로, C1과
> 별개의 이유로 필요하지만 같은 자리에 함께 둔다.) 앞으로 이 프로젝트에 새 Tailwind 설정을
> 추가하거나 마이그레이션할 때, 이 세 지시어를 다시 빠뜨리지 않도록 주의한다.

**3. 글로벌 CSS**

> **v4 주의사항 2 (2026-08-25 UI 진단에서 발견, C2)**: Storybook 안내대로
> `@sfood/ui/global.css` 전체를 import하면 그 파일 내부의 `@tailwind base/components/utilities`가
> 이 프로젝트의 Tailwind 컴파일(`globals.css`의 `@import "tailwindcss"`)과는 별개의 두 번째
> 컴파일을 만들어 내고, 그 결과물이 `@layer` 밖(unlayered)에 쌓인다. CSS Cascade Layers
> 규칙상 레이어 밖 규칙은 특정성과 무관하게 모든 레이어드 규칙(반응형 variant 포함)을
> 이겨 버려서, `md:hidden` 같은 반응형 클래스가 데스크톱 폭에서도 안 먹히거나 브랜드 컬러
> 재정의가 조용히 무력화되는 등 원인을 알기 어려운 결함으로 이어진다. 대신 토큰 CSS만
> 직접 불러온다:
> ```ts
> // src/app/layout.tsx
> import '@sfood/ui/tokens/base.css'
> import '@sfood/ui/tokens/semantic.css'
> import './globals.css'
> ```
> 나머지 Tailwind 유틸리티는 이 프로젝트의 단일 컴파일이 `@source`로 `@sfood/ui/dist`를
> 스캔해 정상적으로(레이어 안에) 생성한다. `@sfood/ui/global.css`의 `body{ background-color,
> color, font-family, font-smoothing }` 규칙은 이제 `globals.css`의 `body` 규칙에서 직접
> 선언한다(폰트만 이 프로젝트 값으로 교체).

**4. 사용 예시(email/password 로그인 화면 — Storybook 기준)**
```tsx
import { LoginSimple } from '@sfood/ui'

export default function App() {
  return (
    <LoginSimple
      logo={<span className="text-2xl font-bold text-brand">SFOOD IT Editor</span>}
      onLogin={(email, password) => console.log(email, password)}
      onSignup={() => {}}
    />
  )
}
```
이 프로젝트는 이메일/비밀번호 로그인이 아니라 AX Auth 리다이렉트 방식이라 위 예시를 그대로 쓸 수 없다.
실제로는 `LoginSimple`/`LoginSplit` 어느 쪽도 쓰지 않는다 — 이유는 아래 "로그인 화면 —
`LoginSimple`/`LoginSplit`을 쓰지 않은 이유 (Task 15 검증)" 참고.

## 이 프로젝트에서 쓸 컴포넌트 매핑

Storybook 사이드바에서 확인한 실제 컴포넌트 목록 중, 이번 화면 설계에서 쓰기로 한 것만 정리한다(전체 목록은 Storybook 사이드바 참고).

| 화면/요소 | 컴포넌트 | 비고 |
|---|---|---|
| 로그인 화면 | 좌: 직접 마크업 브랜드 패널(`Typography` + 자체 제작 SVG `BrandPanelArt`) · 우: 카드 없이 `Typography` + `Alert` + `Button` 토큰 클래스를 입힌 `<a>`만 배경 위에 배치 | `LoginSimple`/`LoginSplit` 둘 다 email/password 폼 전용이라 쓰지 않음(단, `LoginSplit`의 좌/우 레이아웃 구조는 재현) — 아래 "로그인 화면 — `LoginSimple`/`LoginSplit`을 쓰지 않은 이유 (Task 15 검증)" 참고 |
| 좌측 사이드바(앱 셸) | 직접 마크업(`<aside>`) + `StatusBadge`/`Tag`/`EmptyState` + `Button` 토큰 클래스, 문서·폴더 옵션 메뉴는 공통 커스텀 구현 | `Sidebar`·`List`가 이 용도에 맞지 않아 컨테이너와 문서 행은 직접 짜고, 그 안의 개별 요소(상태 뱃지·태그·빈 상태)만 컴포넌트를 쓴다. `ChipGroup`(태그 필터)은 2026-09-14(P12-1)에 제거됨. 문서/폴더 행의 옵션(⋯/...) 메뉴는 `@sfood/ui`의 `DropdownMenu`로 시작했으나(P14-1/P14-2, "이동"→"이동·이력·삭제") 사이드바가 스크롤 컨테이너라 팝업이 잘리는 문제로 P14-3에서 커스텀 구현(`position: fixed`)으로 교체됐고, P15-1에서 폴더 옵션 메뉴("하위 폴더 추가"·"이름 변경"·"삭제")도 같은 `openMenu` state를 공유하도록 합쳐짐 — 아래 "확인된 사항"과 `src/components/editor/EditorSidebar.tsx` 참고 |
| 문서 상태 뱃지(초안/게시됨) | `StatusBadge` | 상태 표시 전용 컴포넌트. `status`(`StatusVariant`)로 색을, `label`로 텍스트를 넘긴다 — `children`은 받지 않는다 |
| 문서 태그 표시 | `Tag` | 편집 화면의 태그 입력 칩은 `Tag`(`onRemove` 포함). 사이드바의 태그 필터(`ChipGroup`)는 2026-09-14(P12-1)에 제거되었다 — 태그는 검색(사이드바 검색·Ctrl+K)의 매칭 대상으로만 쓰인다 |
| 문서 목록 항목 | 직접 마크업(`<ul>`/`<li>`/`Link`) + `StatusBadge` + `Tag` | 기존 `<ul className="doc-list">`를 대체. `List`가 아니라 직접 만든 이유는 아래 "확인된 사항" 참고 |
| 문서함 빈 상태 | `EmptyState` | 기존 `.empty-state` 카드를 대체 |
| 버튼 전체 | `Button` (`variant="primary"/"secondary"/"danger"`) | 한 화면에 `primary`는 1개만 쓰는 원칙(Do/Don't 참고) |
| 폼 필드(게시 설정 등) | `FormField`, `Input`, `Textarea`, `Switch` | 라벨·에러를 `FormField`로 감싸는 패턴 |
| 문서 삭제 확인 | `Modal` | 기존 `window.confirm()`을 대체 |
| 저장 성공/실패 알림 | `Toast`(`useToast()`) | 기존 인라인 `<p className="error-text">`를 대체 |
| 게시 설정의 뷰어별 카드 | `Card` | 뷰어(Tech Blog 등)마다 하나씩 |
| 버블 툴바 / 슬래시 메뉴 위치 지정 | `Popover` | 텍스트 선택 위치·커서 위치에 뜨는 오버레이의 기반으로 사용 |
| 최상단 계정 관리 화면(P5-7) | `ListSearchTable` | "목록+검색" 요구사항과 정확히 일치하는 템플릿이라 그대로 씀(전체 화면 템플릿, `min-h-screen` 포함). 컬럼 렌더러 안에서 접속 허용/차단 표시에 `StatusBadge`(`status="active"/"inactive"`)를 함께 씀. 제네릭 제약(`T extends Record<string, unknown>`) 때문에 행 타입은 인터페이스가 아니라 `Record<string, unknown> & {...}` 교차 타입으로 선언해야 한다(`src/app/editor/accounts/page.tsx` 참고) |
| 공유 팝업(P6-2/P6-3) | 직접 마크업(`<input type="search">`) + `Button`(검색 결과 "추가") + `Tag`(공유 중인 대상, `onRemove`로 제거 버튼) + `Toast` | 검색 입력·검색 결과 목록은 이 프로젝트에 전용 컴포넌트가 없어 사이드바 문서 검색과 같은 방식으로 직접 짰다. "공유 중인 대상" 목록은 애초에 계획(prd.md 화면 정의)한 대로 `Tag`(`onRemove` 포함)로 구현 — `× 버튼`의 접근성 이름은 `removeLabel`로 "이름(이메일) 공유 해제"를 넘긴다. `Tag`의 `onRemove` 버튼이 텍스트와 같은 `<span>` 안에 있어, 이 화면을 테스트할 때 `getByText`로 정확히 일치시키면 실패한다(`×` 문자가 textContent에 섞임) — 라벨로 시작하는지(정규식)로 확인해야 한다(`src/components/editor/ShareForm.test.tsx` 참고) |

## 사이드바 앱 셸 — `Sidebar`/`List`를 쓰지 않은 이유 (Task 14 검증)

Storybook 문서만 보고 이 표를 채웠을 때는 `Sidebar`를 사이드바 컨테이너로, `List`를 문서 목록 항목으로
쓸 계획이었다. 실제 구현(Task 14, `src/components/editor/EditorSidebar.tsx`) 중 `@sfood/ui`의 타입
정의(`node_modules/@sfood/ui/dist/index.d.ts`)와 런타임 구현을 직접 확인해 보니 둘 다 이 용도에 맞지
않는 것으로 확인되어, 다음 사람이 같은 시도를 반복하지 않도록 이유를 남긴다.

- **`Sidebar`는 `children`을 받지 않는다.** 시그니처가
  `Sidebar({ items, className }: { items: SidebarItem[]; className?: string })`이고,
  `SidebarItem = { label: string; icon?: ReactNode; href?: string; active?: boolean }`이다. 각 항목을
  `<a href>{icon}{label}</a>`로만 렌더링하는 평평한(flat) 네비게이션 링크 목록이라, 문서 하나에
  상태 뱃지 + 태그 여러 개 + 태그 필터 칩까지 넣어야 하는 이 화면에는 슬롯 자체가 없다. 그래서 사이드바
  바깥 컨테이너(`<aside>`)는 직접 마크업으로 짜고, `Sidebar`가 내부적으로 쓰는 것과 같은 토큰 클래스
  (`bg-surface`, `border-border`, `rounded-btn` 등)만 재사용해 시각적 일관성을 맞췄다.
- **`List`는 행마다 링크(href)를 지원하지 않는다.** 시그니처가
  `List({ items, onItemClick, className }: { items: ListItem[]; onItemClick?: (item: ListItem) => void; ... })`이고,
  각 `ListItem`(`{ id, primary, secondary?, leading?, trailing? }`)을 `<li onClick={...}>`로만
  렌더링한다. 실제 페이지 이동을 붙이려면 `onItemClick` 안에서 `next/navigation`의 `useRouter()`를 써야
  하는데, `useRouter()`는 `AppRouterContext` 프로바이더 없이 호출하면 즉시 예외를 던져 이 프로젝트의
  Vitest/RTL 테스트(라우터 프로바이더로 감싸지 않음)에서 렌더링 자체가 깨진다. 반면 실제 링크
  이동에는 `next/link`의 `<Link>`를 쓰면 라우터 컨텍스트가 없어도 안전하게 렌더링되고
  (`next/link` 소스에 `AppRouterContext` 의존이 없음), Next.js 공식 Vitest 가이드
  (`node_modules/next/dist/docs/01-app/02-guides/testing/vitest.md`)도 이 방식을 예시로 든다. 그래서
  문서 목록 행도 `List` 대신 `<ul>`/`<li>`/`<Link>`로 직접 만들고, `List`가 쓰는 것과 같은 시각적
  규칙(행 패딩, 말줄임, `text-foreground`)만 맞췄다.
- **최종적으로 실제 쓴 `@sfood/ui` 컴포넌트**: 문서 상태 뱃지는 `StatusBadge`, 문서별 읽기 전용 태그
  표시는 `Tag`, 문서가 없을 때는 `EmptyState`. "새 문서" 버튼은 실제 이동이 필요해 `<Link>`로
  만들되, `Button`은 `<button>`만 지원해(href 없음) 대신 `Button variant="primary"`가 쓰는 것과
  같은 토큰 클래스(`bg-brand`, `text-on-brand`, `hover:bg-brand-hover` 등)를 그대로 입혀 "이
  화면의 유일한 1차 액션"이라는 시각적 의미를 유지했다. 태그 필터로 쓰던 `ChipGroup`은
  2026-09-14(P12-1)에 제거됐다(태그는 검색 전용, 위 "사이드바" 절 참고).
- **문서 옵션(⋯) 메뉴 — `DropdownMenu`(`@sfood/ui`)를 쓰다가 커스텀 구현으로 교체한 경위
  (P14-1→P14-3, 2026-09-14)**: 처음엔 `DropdownMenu`(`trigger` + `DropdownItem[]`)를 그대로
  썼다 — 같은 패키지의 `FileExplorer.itemActions`도 같은 패턴("항목별 우측 액션 메뉴")을 쓰고
  있어 재사용이 자연스러웠다(P14-1, "이동" 단일 버튼을 이 메뉴로 대체). 이어서(P14-2) 에디터
  헤더의 "이력"·"삭제" 버튼도 이 메뉴로 옮겨와 이동·이력·삭제 3개 항목이 됐다 — 헤더 쪽
  버튼·모달·핸들러는 모두 제거됐다(`DocumentEditor.tsx`). 그런데 두 가지 위치 문제가 이어서
  발견됐다: (1) `DropdownMenu`가 메뉴를 트리거 기준 `right-0`(왼쪽으로 펼쳐짐)으로 고정
  배치해 문서 제목과 겹쳤고(P14-2에서 CSS로 `left-0` 덮어씀), (2) 그렇게 방향만 바꿔도 메뉴가
  사이드바 밖으로는 안 나가고 "패널 안으로 들어가서 보이지 않는" 문제가 남아 있었다(P14-3,
  사용자 지적 — "z-index를 완전히 밖으로 빼야 할 거 같아"). 원인은 문서 목록을 감싸는
  `<nav overflow-y-auto>`다 — CSS 스펙상 `overflow-y`가 `visible`이 아니면 `overflow-x`도
  `auto`로 강제 계산돼, 이 `<nav>`가 가로로 넘치는 자손(메뉴 팝업)까지 클리핑한다. z-index는
  스태킹 순서만 바꿀 뿐 overflow 클리핑을 뚫지 못한다. `DropdownMenu`엔 팝업을 포탈이나
  `position: fixed`로 그리는 prop이 없어(컴포넌트를 고칠 수도 없어) 결국 사용을 그만두고,
  `EditorSidebar.tsx`에서 팝업을 `<nav>` 바깥 형제 위치에 `position: fixed` + 트리거의
  `getBoundingClientRect()` 좌표로 직접 그리는 커스텀 구현(`openDocumentMenu` state,
  `buildDocumentMenuItems`)으로 교체했다. `role="menu"`/`role="menuitem"` 접근성 역할과
  바깥 클릭·Escape로 닫는 동작은 동일하게 유지했다(스크롤·리사이즈 시에는 앵커 좌표가
  낡아지므로 다시 계산하는 대신 메뉴를 닫는다). 메뉴 항목 hover는 `.sidebar-row-hover`를
  재사용해, `DropdownMenu`가 내부적으로 쓰던 `hover:bg-surface-raised`의 라이트 모드 무효
  문제(P13-2 참고)를 이 팝업에서는 애초에 피해간다.
- **새 문서 생성 진입점 재구성 + 폴더 옵션 메뉴 추가(P15-1, 2026-09-14)**: 폴더 트리(P7-4/
  P7-5)가 생긴 뒤에도 폴더 안에 문서를 바로 만들 방법이 없다는 지적("폴더에서 새문서를
  시작할 방법이 없어. 폴더 버튼에 + 버튼이 하위 폴더로 되어 있기 때문에 폴더 내 문서
  기능이 겹치고 있어")으로 진입점을 다시 짰다. 백엔드(`POST /api/editor/documents`)는 이미
  `folderId`를 받아 생성 시점에 폴더를 배정할 수 있었지만(P7-3) 프론트에서 쓴 적이 없었다 —
  이번 작업은 새 API 없이 그 배선만 완성한다.
  - **폴더 행의 "+"**: 의미가 "하위 폴더 추가"에서 "이 폴더에 새 문서"(`/editor/new?folder={id}`)로
    바뀌었다. 원래 "+"가 하던 일(하위 폴더 추가)과 옆에 있던 이름변경(연필)·삭제(휴지통)
    아이콘 2개는 문서 옵션 메뉴와 같은 패턴의 "..."(폴더 옵션) 메뉴로 옮겨졌다 — 문서/폴더
    두 메뉴는 `openDocumentMenu` state를 `MenuTarget`(`{kind:"document"|"folder"; ...}`)으로
    일반화한 `openMenu` 하나로 합쳐, 열기/바깥 클릭·Escape·스크롤로 닫기·`<nav>` 바깥
    `position: fixed` 렌더 로직(P14-3)을 두 메뉴가 공유한다.
  - **사이드바 "새 문서" 버튼 재배치**: 처음엔 이 버튼을 완전히 없애고 `/editor` 홈 화면의
    "새 문서 작성" CTA만 남기려 했으나, 폴더가 하나도 없는 계정(대부분의 현재 사용자)은
    사이드바 안에서 문서를 만들 방법이 사라지는 퇴보라는 지적("그럼 메인 외에 미분류
    페이지를 만들 수 있는 방법이 없는 거네?")으로 정정했다 — 버튼을 없애지 않고 문서/폴더
    목록(`<nav>`) **맨 아래**(폴더 트리 + 미분류 문서 + "더 보기" 다음)로 옮겼다. 미분류
    문서는 항상 이 트리의 마지막에 오므로, 위치 자체가 "여기서 만들면 미분류로 들어간다"는
    것을 전달한다 — 별도로 "미분류"를 폴더처럼 꾸며 자체 "+"를 붙이는 중복 UI는 만들지
    않았다. 폴더가 없는 계정은 위치만 위→아래로 바뀌었을 뿐 동작은 기존과 같다.
  - **`/editor/new?folder={id}` → 브레드크럼**: `folderPath`/`DocumentEditor`의 브레드크럼
    메커니즘(P7-7)은 원래 mode="edit" 전용으로 설명돼 있었는데, mode 가드가 실제로는 없어서
    (`folderPath.length > 0`만 확인) mode="create"에도 그대로 연결했다 — 새 UI를 만들지
    않고, `/editor/new/page.tsx`가 `searchParams.folder`로 폴더 경로를 조회해 내려주기만
    한다.

## 로그인 화면 — `LoginSimple`/`LoginSplit`을 쓰지 않은 이유 (Task 15 검증, 2026-08-25 레이아웃 갱신)

이 표와 위 "사용 예시"는 원래 `LoginSimple`에 로고 슬롯과 별도로 버튼 영역(footer) 슬롯이 있어서
그 슬롯에 "MS 계정으로 로그인" 버튼을 넣을 수 있다고 가정하고 작성됐다. 실제 구현(Task 15,
`src/app/login/page.tsx`) 중 `@sfood/ui`의 타입 정의(`node_modules/@sfood/ui/dist/index.d.ts`)와
런타임 구현(`dist/index.js`)을 직접 확인해 보니 그런 슬롯은 존재하지 않았다. 같은 시도를 반복하지
않도록 실제 API와 대체 구성을 남긴다.

- **`LoginSimple`/`LoginSplit`은 email/password 폼 전용이고, 슬롯이 없다.** 실제 props는
  `{ logo?, title?, onLogin: (email, password) => void | Promise<void>, onForgotPassword?, onSignup?,
  loading?, error?: string, className? }`뿐이다. `children`도, `footer`도, 버튼 영역 슬롯도 받지
  않는다. 내부적으로 이메일 `<input>`과 비밀번호 `<input>`을 직접 렌더링하고, 둘 다 채워야
  활성화되는 "로그인" 버튼을 눌러야 `onLogin(email, password)`가 호출되는 구조다.
- **이 앱은 로컬 비밀번호가 없다** — AX Auth(SSO) 리다이렉트 링크 하나로만 로그인한다. `LoginSimple`을
  쓰려면 사용자가 쓰지도 않을 이메일/비밀번호를 가짜로 입력해야 버튼이 눌리게 되는데, 이는 슬롯
  이름을 잘못 짚은 정도가 아니라 이 화면의 요구사항(한 번 클릭으로 외부 URL로 이동) 자체를
  표현할 수 없는 구조적 불일치라 슬롯을 다시 찾는 방식으로는 해결이 안 된다.
- **`LoginSplit`("왼쪽 이미지, 오른쪽 로그인" 템플릿)도 같은 이유로 그대로는 못 쓴다.**
  `LoginSplitProps`는 `LoginSimpleProps`를 그대로 확장한다(`brandTitle`/`brandDescription`/
  `brandImage`/`brandClassName`만 추가). 즉 왼쪽 브랜드 패널은 새로 추가됐지만 오른쪽은 여전히
  고정된 `LoginSimple`(email/password 폼)이라, 오른쪽 폼 문제는 `LoginSimple` 때와 동일하게
  남아있다. 대신 `LoginSplit`의 실제 렌더링 구조(`dist/index.js`) — 왼쪽 `hidden md:flex
  flex-col justify-center w-1/2 bg-brand text-white`(+ `brandImage`가 있으면
  `bg-cover bg-center`로 배경 이미지 적용) 패널과 오른쪽 `flex-1 flex items-center
  justify-center` 폼 영역 — 을 그대로 재현하고, 오른쪽 자리에 AX Auth 카드를 넣었다. 지금은
  실제 브랜드 이미지 자산이 없어 왼쪽 패널은 `brandImage` 없이 `LoginSplit`도 지원하는
  "단색 브랜드 패널 + 로고/타이틀/설명" 상태로 채워져 있다 — 나중에 이미지 자산이 정해지면
  같은 위치에 `background-image`만 추가하면 된다.
- **헤딩 계층**: 왼쪽 패널의 "SFOOD IT Editor"가 문서의 h1(브랜드/제품명)이고, 오른쪽의
  "다시 오신 것을 환영해요"는 h2(이 화면의 실제 목적)다. 모바일 폭에서는 왼쪽 패널이 `hidden`으로
  화면에서만 숨겨지고 DOM에는 그대로 남아 있어(h1이 없는 문서가 되지 않는다), 화면에는 오른쪽
  영역만 보인다 — `LoginSplit`의 반응형 동작과 동일하다.
- **오른쪽 영역은 카드(Card)로 감싸지 않는다(2026-08-25, 사용자 피드백으로 재조정)**: 처음에는
  `Card`로 감쌌었는데, 테두리·그림자가 있는 박스 형태가 "자연스러운 로그인 유도"라는 방향과
  맞지 않아 제거했다. 지금은 배경 위에 제목(`Typography variant="h2"`)과 버튼만 세로로 놓는다
  (실패 시 `Alert`도 같은 자리에 끼워 넣는다). 폭 제한은 `Card`의 `max-w-[24rem]` 대신 감싸는
  `div`에 `max-w-[22rem]`(arbitrary value — 이유는 `globals.css` 상단 "알려진 결함" 참고)을 줘서
  큰 화면에서 버튼이 지나치게 늘어나지 않게 한다. "MS 계정으로 로그인" 액션은 외부 URL로 실제
  이동해야 해서 `Button`(`ButtonHTMLAttributes` 기반, `href` 없음)이 아니라
  `<a href={loginUrl}>`을 쓰되, `Button variant="primary" size="lg"`가 내부적으로 쓰는 것과 같은
  토큰 클래스(`bg-brand`, `text-on-brand`, `hover:bg-brand-hover`, `rounded-btn` 등)를 그대로
  입혀 "이 화면의 유일한 1차 액션"이라는 시각적 의미를 유지했다(사이드바의 "새 문서" 링크와
  동일한 패턴 — `src/components/editor/EditorSidebar.tsx` 참고).
- **설명 카피를 넣지 않는다**: 처음 버전에는 왼쪽 패널에 "사내 문서를 작성해 Confluence에
  보관하고, 원할 때 Tech Blog 등 외부 뷰어에 게시하세요." 같은 문장이 있었는데, 이는 버튼이
  이미 하는 일을 설명하는 튜토리얼식 카피라 지워야 할 것을 실수로 다시 넣은 것이었다(사용자
  지적으로 재확인, 2026-08-25). 로그인 화면에는 브랜드명(h1)과 짧은 유도 문구(h2)만 두고,
  "로그인하면 무엇을 할 수 있는지" 같은 설명은 넣지 않는다.

## 문서 편집 화면 — 박스 없는 에디터 캔버스 구조 (2026-08-25)

새 문서 작성/문서 편집 화면도 로그인 화면처럼 "박스(Card)로 감싸지 않는" 방향으로 다시
짰다(사용자 피드백: "페이지 전체가 에디터 모드처럼 보이게"). 이전에는 페이지가 자기 헤더
(제목 h1 + "탐색기로" 링크)를 그리고, 그 아래 `Card`로 감싼 `DocumentEditor`가 다시 자기
하단 툴바(삭제/게시 설정/저장)를 그리는 이중 구조였다.

- **헤더를 한 곳으로 합쳤다**: `DocumentEditor`가 상단 `sticky top-0` 헤더 하나를 직접
  그린다 — 왼쪽 "탐색기로", 오른쪽 삭제·게시 설정·저장. 페이지 파일(`new/page.tsx`,
  `[pageId]/page.tsx`)은 더 이상 자기 헤더나 `Card`를 그리지 않고 `<main><DocumentEditor
  .../></main>`만 남는다. 헤더가 부모(`EditorShell`의 `overflow-y-auto` 영역)를 기준으로
  스크롤 중에도 계속 보여서, 문서가 길어져도 저장 버튼을 찾으러 스크롤할 필요가 없다 —
  해상도가 낮은 노트북에서도 안정적으로 쓸 수 있게 하려는 목적.
- **글자 크기를 2단계로 좁혔다**: 예전에는 페이지 h1(24px)·제목 입력(30px, `text-3xl`)·버튼
  (14px)·안내 문구(12px, `text-xs`)가 섞여 있었다. 이때는 제목 입력을 `text-2xl`(24px)로,
  본문 리치 텍스트를 `.prose`에서 `.prose-sm`(16px → 14px)으로 낮췄었다.
  > **2026-08-26 갱신**: 저해상도 노트북 문제의 실제 원인은 헤더의 버튼/링크/태그류였지
  > 본문 읽기 영역이 아니었던 것으로 재확인됐다. UI 크롬(`text-sm`)은 그대로 두고, 제목은
  > `text-4xl`(36px, 본문 리치 텍스트 H1과 크기를 맞춤)로, 본문은 표준 `prose` 스케일
  > (16px)로 되돌렸다 — 사내 문서 뷰어 SF-Note 캡쳐와 실측 비교 근거
  > (`src/components/editor/RichTextEditor.tsx`, `src/components/editor/DocumentEditor.tsx`
  > 주석 참고). 현재 기준값은 아래 "정책 레퍼런스" 절 참고.
  문서 안의 제목1/2/3 등 서식 계층은 이 규칙 밖이다(사용자가 직접 쓰는 콘텐츠의 구조이지
  화면 크롬이 아니다).
- **제목 중복 문제가 구조적으로 사라졌다**: 카드/페이지 제목이 없어지면서, 문서 제목은
  `DocumentEditor` 안의 편집 가능한 입력창 하나로만 보인다(2026-08-25 UI 진단에서 고쳤던
  "페이지 h1과 입력창이 같은 텍스트를 두 번 보여주는" 문제 자체가 다시 생길 수 없는 구조가
  됐다).
- **접근성**: 화면에 보이는 헤딩이 없어져도 문서에는 h1이 하나 있어야 하므로,
  `DocumentEditor`가 `sr-only`(화면에는 안 보이고 스크린리더에만 읽히는) h1을 렌더링한다
  (`새 문서 작성`/`문서 편집`).
- **후속 결함 — 빈 문서에서 "쓰는 자리"가 안 보임**: 박스를 없앤 직후, 새 문서를 열면 제목·
  태그 아래에 편집 영역이 전혀 안 보인다는 리포트가 있었다. 실제로는 TipTap 편집기가
  정상 동작했다(빈 `<p>`가 24px 높이로 존재, contenteditable도 true) — 다만 테두리를 주던
  `Card`가 사라지면서 그 24px가 페이지 여백과 구분이 안 됐던 것이다. `@tiptap/extension-placeholder`로
  빈 문서에 안내 문구("내용을 입력하세요. '/'를 입력하면...")를 띄우고, `globals.css`의
  `.ProseMirror`에 `min-height: 320px`를 줘서 캔버스 영역 자체를 눈에 보이게 확보했다
  (2026-08-25, 산출물: `src/components/editor/RichTextEditor.tsx`, `src/app/globals.css`).

## Do / Don't (Component Guide 발췌)

**색상**: 토큰 클래스를 쓰고 하드코딩하지 않는다.
```tsx
// Do
<div className="text-foreground bg-surface border-border">

// Don't
<div className="text-gray-900 bg-white border-gray-200">
```

**버튼 계층**: 한 화면에 `primary` 버튼은 1개만 둔다.
```tsx
// Do
<Button variant="primary">저장</Button>
<Button variant="secondary">취소</Button>

// Don't
<Button variant="primary">저장</Button>
<Button variant="primary">취소</Button>
<Button variant="primary">삭제</Button>
```
→ 편집 화면 헤더 버튼(저장/게시 설정, 2026-08-25부터 상단 헤더에 위치)에도 같은 원칙을
적용해 "저장"만 `primary`, "게시 설정"은 `secondary`로 구분한다. "삭제"는 2026-09-14(P14-2)에
헤더에서 사이드바 문서 옵션(⋯) 메뉴로 옮겨가 더 이상 `Button`이 아니라 `DropdownItem`의
`danger` 스타일로 표시된다.

**폼 구조**: 라벨/에러를 `FormField`로 감싼다.
```tsx
// Do
<FormField label="이메일" error="필수 항목" required>
  <Input type="email" error />
</FormField>
```

**자주 쓰는 조합 — 삭제 확인 모달**
```tsx
<Modal
  open={open}
  onClose={() => setOpen(false)}
  title="삭제 확인"
  footer={
    <>
      <Button variant="secondary" onClick={() => setOpen(false)}>취소</Button>
      <Button variant="danger" onClick={handleDelete}>삭제</Button>
    </>
  }
>
  이 작업은 되돌릴 수 없습니다.
</Modal>
```

**Toast 알림**
```tsx
const { toast } = useToast()

toast('저장되었습니다.', 'success')
toast('오류가 발생했습니다.', 'danger')
```

## 토큰 레퍼런스 (요약)

모든 토큰은 `@sfood/ui`의 `tokens/semantic.css`에 정의되어 있고, 이 프로젝트에서는 직접 수정하지 않는다(테마 커스터마이징이 필요해지면 별도로 논의).

| 구분 | 대표 토큰 | 용도 |
|---|---|---|
| 색상 | `--color-brand`, `--color-surface`, `--color-foreground`, `--color-danger`, `--color-success`, `--color-warning`, `--color-info` | 액션 색상, 카드 배경, 기본 텍스트, 상태 색상 |
| Spacing | `--spacing-xs`(4px) ~ `--spacing-2xl`(80px), `--page-padding`(24px) | 컴포넌트 내부/섹션 간격 |
| Shadow | `--shadow-sm`/`md`/`lg`/`card`/`raised`/`overlay` | Input, Card, Modal 등 |
| Motion | `--motion-fast`(100ms) / `default`(150ms) / `slow`(300ms) | 호버, 전환, 모달 등장 |
| Radius | `--radius-btn`/`card`/`input`/`badge` | 컴포넌트별 모서리 반경 |

**결정됨(2026-08-25, UI 진단 후속 조치)**: 기존 `globals.css`의 `--color-brand: #e4002b;` 등 커스텀 재정의는 완전히 제거하고, `@sfood/ui`의 기본 브랜드 스케일(`#d65050`)을 그대로 쓴다. `@sfood/ui/tokens/base.css`의 주석에 "s-food.co.kr 실제 사이트의 강조색(#d65050, 메뉴/아이콘 hover)을 600 기준으로 앵커해 도출"이라고 명시돼 있어, 이 값이 이미 회사 웹사이트 기준으로 보정된 최신 값임을 확인했다. 이 결정은 CLAUDE.md의 "1순위 @sfood/ui" 원칙과도 일치한다.

## 확인되지 않은 사항
- (없음 — 마지막 항목이었던 브랜드 색상 반영 여부는 2026-08-25에 결정됨, "토큰 레퍼런스" 절 참고)

## 확인된 사항
- ~~기존 브랜드 색상(`#e4002b`)을 `@sfood/ui` 토큰에 그대로 반영할지 여부~~ → **`@sfood/ui` 기본값(`#d65050`)을 그대로 쓴다.**
  `@sfood/ui/tokens/base.css`의 주석에 이 값이 s-food.co.kr 실제 사이트 강조색을 앵커해 도출한
  것이라고 명시돼 있어, `globals.css`의 `#e4002b` 재정의가 오히려 구식 값이었다(2026-08-25 UI
  진단). 이 재정의는 애초에 `@sfood/ui/global.css`와의 임포트 순서 문제로 실제 적용된 적도
  없었다 — 상세 원인은 이 파일의 "v4 주의사항 2 (C2)" 참고.
- ~~`ChipGroup`이 "태그를 자유롭게 입력해서 추가"하는 입력 모드를 지원하는지~~ → **지원하지 않는다.**
  `ChipGroup({ items, value, onChange })`는 미리 정해진 `items` 목록 중 하나를 고르는 단일 선택
  세그먼트 컨트롤(`role="tablist"`/`role="tab"`)이고, 자유 입력 슬롯이 없다. 태그를 새로 "입력"하는
  화면(문서 작성/수정의 태그 입력, Task 13)은 `Tag` + 일반 `<input>`을 조합한 커스텀 컴포넌트
  (`src/components/editor/TagInput.tsx`)로 구현했고, 태그로 "필터링"하는 화면(이 문서의 사이드바 앱
  셸, Task 14)은 그 정해진-목록 선택 특성이 정확히 맞아 `ChipGroup`을 그대로 썼다(선택된 칩을 다시
  클릭하면 필터가 풀리는 토글 동작은 `value`/`onChange`를 감싸는 쪽에서 구현).
  > **2026-09-14 갱신(P12-1)**: 이 `ChipGroup` 필터 UI 자체를 제거했다 — 태그의 역할을 "폴더에
  > 준하는 분류 축"이 아니라 "검색 매칭 키워드"로 좁히기로 하면서, 상시 노출되던 필터 칩 대신
  > 이미 태그를 매칭하고 있던 사이드바 검색으로 흡수했다. 위 기록은 `ChipGroup`을 필터에 썼던
  > 이유(자유 입력 미지원, 정해진 목록 선택에 적합)를 남기기 위해 그대로 둔다.

## 게시 설정 — "slug" 대신 "공개 주소 키워드" (2026-09-03)

게시 설정의 slug 입력 필드가 왜 필요한지 검토해달라는 요청에서 나온 결정이다. slug 뒤에는
항상 문서 생성 시 발급된 내부 고유키(UUID)가 자동으로 덧붙어(`{slug}-{내부고유키}`, P0-5b)
공개 주소가 절대 겹치지 않게 이미 보장돼 있다 — 그래서 "slug가 정말 필요한가?"라는 질문이
합리적이었다.

**결론: 필요하다.** 중복 방지는 UUID의 역할이고, slug는 그와 무관한 별개의 역할(사람이 링크
만 보고도 무슨 글인지 짐작하게 하는 것, 검색엔진 노출)을 한다 — WordPress·Medium·Ghost 등
대부분의 블로그 플랫폼이 쓰는 것과 같은 관행이다. 다만 화면에 "공개 경로(slug)"처럼 개발자
용어를 그대로 노출하면서 왜 필요한지 설명이 전혀 없었던 것이 문제였다. `FormField`의 `hint`
prop으로 그 이유를 짧게 설명하고, 라벨도 "공개 주소 키워드"로 바꿔 이 필드가 URL에 들어갈
문서 키워드라는 것을 이름 자체에서 알 수 있게 했다. 산출물: `src/components/editor/PublishForm.tsx`.

## Ctrl+K 검색 팝업 — `Modal`을 쓰지 않은 이유 (2026-09-03, Notion 스타일 재구성)

`docs/superpowers/tasks/P1-1a-content-search-ctrlk/`에서 만든 첫 버전은 `@sfood/ui`의 `Modal`
없이 시작했다가, 사용자가 Notion의 실제 Ctrl+K 검색 화면 캡처를 보여주며 "결과 목록(좌) + 선택한
문서의 미리보기(우)"가 나란히 보이는 2단 레이아웃으로 재구성해 달라고 요청했다(`GlobalSearchModal.tsx`,
`docs/superpowers/tasks/P1-1a-search-notion-style-redesign/`). 이때 `Modal`을 다시 검토했다.

- **`Modal`의 `size`는 `sm`/`md`/`lg` 세 단계뿐이고, 가장 큰 `lg`도 `max-w-2xl`(42rem)에 그친다.**
  좌측 결과 목록(최소 `min-w-[220px]`, 폭의 2/5)과 우측 미리보기 패널을 나란히 둔 채 문서 제목·
  태그·본문 스니펫까지 읽을 수 있게 하려면 `max-w-4xl`(56rem) 이상이 필요해, `Modal`이 지원하는
  범위를 벗어난다.
- 그래서 위 문서 상단 "① 대응 요소 없으면 대체 구성" 원칙에 따라 커스텀 오버레이(`<div
  className="fixed inset-0 ...">`)를 직접 만들되, `Modal`이 내부적으로 제공하는 접근성 동작—
  Escape로 닫기, 배경(backdrop) 클릭으로 닫기, 포커스 트랩(Tab이 패널 밖으로 나가지 않게),
  열려 있는 동안 `body` 스크롤 잠금, 닫힐 때 이전 포커스 복원—은 그대로 재현했다.
- 커스텀 오버레이 안에서 쓰는 개별 요소는 여전히 `@sfood/ui`를 우선했다: 태그 표시는 `Tag`,
  색상·간격·radius는 전부 CSS Variables 토큰 클래스(`bg-surface`, `border-border`, `rounded-card`,
  `rounded-btn`, `text-muted`, `bg-brand-subtle`/`text-brand` 등)로만 참조하고 하드코딩하지 않았다.
- **"제목만" 필터**는 클라이언트에서 이미 받아온 결과를 `title` 기준으로 다시 거르는 로컬 상태
  (`titleOnly`)이고, 서버 재조회를 유발하지 않는다. **결과 그룹핑(오늘/어제/최근 7일/이전)**은
  `updatedAt`을 오늘 자정 기준으로 비교해 4개 구간으로 나눈 뒤 빈 구간은 숨긴다.
- Notion 캡처에는 있지만 이번에 반영하지 않은 것: "생성자"/"검색 범위" 필터(이 앱은 계정별 개인
  폴더 구조라 여러 사용자 문서를 넘나들며 찾을 일이 없음), 즐겨찾기/북마크(이 앱에 없는 기능).

## "삭제된 문서" — Modal에서 전용 페이지(`/editor/trash`)로 전환 (2026-09-14, P16-1)

P1-2b에서 만든 "삭제된 문서" 목록(`DeletedDocumentsModal`)은 사이드바 버튼 → `Modal` 구조였다.
사용자 지적: "삭제된 문서는 늘어날 수록 팝업으로 감당이 안돼... 오른쪽 페이지 영역에 상단
검색과 하단 삭제된 페이지 리스트가 나오도록 구성을 해야 할 것 같아." 아래 "온보딩" 절과 같은
"Modal → 전용 페이지" 전환이지만, 이유는 다르다 — 온보딩은 `Modal`의 폭 제약(뒤 문단 참고)이
근거였고, 이번엔 **목록이 무한정 늘어날 수 있는데 `Modal`은 고정 높이 안에서만 스크롤된다**는
것과 **검색이라는 상호작용 자체가 추가**되는 것이 근거다 — 화면 전체를 쓰는 페이지가 이
두 요구(많은 항목을 훑어보기, 검색 입력을 상단에 고정)에 자연스럽게 맞는다.

- **데이터 조회 방식도 함께 바꿨다.** `DeletedDocumentsModal`은 마운트 후 클라이언트에서
  `fetch("/api/editor/documents/deleted")`했지만(팝업이 열릴 때만 필요한 데이터라 그게
  자연스러웠다), 전용 페이지가 되면서 다른 `/editor/*` 페이지(`/editor/new`,
  `/editor/[pageId]`)와 같은 패턴 — 서버 컴포넌트(`src/app/editor/trash/page.tsx`)가
  `listDeletedDocuments(email)`을 먼저 조회해 클라이언트 컴포넌트(`DeletedDocumentsPage.tsx`)에
  `initialDocuments`로 내려준다. 로딩 스피너 없이 바로 목록이 보인다.
- **"삭제된 문서 정보를 더 상세하게" 요구**는 기존 `DeletedDocumentEntry`(레지스트리에
  저장되는 항목)가 `pageId`/`title`/`deletedAt` 3개뿐이라 그대로는 불가능했다 — 태그·게시
  상태·소속 폴더는 삭제된 뒤(Confluence 페이지가 실제로 지워진 뒤)에는 더 이상 그 페이지에서
  읽을 수 없다. 그래서 `deleteDocument()`가 `deletePage()`를 부르기 **직전**(페이지가 아직
  존재하는 마지막 시점)에 태그(`getTags`)·게시 상태(`publishMetadata`)·폴더(`folderId`)를
  함께 읽어 레지스트리 항목에 스냅샷으로 남긴다. 이 필드들이 생기기 전에 기록된 옛 항목은
  값이 없으므로, 쓰는 쪽이 아니라 **읽는 쪽**(`listDeletedDocuments`)에서 기본값(빈 배열/
  `false`/`null`)으로 보정한다 — 마이그레이션 스크립트 없이 하위 호환을 유지하는, 이
  프로젝트에서 반복되는 패턴(예: `DocumentSummary.folderId`가 없는 기존 문서를 `null`로
  취급하는 것과 동일).
- **폴더는 "이름"이 아니라 "id"만 저장한다.** 이름을 그대로 저장해버리면 나중에 그 폴더의
  이름이 바뀌어도(폴더 이름 변경, P7-2) 삭제된 문서 목록에는 옛 이름이 그대로 박제된다.
  대신 조회 시점(`listDeletedDocuments`)에 그 계정의 현재 폴더 트리(`listFolders`)에서
  이름을 다시 찾아 `folderName`으로 얹는다 — 그 폴더가 그 사이 삭제됐으면 `null`(화면에서는
  "미분류"와 동일하게 표시).
- **컴포넌트 구성**은 기존 목록 렌더링(제목·삭제일시·복구 버튼)에 검색 입력(사이드바 문서
  검색과 같은 제목/태그 필터 로직)과 상세 정보(`StatusIcon`으로 게시 상태, `Tag`로 태그,
  텍스트로 원래 폴더)를 더한 것뿐이라 새 컴포넌트를 설계하기보다 기존 값(`EditorSidebar.tsx`의
  `StatusIcon`, `@sfood/ui`의 `Tag`/`EmptyState`/`Button`)을 그대로 재사용했다. 페이지 폭은
  `DocumentEditor`의 본문 캔버스와 같은 `max-w-[830px]`(P8-6)를 그대로 써서 다른 `/editor/*`
  화면과 시각적으로 어긋나지 않게 했다.

## 온보딩 — Modal에서 전용 페이지(`/welcome`)로 전환 (2026-09-03)

첫 버전(P5-2)은 `/editor` 화면 위에 뜨는 `Modal`로 이름·팀을 입력받았다. 머지 후 "팀, 이름을
메인에서 팝업으로 받는 방법은 아닌 것 같다 — 로그인 화면에서 계정을 못 찾으면 환영 페이지로
이동했다가 팀·이름을 받고, 완료하면 메인으로 가야 한다"는 피드백을 받아 다시 구성했다.

- `Modal` 컴포넌트를 아예 쓰지 않는다 — 온보딩은 "메인 화면 위의 팝업"이 아니라 "메인 진입
  전에 거치는 별도 화면"이어야 한다는 지적이라, 컴포넌트 대체가 아니라 애초에 이 화면을
  Modal로 만들지 않는 것이 맞는 해법이었다.
- 대신 로그인 화면(`src/app/login/page.tsx`)이 이미 확립해 둔 "박스(Card)로 감싸지 않고
  배경 위에 자연스럽게 뜬 중앙 정렬 콘텐츠"(2026-08-25 결정, "로그인 화면" 절 참고) 구성을
  `/welcome`(`src/components/welcome/WelcomeForm.tsx`)에 그대로 재사용했다 — 로그인 화면과
  같은 "인증 전후의 단일 목적 화면"이라는 성격이 같기 때문이다.
- 라우팅은 `/editor/layout.tsx`(서버 컴포넌트)가 담당한다: 계정의 `accountMeta`가 온보딩
  미완료 상태(`needsOnboarding`)면 `/welcome`로 `redirect()`하고, `/welcome`도 반대로 이미
  온보딩이 끝난 계정이 들어오면 `/editor`로 돌려보낸다 — AX Auth 콜백(`/api/auth/ax-callback`)
  자체는 손대지 않고 항상 `/editor`로만 보낸다(그 하위에서 온보딩 여부를 판단하는 편이
  콜백 라우트에 도메인 조회 책임을 추가하는 것보다 계층이 깔끔하다).

## 환영 페이지(`/welcome`) — `LandingSplit` 재사용 (2026-09-03)

바로 위 절에서 Modal을 걷어내고 `/welcome` 페이지를 새로 만들었는데, 첫 버전은 이름·팀
`FormField` 두 개만 덩그러니 있는 화면이었다. "이 서비스가 어떤 서비스이고 장점이 뭔지
조금이라도 보이는 UI였으면 좋겠다"는 피드백으로 다시 짰다.

- **`@sfood/ui`의 `LandingSplit`을 그대로 썼다.** 마케팅 랜딩 페이지 템플릿이지만, 뜯어보면
  "왼쪽 헤드라인·서브헤드라인·기능 소개(`features`), 오른쪽 `media` 슬롯" 구조일 뿐 폼의
  존재를 전혀 강제하지 않는다(`LoginSimple`/`SignupPage`가 `onLogin(email, password)`처럼
  구체적인 콜백 시그니처를 강제해 못 썼던 것과는 다른 경우). `media`에 우리 온보딩 폼을
  그대로 끼워 넣고, `ctaPrimary`/`ctaSecondary`(마케팅 CTA 버튼)는 넘기지 않아 이 화면의
  유일한 1차 액션이 폼 안의 "시작하기" 버튼 하나가 되게 했다(`Button variant="primary"` 1개
  규칙). 로그인 화면처럼 레이아웃을 직접 복제해 그릴 필요가 없었다.
- **기능 소개 아이콘은 이모지를 그대로 썼다.** `@sfood/ui`의 `IconName`은 `'search'|'comment'`
  둘뿐이라 대응 요소가 없고(①), `FeatureItem.icon`을 감싸는 실제 구현이 `text-2xl`(폰트
  크기 기준 스케일)이라 애초에 이모지 같은 문자 크기 아이콘을 염두에 둔 슬롯으로 보여(③,
  index.js 확인) 커스텀 SVG 대신 이모지(🔒/🚀/✍️)를 택했다.
- **계정 이메일 표시**는 `media` 안, 폼 바로 위에 `Avatar`(이메일 앞 두 글자를 이니셜로) +
  "이 계정으로 오셨어요"로 넣었다 — 관련 없는 위치(예: `badge`)에 넣는 대신 실제로 지금
  입력하는 계정이 무엇인지 폼과 붙여서 보여준다.
- **필드 문구는 "왜 필요한지"를 `FormField`의 `hint`로 함께 적었다** — 라벨 자체를 "이름을
  알고 싶어요"/"어디 소속인지 알려주세요"처럼 서비스가 사용자에게 직접 묻는 말투로 쓰고,
  hint에 실제 이유(문서함 표시, Phase 6 공유 대상 검색)를 짧게 붙였다.
- **버그: `autoFocus`가 페이지를 아래로 스크롤시켜 헤더(브랜드 로고)가 뷰포트 밖으로
  밀려났다** — 실제 브라우저로 렌더링해 스크린샷을 찍어보고 나서야 발견했다(`getBoundingClientRect()`로
  확인한 `<header>`의 `top`이 `-76px`). 이름 입력창의 `autoFocus`가 마운트 즉시 포커스를
  받으며 브라우저가 그 요소를 뷰포트 안으로 스크롤시킨 것 — 화면 전체를 이용해 서비스를
  소개하려는 이 화면의 목적과 정면으로 배치되는 부작용이라 `autoFocus`를 제거했다.
- 라이트/다크, 데스크톱/모바일(375px) 각각 실제 렌더링으로 확인했다 — 별도 CSS 보정 없이
  모두 정상 동작했다.

## 환영 페이지 재설계 — "AI가 자주 쓰는 패턴" 지적과 레퍼런스 조사 (2026-09-03)

바로 위 `LandingSplit` 버전을 보고 "UI가 별로다, AI가 자주 쓰는 패턴 같다, '초안'·'Tech
Blog'·'WYSIWYG' 같은 단어를 금지한다, 비개발자·일반 사원이 나만의 문서를 만들어 관리하고
팀원과 공유하는 서비스로 다시 포지셔닝하라"는 구체적인 피드백을 받아 웹 검색으로 레퍼런스를
모으고 평가한 뒤 다시 설계했다.

### 레퍼런스 조사

| # | 레퍼런스 | 관찰한 점 |
|---|---|---|
| 1 | [Slack 워크스페이스 온보딩](https://userpilot.com/blog/slack-onboarding/) | 질문을 한 번에 하나씩, 정리된 화면에 텍스트 입력 하나 + 버튼 하나만 둔다. "이미 당신에 대해 조금 안다"는 느낌의 개인화가 강하다. |
| 2 | [Basecamp 온보딩](https://goodux.appcues.com/blog/basecamps-welcoming-walkthrough) | 대화체·따뜻한 문구, 팀의 환영 인사, 자체 마스코트로 분위기를 잡는다 — 기업적이지 않고 인간적이다. |
| 3 | [Coda 온보딩](https://coda.io/blog/okrs/staffing-os-part-three-onboarding) | 여러 문서·링크로 흩어놓지 않고 한 곳에서 차분하게 안내한다("한 곳에 모아 따뜻하게 환영"). |
| 4 | [미니멀 메모 앱(OneNote/BrainDump류) 온보딩 원칙](https://userpilot.com/blog/best-user-onboarding-experience/) | 튜토리얼·마케팅 스캐폴딩 없이 30초 안에 실제 가치(빈 캔버스에 바로 쓰기)에 도달하게 한다 — 잘 만든 단순 앱은 온보딩 시퀀스 자체가 필요 없을 정도로 자기설명적이다. |
| 5 | ["AI Slop" 웹 디자인 안티패턴 가이드](https://www.925studios.co/blog/ai-slop-web-design-guide) | AI 생성 디자인의 전형적 특징을 정리: 보라/핑크/시안 그라디언트, 떠다니는 3D 도형, 과도한 글래스모피즘, 균일한 16px 라운드 카드 그리드, "미래를 만들어라"류 모호한 헤드라인. 해독제는 **구체성**(specificity) — 실제 제품 화면·목업을 보여주고, 카피도 이 서비스만의 구체적인 말로 쓴다. |

### 평가(5점 만점, 이번 화면의 목표 기준: 비개발자 친화·따뜻함/개인화·간결함(속도)·AI 클리셰 회피·이 프로젝트 적용 가능성)

| 레퍼런스 | 비개발자 친화 | 따뜻함/개인화 | 간결함 | AI 클리셰 회피 | 적용 가능성 | 합계(25) |
|---|---|---|---|---|---|---|
| Basecamp | 5 | 5 | 4 | 5 | 4 | **23** |
| 미니멀 메모 앱 원칙 | 5 | 3 | 5 | 5 | 5 | **23** |
| Slack | 4 | 4 | 3 | 4 | 3 | 18 |
| Coda | 4 | 4 | 4 | 3 | 3 | 18 |

(직전 버전이 따랐던 "배지+거대 헤드라인+이모지 3열 카드" 마케팅 랜딩 패턴은 위 "AI Slop" 가이드의
체크리스트와 정확히 겹친다 — 균일한 카드 그리드, 일반화된 아이콘(이모지), 다소 모호한
헤드라인이 그 특징이다. 이번 재설계에서 가장 먼저 걷어낸 것이 이 구조 자체다.)

### 채택한 조합과 이유
- **Basecamp의 대화체·인간적인 톤**을 필드 라벨·인사말에 반영했다("이름을 알고 싶어요",
  "어디 소속인지 알려주세요", "반가워요!") — 서비스가 사용자에게 직접 말을 거는 방식.
- **미니멀 메모 앱의 "군더더기 없는 화면" 원칙**에 따라 헤드라인+서브헤드라인+기능 카드
  3열이라는 별도의 "마케팅 섹션"을 없애고, 서비스 소개를 인사말 한 단락에 자연스럽게
  녹였다 — 화면에 있는 것은 인사말, 계정 확인, 폼, 버튼뿐이다.
- **"구체성" 원칙(AI Slop 안티패턴 가이드)**에 따라 이모지·그라디언트·범용 아이콘 대신 이
  프로젝트만의 것 — 로그인 화면에서 이미 쓰던 손으로 그린 `BrandPanelArt` SVG를 그대로
  재사용했다(아래 "환영 페이지 — `AuthSplitShell` 추출" 참고). 일반적인 SaaS 랜딩 페이지
  템플릿(`LandingSplit`)을 걷어내고, 로그인 화면과 시각적으로 하나로 이어지는 화면으로
  되돌렸다.
- **Slack의 개인화**를 계정 이메일 표시(`Avatar` + "이 계정으로 오셨어요")로 반영했다 —
  다만 Slack처럼 질문마다 화면을 나누는 멀티스텝 방식은 필드가 2개뿐이라 과하다고 판단해
  택하지 않았다(간결함 원칙과의 트레이드오프).

### 용어 교체(사용자 지시 — "초안"/"Tech Blog"/"WYSIWYG" 금지)
이 화면은 개발자가 아닌 일반 사원을 대상으로 하므로, 내부 설계 문서(data-spec.md 등)의
"초안-게시 생명주기"·"WYSIWYG 에디터"라는 용어를 화면 문구에 그대로 노출하지 않는다.
- "초안" → "아직 다른 사람에게 보여주고 싶지 않은 내용은 나만 볼 수 있게" (기능은 동일, 개발
  용어만 풀어씀)
- "Tech Blog에 게시" → 이 화면에서는 아예 언급하지 않는다. 사용자가 이번에 서비스를 다시
  정의한 방향("나만의 문서를 만들어 관리하고 팀원과 공유")과도 맞다 — 외부 게시는 이 화면의
  핵심 메시지가 아니다.
- "WYSIWYG 에디터" → 언급 자체를 뺐다(미니멀 원칙 — 기능 나열보다 빠르게 실제 화면으로).

## 환영 페이지 — `AuthSplitShell` 추출 (2026-09-03)

위 재설계로 `/welcome`이 다시 로그인 화면과 같은 "좌측 브랜드 패널 + 우측 단일 목적 콘텐츠"
구조로 돌아왔다. 로그인 화면 전용으로 짜여 있던 레이아웃(`BrandPanelArt`, 헤더 없는 좌우
분할, `ThemeToggle`)을 `src/components/AuthSplitShell.tsx`로 뽑아 `/login`·`/welcome` 양쪽이
공유하게 했다 — 두 화면 다 완전히 같은 시각 구조를 실제로 필요로 하는 시점이라(반복 2회부터는
복사보다 추출), `src/app/login/page.tsx`도 이 셸을 쓰도록 함께 리팩터링했다. 로그인 화면
자체의 렌더링 결과(레이아웃·문구·동작)는 바뀌지 않았다 — 실제 브라우저로 재확인함.
`leftSubtitle` prop만 새로 추가해 `/welcome`은 왼쪽 브랜드 타이틀 아래 "당신만의 문서 공간"
한 줄을 더 보여준다.

## 환영 페이지 — 가운데 정렬·좁은 폭 가독성 문제 (2026-09-03)

위 재설계 직후 스크린샷을 보고 "텍스트가 줄바꿈으로 지저분하게 읽히고, 계정 정보가 눈에
안 띄고, 간격이 좁게 가운데 몰려 있어 뭘 해야 할지 한눈에 안 들어온다"는 지적을 받았다.

- **원인**: 인사말·계정 확인 블록에 `text-center`를 주고 폭을 `max-w-[22rem]`(로그인
  화면과 동일)로 좁혀뒀었다. 한두 줄짜리 헤드라인엔 가운데 정렬이 어울리지만, 두세 줄로
  꺾이는 본문 문단은 매 줄 시작 위치가 달라져 눈이 다음 줄을 찾기 어렵다 — 전형적인 "가운데
  정렬 장문 텍스트" 가독성 문제. 로그인 화면은 헤드라인 한 줄 + 버튼 하나뿐이라 좁은 폭
  가운데 정렬이 문제없었지만, 이 화면은 콘텐츠가 더 많아 같은 처리를 그대로 가져온 게
  문제였다.
- **조치**: 전체 블록을 왼쪽 정렬로 바꾸고, 폭을 22rem → 28rem(`max-w-md`)으로 넓혔다.
  계정 확인 줄은 테두리 있는 카드(`rounded-card border border-border bg-surface`)로 감싸
  "로그인 계정" 레이블 + 이메일을 눈에 띄게 만들었다(기존엔 `Avatar` + 뮤트 텍스트만
  나란히 둬 잘 안 보였다). 인사말/계정 확인/폼 세 블록 사이 간격을 `gap-6`→`gap-8`로
  넓혀, 위에서 아래로 훑을 때 블록 구분이 분명해지게 했다.
- 실제 렌더링(1440px 데스크톱, 375px 모바일)으로 재확인했다 — 두 크기 모두 왼쪽 정렬로
  자연스럽게 줄바꿈되고, 계정 확인 카드가 뚜렷이 구분된다.

## 벤치마킹 — support.claude.com/ko 문서 뷰어 레이아웃 실측 비교 (2026-09-09)

사용자가 "헤더·좌측 패널·본문 구조가 이 프로젝트와 유사하니 참고하라"고 지목한
[support.claude.com/ko](https://support.claude.com/ko)(Anthropic 지원 센터, 문서 아티클
화면)를 실제 브라우저(1440×900 데스크톱 기준, 필요 시 768~1920px 구간도 함께 실측)로 열어
`getBoundingClientRect()`/`getComputedStyle()`로 각 영역의 폭·높이·패딩·폰트를 직접 측정했다.
아래 값은 전부 2026-09-09 시점 실측치이고, 이 문서의 다른 절과 마찬가지로 나중에 레퍼런스
사이트가 바뀌면 이 절도 낡을 수 있다 — 재작업 시 다시 실측할 것.

이 절의 결과는 PRD의 **Phase 8**(`prd.md` 참고, Phase 7 폴더 작업과는 별개 트랙) 계획의
근거 자료다. 표는 "레퍼런스 실측값"과 "이 프로젝트 현재 값"을 나란히 두어 그대로 차이를
확인할 수 있게 했다.

### 1. 전체 그리드(데스크톱, ≥1280px)

| 영역 | 레퍼런스 실측값 | 이 프로젝트 현재 값 | 비고 |
|---|---|---|---|
| 바깥 여백(좌/우) | 16px | `px-6`(24px, `EditorShell` 페이지 패딩) | 레퍼런스가 더 좁다 — 이 프로젝트는 여백보다 사이드바/본문 폭 자체가 이미 커서 그대로 둬도 무방(P8-1/P8-2 범위 밖) |
| 좌측 사이드바 폭 | 260px 고정 | 256px 기본(220~440px 리사이즈 가능, `localStorage` 저장) | 4px 차이 — 사실상 동일. 이 프로젝트는 리사이즈 가능이라는 강점이 이미 있어 폭 자체를 바꿀 필요 없음 |
| 사이드바↔본문 거터 | 48px | 없음(사이드바가 `border-r`로 바로 붙고 본문이 `px-6`으로 시작) | 시각적 여백감 차이의 실제 원인 — P8-2에서 참고 |
| 본문 최대 폭 | **830px**(830px에서 상한 — 1920px 폭에서도 안 늘어남, `max-width:830px` 인라인 계산값 확인) | `max-w-[820px]`(design.md 기존 결정, SF-Note 실측 근거) | 10px 차이 — 사실상 이미 일치. 이번 벤치마크로 굳이 바꿀 실익 없음(P8-6에서 830px로 맞추는 것만 선택적으로 처리) |
| 본문↔TOC 거터 | 48px | 해당 기능 없음(TOC 자체가 없음) | P8-5(TOC 신규)에서 반영 |
| 우측 TOC 폭 | 240px 고정 | 없음 | P8-5 |
| 그리드 상한(초광폭 대응) | 사이드바 260 + TOC 240은 고정, 본문만 fluid하되 830px에서 캡 — "가운데 칼럼이 안정적으로 보인다"는 사용자 관찰의 실체는 **양쪽 레일 고정 폭 + 본문 자체 상한**의 조합이지 "여백이 커서"가 아니다 | 본문은 이미 고정 상한(820px)이 있지만 사이드바가 가변폭이라 완전히 같은 안정감은 아님 | 구조적으로 이미 유사 — P8-6이 유일하게 필요한 조정 |

**패딩 겹침 정정(2026-09-14)**: P8-6에서 `max-w-[830px]`로 맞췄을 때, 그 값이 실제로는
"본문 최대 폭 = 830px"이 아니라 "본문 최대 폭 + 좌우 패딩(`px-6`, 48px) = 830px"이었다
— `px-6`이 `max-w-[830px]`와 같은 엘리먼트에 있어 Tailwind 기본 box-sizing(border-box)
상 그 패딩이 830px 안에서 깎여나갔기 때문이다. 실제 읽기 영역은 782px로, 레퍼런스의
순수 830px 텍스트 폭보다 48px 좁았다(사용자가 실제 화면을 레퍼런스와 다시 비교하며
발견). `px-6`을 본문 폭 상한이 없는 바깥 줄로 옮겨, 830px가 본문 자신만의 순수 폭이
되도록 고쳤다 — `docs/superpowers/tasks/P8-6-body-max-width/`에 이 후속 수정을 기록.

### 2. 반응형 붕괴 지점(브레이크포인트, 실측으로 이분 탐색)

| 요소 | 사라지는(숨는) 뷰포트 폭 구간 | 이 프로젝트 현재 값 |
|---|---|---|
| TOC | 1280px에서 보임, 1024px에서 사라짐(경계는 1024~1280px 사이) — Tailwind `xl`(1280px) 추정 | 해당 기능 없음 |
| 좌측 사이드바 → 햄버거 드로어 | 900px에서 보임, 800px에서 사라짐(경계는 800~900px 사이) | 모바일 오프캔버스 드로어 이미 있음(구체적 브레이크포인트는 `EditorShell.tsx` 참고, 별도 실측 불필요 — 기존 구현 유지) |

### 3. 헤더(공통 상단바)

| 항목 | 레퍼런스 | 이 프로젝트 | 비고 |
|---|---|---|---|
| 높이 | 60px | 56px(`h-14`, "정책 레퍼런스" 헤더 절의 기존 고정 결정) | 4px 차이 — 기존 `h-14` 결정을 뒤집을 근거로 보지 않음(P8-1은 높이 변경을 포함하지 않음) |
| 배경색 | `rgb(250,249,245)`(크림톤, 본문 배경과 거의 동일 — 경계선 없이 톤온톤) | `bg-surface` + `border-b border-border` | 레퍼런스는 구분선이 아니라 톤 차이로만 헤더를 분리 — 참고만 하고 채택 여부는 P8-1에서 판단(테두리 제거는 대비 저하 우려로 기본값은 "유지") |
| 로고 좌측 인셋 | 16px | 사이드바 브랜딩 행 기준 유사 | - |
| 헤더 내 검색 버튼 | 140×30px, `border-radius:12px`, 배경 `rgba(0,0,0,0.05)`, 폰트 14px, 우측에 단축키 `pill`(38px) | 없음 — 이 프로젝트는 `Ctrl+K` 단축키만 있고 헤더에 시각적 트리거가 없음 | P8-1에서 헤더에도 작은 검색 트리거 버튼 추가(신규 검색 로직 아님 — 기존 `GlobalSearchModal`을 여는 버튼만 추가) |

### 4. 좌측 사이드바(문서/카테고리 목록)

| 항목 | 레퍼런스 | 이 프로젝트 현재 값(design.md "정책 레퍼런스 4/5" 참고) |
|---|---|---|
| 목록 항목 패딩 | `padding: 8px`(전방향) | `py-1 pr-2`(4px/8px, 왼쪽은 들여쓰기 inline style) — 2026-09-14(P13-1) 1차 재측정 후, 2026-09-22(P17-21) 문서가 많아지면 화면에 보이는 수가 적다는 지적으로 한 번 더 좁혔다(레퍼런스보다 상하가 훨씬 좁다 — 밀도를 우선) |
| 항목 radius | 12px(`rounded-btn`류) | 명시 안 됨(현재 hover 배경만, radius 미측정 — 확인 필요) |
| 최상위 카테고리(활성/굵게) | 14px/600, 색 `#1A1A1A` | 사이드바는 카테고리 개념이 아직 없음(P7-4 폴더 트리가 이 역할) |
| 하위 항목(비활성) | 14px/400, 색 `#595959`(뮤트 그레이) | 유사(뮤트 텍스트 사용 중) |
| 활성 항목 구분 방식 | 굵기(600) + 진한 색만 — 배경색 강조 없음 | `.sidebar-row-active`(브랜드색 10% 배경 믹스) — 배경 강조 방식, 레퍼런스보다 더 눈에 띄는 방식(변경 불필요, 오히려 이 프로젝트 쪽이 접근성 대비 면에서 안전) |

### 5. 본문 콘텐츠 상단 — 브레드크럼 · 제목

| 항목 | 레퍼런스 | 이 프로젝트 |
|---|---|---|
| 브레드크럼 존재 | 있음(`모든 컬렉션 > Claude > Claude 시작 가이드 > Claude 시작하기`) | 없음(P7-7에서 "폴더 경로 브레드크럼"으로 계획됨, 미착수) |
| 브레드크럼 폰트/색 | 13px/400, 색 `#595959`, 링크 사이 `gap:8px`(구분자 포함), `margin-bottom:16px` | P7-7 구현 시 참고할 스타일 스펙(P8-3에서 이 값을 P7-7의 시각 스펙으로 명시) |
| H1(문서 제목) | 36px/600, `line-height:40.32px`, `margin-bottom:12px` | `text-4xl`(36px) `font-bold` — 크기는 이미 동일, weight 표기(600 vs bold=700)만 다름(허용 오차 범위, 변경 불필요) |
| 제목 아래 메타 행 | 날짜 + "LLM용 복사" 버튼 | 해당 기능 없음(범위 밖 — LLM용 복사 등은 이번 벤치마크에 포함 안 함) |

### 6. 본문 리치 텍스트 타이포 — H2/H3/본문/리스트

| 항목 | 레퍼런스 | 이 프로젝트(design.md "정책 레퍼런스 2" 확정값) |
|---|---|---|
| 본문(p) | 15px/400, `line-height:23.25px`(≈1.55배) | 16px(표준 `prose`) |
| H2 | 22px/600, `margin-bottom:12px` | 24px |
| H3 | 17px/600, `margin-bottom:8px` | 20px |
| 리스트(li) | 15px/400, `margin-bottom:8px` | 16px |

**결론: 이번 벤치마크만으로 타이포 스케일을 바꾸지 않는다(P8-7, 결정 보류).** 현재 값(16/24/20px)은
2026-08-26에 사내 실제 문서 뷰어 **SF-Note**를 실측 비교해 확정한 값이고("문서 편집 화면 —
박스 없는 에디터 캔버스 구조" 절 참고), support.claude.com은 이 프로젝트와 성격이 다른
일반 헬프센터라 같은 근거로 보기 어렵다. 축소(16→15px 등)를 원하면 SF-Note 대비 근거를
다시 확인하고 별도 GitHub Issue로 결정한 뒤 진행한다 — P8-7은 "비교표를 남기는 것"까지만
하고 구현하지 않는다.

### 7. 우측 목차(TOC) — 이 프로젝트에 없는 신규 기능

| 항목 | 레퍼런스 실측값 |
|---|---|
| 컨테이너 | `nav aria-label="이 페이지"`, 폭 240px, `max-height` 뷰포트에 맞춰 동적 계산(스크롤 가능) |
| 레이블("이 페이지") | 13px/600, `margin-bottom:12px` |
| 목차 항목 | 15px/400(컨테이너 상속), 실제 렌더링 폰트는 12px로 축소 표시, `line-height:16.8px` |
| 활성 항목 표시 | **굵기 차이 없음.** `<li>::before`에 `width:2px`, 배경 `rgb(21,21,20)`(거의 검정)인 좌측 바만 표시 + 텍스트 색이 `#595959`→`#151514`로 진해짐. 배경색 강조나 브랜드색 사용 없음 |
| 클릭 동작 | 앵커(`href="#h_..."`)로 스크롤 이동, `aria-current="true"`로 현재 위치 표시 |
| 노출 조건 | ≥1280px에서만(위 "2. 반응형 붕괴 지점" 참고) |

P8-5(TOC 신규 구현) 진행 시 이 표를 그대로 스펙으로 쓴다. 다만 활성 표시 색상은 위
"정책 레퍼런스 3. 컬러톤"의 WCAG AA 대비 규칙을 따라 `--color-brand`/`--color-brand-hover`
중 이 프로젝트 배경에서 대비가 나오는 쪽으로 대체한다(레퍼런스의 무채색 그대로 베끼지
않음 — 이 프로젝트는 이미 브랜드색으로 활성 상태를 표시하는 관례(`.sidebar-row-active`)가
있어 일관성을 맞춘다).

**구조 변경(P8-8, 2026-09-14): 본문과 같은 flex 그룹의 아이템 → 독립된 우측 레일.**
P8-5 최초 구현은 TOC를 본문과 `flex justify-center gap-12`로 묶어 `sticky top-14`로
스크롤에 붙어있는 것처럼 흉내 냈다. 그런데 이 방식은 본문 쪽 flex 아이템의
`align-items` 기본값(stretch)이 TOC를 본문과 같은 높이(문서 전체 길이)로 늘려버려
`sticky`가 계산상 무효화되는 문제를 반복적으로 냈다("스크롤하면 목차가 안 보인다").
사용자가 벤치마킹한 참고 사이트를 다시 확인해보니, 그 사이트의 TOC는 애초에 본문과
같은 스크롤 그룹에 속한 게 아니라 **좌측 사이드바와 동급으로 스크롤 영역 밖에 있는
완전히 독립된 컬럼**(자기 안에서만 스크롤)이었다 — `sticky` 흉내가 아니라 구조 자체가
다른 것이었다.

그래서 TOC를 `EditorShell`의 우측 레일 슬롯(`TocRailContext`, `EditorShell.tsx`/
`TableOfContents.tsx` 참고)으로 옮겼다: 사이드바처럼 `flex-1 overflow-y-auto`(본문
스크롤 영역) **밖**의 형제 컬럼이라 본문을 아무리 스크롤해도 전혀 움직이지 않고,
`sticky` 계산 자체가 필요 없다. `EditorShell`은 `/editor` 아래 모든 라우트(문서 목록
포함)의 공용 레이아웃이라 TOC 데이터를 모르므로, TOC 데이터를 아는 쪽(TableOfContents,
문서 편집 화면에서만 마운트)이 Context로 받은 setter로 자신을 그 레일에 밀어 넣는다 —
문서 편집 화면 자체가 아닌 다른 라우트(문서 목록 등, `TableOfContents`가 아예
마운트되지 않음)에서는 레일이 렌더링되지 않는다.

**폭 고정(2026-09-22, P17-24)**: 처음엔 헤딩이 0개면 레일 슬롯 자체를 비웠다(`null`)
— 그러면 레일 컬럼(w-60, 240px)이 통째로 사라져 본문의 실제 가용 폭이 바뀐다. 문서를
여는 순간 본문 DOM이 마운트 다음 커밋에야 붙는 타이밍(`RichTextEditor`의
`immediatelyRender: false`)과 겹치면, 처음엔 헤딩이 0개로 스캔돼 레일 없이 그려졌다가
뒤늦게 헤딩이 발견되며 레일이 튀어나오는 순간 본문 폭이 좁아져 좌우로 흔들리는
것처럼 보였다(사용자 지적 — "toc가 있을 때와 없을 때, 컨텐츠 사이즈가 맞춰지는
과정에서 좌우로 흔들린다"). 이제는 헤딩이 있든 없든 레일의 바깥 spacer(헤더 높이
맞춤용 `div`)는 항상 밀어 넣어 컬럼 폭 자체는 `TableOfContents`가 마운트되는 순간부터
고정해 두고, 실제 목차 콘텐츠(`<nav aria-label="이 페이지">`)만 헤딩이 있을 때 그 안에
조건부로 넣는다 — 헤딩이 전혀 없는 문서에서도 레일 자리(빈 컬럼)는 그대로 차지한다.
헤딩이 없는 문서에서 "이 페이지" 목차 랜드마크 자체가 없어야 한다는 접근성 계약은
유지된다(바깥 spacer는 `nav`가 아닌 `div`).

같이 발견된 활성 항목(`aria-current`) 버그 두 가지도 이번에 고쳤다 — 자세한 이유는
`TableOfContents.tsx`의 `computeActiveHeading` 주석 참고:
- 문서를 막 열었을 때 첫 헤딩이 아직 "지금 섹션" 판정 기준선에 들어오지 않으면 아무
  항목도 활성 표시되지 않던 문제 → 기준선을 지난 헤딩이 하나도 없으면 첫 헤딩을
  기본값으로 활성화한다.
- 마지막 헤딩 뒤 여백이 짧은 문서는 스크롤이 최대치에 막혀 마지막 헤딩이 "지금 섹션"
  기준선 안으로 절대 들어올 수 없어(그 항목을 클릭해도 마찬가지) 영영 활성화되지
  않던 문제 → 스크롤이 바닥에 닿았으면 위치 계산과 무관하게 마지막 헤딩을 활성으로
  본다.

### 8. 검색 — 위치는 다르지만 실제로는 같은 방식(모달 트리거)

레퍼런스의 홈 화면(`support.claude.com/ko`)에는 히어로 영역에 420×49px, `border-radius:12px`
짜리 큰 검색 버튼이 있어 "메인 화면에서 바로 검색되는 것처럼" 보인다. 하지만 실측해 보니
이것도 `<input>`이 아니라 `<button class="DocsSearchButton_button">`이고, 클릭하면 헤더의
작은 검색 버튼(140×30px)과 **동일한 커맨드 팔레트 모달**을 연다 — 실제 입력창이 그 자리에
있는 게 아니라 "모달을 여는 트리거 버튼"을 두 군데(헤더 + 히어로)에 크기만 다르게 배치한
것이다.

이 프로젝트에 이미 있는 `GlobalSearchModal`(Ctrl+K)과 정확히 같은 구조라, P8-4는 처음에는
**새 검색 기능을 만들지 않고** 소개/랜딩 화면 히어로 영역에 같은 모달을 여는 큰 버튼만
추가했다.

**2026-09-10, 사용자 UX 검토로 제거**: 랜딩 화면에 헤더 검색 버튼(P8-1)과 완전히 같은
동작을 하는 버튼이 하나 더 있어 한 화면에 검색 진입점이 3개(헤더 버튼·랜딩 히어로 버튼·
사이드바 문서 목록의 제목/태그 필터)가 되는 게 좋은 UI인지 지적받았다. 레퍼런스가 헤더+
히어로에 같은 버튼을 두 번 두는 이유는 불특정 다수가 처음 방문하는 공개 헬프센터라 "Ctrl+K를
모르는 신규 방문자에게 큰 CTA로 한 번 더 알려주는" 맥락이 있기 때문인데, 이 프로젝트는
같은 팀원이 반복해서 쓰는 사내 도구라 그 맥락이 약해 중복의 실익이 낮다고 판단해
`LandingSearchButton.tsx`와 이를 위해 만들었던 `GlobalSearchContext.tsx`를 제거했다(둘
다 헤더 검색 버튼(P8-1)에는 영향 없음 — `EditorShell.tsx`의 `triggerSearch`/`openSignal`
배선은 그대로 유지). 이후 "메인 화면에 바로 검색"을 다시 원하면 이 절의 실측값(420×49px,
radius:12px)을 그대로 재사용할 수 있다.

## 문서-코드 드리프트 방지 (2026-08-25, UI 진단 Phase 3)

이 문서의 "Task 14/15 검증" 절들은 `@sfood/ui`의 특정 시점 타입 정의(`node_modules/@sfood/ui/dist/index.d.ts`)를
근거로 한 결정이다. `@sfood/ui`가 업그레이드되어 그 타입이 바뀌면(예: `Sidebar`가 `children`을 지원하게
되거나, `ChipGroup`이 다중 선택을 지원하게 되면) 이 문서의 서술이 조용히 낡아 버린다. 그 근거가 되는
타입 사실을 `src/components/editor/design-system-contract.test.ts`에 `expectTypeOf`로 인코딩해 뒀다 —
`@sfood/ui`를 업그레이드했는데 `tsc --noEmit`(또는 `npm test`)이 이 파일에서 실패하면, 그 부분의 결정을
다시 검증하고 이 문서를 갱신해야 한다는 신호다.
