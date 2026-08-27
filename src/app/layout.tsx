import type { Metadata } from "next";
import localFont from "next/font/local";
import Providers from "./providers";

// 실서비스(ax-wiki.s-food.ai)와 동일한 Pretendard Variable을 이 프로젝트에도 self-host
// 한다(2026-08-26, 사용자 요청 — "폰트 확인해서 변경 가능한 지 확인"). globals.css의
// body 규칙은 원래도 폰트 스택에 "Pretendard"를 적어 두고 있었지만 실제 폰트 파일을
// 어디서도 불러온 적이 없어 조용히 시스템 폰트(맑은 고딕)로만 렌더링되고 있었다 — 이
// 변수를 <html>에 심어 globals.css에서 `var(--font-pretendard)`로 실제 적용한다.
const pretendard = localFont({
  src: "../../node_modules/pretendard/dist/web/variable/woff2/PretendardVariable.woff2",
  variable: "--font-pretendard",
  weight: "45 920",
  display: "swap",
});
// `@sfood/ui/global.css`(전체) 대신 토큰 CSS만 직접 불러온다. 그 파일은 자체적으로
// `@tailwind base/components/utilities`를 한 번 더 실행하는데, 이 프로젝트의 Tailwind
// 컴파일(globals.css의 `@import "tailwindcss"`)과 별개의 두 번째 컴파일이 되어 버려서
// 그 결과물이 `@layer` 밖(unlayered)에 쌓인다 — CSS Cascade Layers 규칙상 레이어 밖 규칙은
// 특정성과 무관하게 모든 레이어드 규칙(반응형 variant 포함, 이 프로젝트의 유틸리티 전부)을
// 이겨 버린다. 실측: `md:hidden`이 데스크톱 폭에서도 안 먹히고(중복 생성된 언레이어드
// `.flex`가 이김), 브랜드 컬러 재정의도 이 방식으로 조용히 무력화됐었다(2026-08-25 UI
// 진단). 토큰 값(`tokens/base.css`/`tokens/semantic.css`)만 있으면 되므로, 나머지
// Tailwind 산출물은 우리 쪽 단일 컴파일(빌드에 `@source`로 `@sfood/ui/dist`를 포함)에
// 맡긴다. `body`의 배경/글자색/폰트 스무딩은 globals.css의 `body` 규칙에서 대신 선언한다.
import "@sfood/ui/tokens/base.css";
import "@sfood/ui/tokens/semantic.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "SFOOD IT Editor",
  description: "SFOOD IT 담당 및 AX팀을 위한 사내 문서 작성 도구",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // suppressHydrationWarning — 아래 스크립트가 hydration 전에 <html>의 data-theme
    // 속성을 서버 렌더 결과와 다르게 만들 수 있어(그게 목적이다, FOUC 방지) React가
    // 이 속성 하나에 대해서만 경고를 띄운다. 의도된 불일치이므로 억제한다(속성 값
    // 자체를 검증하지 않게 되는 게 아니라, 이 한 요소의 hydration 경고만 조용해진다).
    <html lang="ko" className={pretendard.variable} suppressHydrationWarning>
      <body>
        {/*
          ThemeToggle(src/components/ThemeToggle.tsx)이 저장한 명시적 테마 선택을
          hydration 전에 <html>에 적용한다 — 그렇지 않으면 OS 다크 설정 사용자가
          라이트를 골라도 새로고침 때마다 잠깐 다크로 그려졌다가 바뀌는 깜빡임(FOUC)이
          생긴다. try/catch로 감싸 localStorage 접근이 막힌 환경(프라이빗 브라우징 등)에서도
          안전하게 무시된다.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{var t=localStorage.getItem('sfood-editor-theme');if(t==='light'||t==='dark'){document.documentElement.setAttribute('data-theme',t);}}catch(e){}",
          }}
        />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
