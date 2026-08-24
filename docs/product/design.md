# 🎨 디자인 시스템 적용 가이드 — SFOOD IT Editor

## 개요
- 사내 디자인 시스템 `@sfood/ui`(Storybook 문서: https://sfood-design-system.vercel.app/?path=/docs/docs-getting-started--docs)를 이 프로젝트에 도입한다.
- 지금까지 `src/app/globals.css`에 직접 만들어 쓰던 커스텀 클래스(`.page`, `.card`, `.button-primary` 등)는 `@sfood/ui` 컴포넌트와 토큰으로 단계적으로 대체한다.
- 관련 문서: [requirements.md](./requirements.md), [architecture.md](./architecture.md), [prd.md](./prd.md), 화면 설계는 [docs/superpowers/specs/2026-08-21-editor-ui-ux-design.md](../superpowers/specs/2026-08-21-editor-ui-ux-design.md) 참고.

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
```ts
// src/app/layout.tsx (기존 globals.css import 옆에 추가)
import '@sfood/ui/global.css'
```

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
실제로는 `LoginSimple`을 쓰지 않는다 — 이유는 아래 "로그인 화면 — `LoginSimple`을 쓰지 않은 이유 (Task 15 검증)" 참고.

## 이 프로젝트에서 쓸 컴포넌트 매핑

Storybook 사이드바에서 확인한 실제 컴포넌트 목록 중, 이번 화면 설계에서 쓰기로 한 것만 정리한다(전체 목록은 Storybook 사이드바 참고).

| 화면/요소 | 컴포넌트 | 비고 |
|---|---|---|
| 로그인 화면 | `Card` + `Typography` + `Alert` + `Button` 토큰 클래스를 입힌 `<a>` | `LoginSimple`은 email/password 폼 전용이라 쓰지 않음 — 아래 "로그인 화면 — `LoginSimple`을 쓰지 않은 이유 (Task 15 검증)" 참고 |
| 좌측 사이드바(앱 셸) | 직접 마크업(`<aside>`) + `StatusBadge`/`Tag`/`ChipGroup`/`EmptyState` + `Button` 토큰 클래스 | `Sidebar`·`List`가 이 용도에 맞지 않아 컨테이너와 문서 행은 직접 짜고, 그 안의 개별 요소(상태 뱃지·태그·필터·빈 상태)만 컴포넌트를 쓴다. 아래 "확인된 사항"과 `src/components/editor/EditorSidebar.tsx` 참고 |
| 문서 상태 뱃지(초안/게시됨) | `StatusBadge` | 상태 표시 전용 컴포넌트. `status`(`StatusVariant`)로 색을, `label`로 텍스트를 넘긴다 — `children`은 받지 않는다 |
| 문서 태그 표시·필터 | `Tag`, `ChipGroup` | 목록 화면의 읽기 전용 태그는 `Tag`(`onRemove` 생략), 태그 필터는 `ChipGroup`(단일 선택 — 같은 칩을 다시 클릭하면 해제되도록 `onChange` 쪽에서 토글 처리) |
| 문서 목록 항목 | 직접 마크업(`<ul>`/`<li>`/`Link`) + `StatusBadge` + `Tag` | 기존 `<ul className="doc-list">`를 대체. `List`가 아니라 직접 만든 이유는 아래 "확인된 사항" 참고 |
| 문서함 빈 상태 | `EmptyState` | 기존 `.empty-state` 카드를 대체 |
| 버튼 전체 | `Button` (`variant="primary"/"secondary"/"danger"`) | 한 화면에 `primary`는 1개만 쓰는 원칙(Do/Don't 참고) |
| 폼 필드(게시 설정 등) | `FormField`, `Input`, `Textarea`, `Switch` | 라벨·에러를 `FormField`로 감싸는 패턴 |
| 문서 삭제 확인 | `Modal` | 기존 `window.confirm()`을 대체 |
| 저장 성공/실패 알림 | `Toast`(`useToast()`) | 기존 인라인 `<p className="error-text">`를 대체 |
| 게시 설정의 뷰어별 카드 | `Card` | 뷰어(Tech Blog 등)마다 하나씩 |
| 버블 툴바 / 슬래시 메뉴 위치 지정 | `Popover` | 텍스트 선택 위치·커서 위치에 뜨는 오버레이의 기반으로 사용 |

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
  표시는 `Tag`, 태그 필터는 `ChipGroup`, 문서가 없을 때는 `EmptyState`. "새 문서" 버튼은 실제 이동이
  필요해 `<Link>`로 만들되, `Button`은 `<button>`만 지원해(href 없음) 대신 `Button variant="primary"`가
  쓰는 것과 같은 토큰 클래스(`bg-brand`, `text-on-brand`, `hover:bg-brand-hover` 등)를 그대로 입혀
  "이 화면의 유일한 1차 액션"이라는 시각적 의미를 유지했다.

## 로그인 화면 — `LoginSimple`을 쓰지 않은 이유 (Task 15 검증)

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
- **최종적으로 실제 쓴 구성**: `Card`(`padding="lg"`)를 카드 컨테이너로, `Typography`(`variant="h1"`,
  시각적 크기만 `className`으로 축소 — 이 페이지에 다른 헤딩이 없어 문서 헤딩 계층을 h1부터
  시작해야 함)로 제목/부제목을, `Alert`(`variant="danger"`)로 로그인 실패·AX Auth 미설정 안내를
  표시한다. "MS 계정으로 로그인" 액션은 외부 URL로 실제 이동해야 해서 `Button`(`ButtonHTMLAttributes`
  기반, `href` 없음)이 아니라 `<a href={loginUrl}>`을 쓰되, `Button variant="primary" size="md"`가
  내부적으로 쓰는 것과 같은 토큰 클래스(`bg-brand`, `text-on-brand`, `hover:bg-brand-hover`,
  `rounded-btn` 등)를 그대로 입혀 "이 화면의 유일한 1차 액션"이라는 시각적 의미를 유지했다(사이드바의
  "새 문서" 링크와 동일한 패턴 — `src/components/editor/EditorSidebar.tsx` 참고).

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
→ 편집 화면 하단 버튼(저장/삭제/게시 설정 이동)을 재설계할 때, "저장"만 `primary`로 두고 "삭제"는 `danger`, "게시 설정"은 `secondary`로 구분한다(지금 코드의 `button-danger-outline`과 방향은 같지만 컴포넌트로 교체).

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

기존 `globals.css`의 `--color-brand: #e4002b;` 등 커스텀 토큰 값은 `@sfood/ui` 도입 시 그대로 유지할지, 디자인 시스템의 기본 브랜드 색으로 맞출지는 실제 도입 작업(Task)에서 디자인 담당자와 다시 확인한다 — 이 문서에서는 "토큰 체계를 `@sfood/ui` 방식으로 통일한다"까지만 정하고, 정확한 색상 값은 확인되지 않은 사항으로 남긴다.

## 확인되지 않은 사항
- 기존 브랜드 색상(`#e4002b`)을 `@sfood/ui` 토큰에 그대로 반영할지 여부.

## 확인된 사항
- ~~`ChipGroup`이 "태그를 자유롭게 입력해서 추가"하는 입력 모드를 지원하는지~~ → **지원하지 않는다.**
  `ChipGroup({ items, value, onChange })`는 미리 정해진 `items` 목록 중 하나를 고르는 단일 선택
  세그먼트 컨트롤(`role="tablist"`/`role="tab"`)이고, 자유 입력 슬롯이 없다. 태그를 새로 "입력"하는
  화면(문서 작성/수정의 태그 입력, Task 13)은 `Tag` + 일반 `<input>`을 조합한 커스텀 컴포넌트
  (`src/components/editor/TagInput.tsx`)로 구현했고, 태그로 "필터링"하는 화면(이 문서의 사이드바 앱
  셸, Task 14)은 그 정해진-목록 선택 특성이 정확히 맞아 `ChipGroup`을 그대로 썼다(선택된 칩을 다시
  클릭하면 필터가 풀리는 토글 동작은 `value`/`onChange`를 감싸는 쪽에서 구현).
