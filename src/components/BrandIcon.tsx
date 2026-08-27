/**
 * 로그인 화면의 브랜드 일러스트(BrandPanelArt.tsx)를 작은 크기(파비콘, 사이드바
 * 로고)에서도 알아볼 수 있도록 축약한 아이콘이다(2026-08-26, 사용자 요청 — "왼쪽
 * 이미지를 축약해서 아이콘으로"). 원본의 줄기·잎(식품 기업 상징)은 24px 안팎에서는
 * 뭉개져 안 보이므로 뺐고, 가장 알아보기 쉬운 핵심 모티프인 "문서 + 만년필"만
 * 남겼다. BrandPanelArt와 달리 배경까지 포함한 독립형 아이콘이다(파비콘처럼 부모
 * 요소의 색을 물려받을 문맥이 없는 곳에도 쓰이므로) — 배경은 브랜드 토큰이 아니라
 * `@sfood/ui`가 실제 쓰는 brand-600(#d65050) 값을 그대로 hex로 굳혔다(파비콘 등
 * CSS 변수를 못 읽는 정적 컨텍스트에서도 항상 같은 색으로 보여야 하기 때문 —
 * `src/app/icon.svg`도 이 파일과 같은 도형을 정적 SVG로 복제해 둔 것이다).
 */
export function BrandIcon({ size = 24, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={className}
    >
      <rect width="32" height="32" rx="7" fill="#d65050" />
      <rect x="8" y="7" width="13" height="18" rx="2" fill="none" stroke="white" strokeWidth="1.6" />
      <line x1="10.5" y1="12.5" x2="18.5" y2="12.5" stroke="white" strokeWidth="1.4" strokeLinecap="round" />
      <line x1="10.5" y1="16.5" x2="18.5" y2="16.5" stroke="white" strokeWidth="1.4" strokeLinecap="round" />
      <line x1="10.5" y1="20.5" x2="15.5" y2="20.5" stroke="white" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M9 25 L23 8" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M21 7 L26 4.5 L28 7 L25.5 11 Z" fill="white" />
    </svg>
  );
}
