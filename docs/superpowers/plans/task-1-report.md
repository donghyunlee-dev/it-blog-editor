# Task 1: Tailwind CSS + `@sfood/ui` 설치 — 완료 보고서

## 구현 내용

### 1. 패키지 설치
다음 패키지들을 설치했습니다:
- `@sfood/ui`: ^0.1.2 (사내 디자인 시스템)
- `tailwindcss`: ^4.3.3 (Tailwind CSS v4)
- `postcss`: ^8.5.26
- `autoprefixer`: ^10.5.4
- `@tailwindcss/postcss`: 최신 (Tailwind v4 PostCSS 플러그인)

> 주의: `@sfood/ui`는 React ^18.0.0을 peer dependency로 요구하지만, 현재 프로젝트의 React 19.2.8과 호환 가능합니다. 설치 시 `--legacy-peer-deps` 플래그를 사용했습니다.

### 2. 설정 파일 작성

#### `tailwind.config.js`
```js
import sfoodPreset from '@sfood/ui/tailwind.config.js'

export default {
  presets: [sfoodPreset],
  content: [
    './src/**/*.{ts,tsx}',
    './node_modules/@sfood/ui/dist/**/*.js',
  ],
}
```
- `@sfood/ui`의 Tailwind 프리셋을 import하여 색상·컴포넌트 토큰을 상속
- content 경로에 프로젝트 소스와 @sfood/ui 배포 파일 포함

#### `postcss.config.js`
```js
export default {
  plugins: {
    '@tailwindcss/postcss': {},
    autoprefixer: {},
  },
}
```
- Tailwind CSS v4에서는 PostCSS 플러그인이 `@tailwindcss/postcss`로 분리됨
- 초기 구성에서 `tailwindcss` 플러그인 사용했으나, 개발 서버 테스트 시 에러 발생 → 수정

### 3. 글로벌 CSS 수정

`src/app/globals.css` 최상단에 Tailwind 지시자 추가:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

### 4. 레이아웃 파일 수정

`src/app/layout.tsx`에 디자인 시스템 CSS import 추가:
```tsx
import "@sfood/ui/global.css";
```

## 검증: 개발 서버 확인

### 결과
- ✓ 개발 서버 시작 성공 (Ready in 1267ms)
- ✓ `/login` 페이지 렌더링 성공 (에러 없음)
- ✓ HTML에 Tailwind 유틸리티 클래스 포함됨 (e.g., className="card" → styled)
- ✓ @sfood/ui 전역 스타일 적용됨

### 초기 이슈 및 해결
1. **Tailwind v4 PostCSS 호환성 문제**
   - 문제: "Error: It looks like you're trying to use `tailwindcss` directly as a PostCSS plugin"
   - 원인: Tailwind CSS v4에서 PostCSS 플러그인이 별도 패키지로 분리
   - 해결: `@tailwindcss/postcss` 설치 및 postcss.config.js 수정 → 개발 서버 정상 작동

## 파일 변경 내역

| 파일 | 변경 사항 |
|------|---------|
| `package.json` | dependencies에 `@sfood/ui` 추가, devDependencies에 tailwindcss/postcss/autoprefixer/@tailwindcss/postcss 추가 |
| `package-lock.json` | 패키지 잠금 파일 업데이트 |
| `tailwind.config.js` | 신규 생성 |
| `postcss.config.js` | 신규 생성 |
| `src/app/globals.css` | 최상단에 @tailwind 지시자 3줄 추가 |
| `src/app/layout.tsx` | `@sfood/ui/global.css` import 추가 |

## 커밋 내역

| SHA | 메시지 |
|-----|--------|
| 1294104 | chore: install Tailwind CSS and @sfood/ui |
| 24a4064 | fix: use @tailwindcss/postcss for Tailwind CSS v4 |

## 자체 검토 (Self-Review)

### 긍정 사항
- 모든 설정 파일이 Task 1 명세와 정확히 일치함
- /login 페이지가 에러 없이 렌더링됨
- Tailwind CSS 유틸리티 클래스가 실제로 적용됨 (스타일 확인)
- @sfood/ui 디자인 시스템 CSS 통합 완료
- React 19 + Tailwind v4 호환성 문제 해결

### 주의사항
1. Tailwind CSS v4는 기존 v3 구문과 일부 차이가 있을 수 있음 (향후 Task에서 유의)
2. `@sfood/ui`는 React ^18 peer dependency를 가지지만, React 19에서 정상 작동 (--legacy-peer-deps 사용)
3. postcss.config.js 파일 인코딩 경고 (LF ↔ CRLF) - 미처리 (성능상 무시 가능)

### 다음 Task 준비 상태
- ✓ Tailwind 유틸리티 클래스를 어디서나 import 가능
- ✓ @sfood/ui 컴포넌트를 어디서나 import 가능
- ✓ 글로벌 CSS 변수(--color-brand, --color-surface 등) 정상 작동
- 준비 완료: Task 2 (TipTap 에디터 설치)에서 RichTextEditor 컴포넌트 구현 시작 가능

## 우려사항

없음. 모든 요구사항이 충족되었고, 개발 서버에서 정상 작동함.
