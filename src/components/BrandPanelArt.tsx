/**
 * 로그인 화면 왼쪽 브랜드 패널용 장식 일러스트. "회사"(식품 기업 — 줄기·잎)와
 * "에디터"(문서 작성 도구 — 문서·펜)라는 두 개념을 하나의 라인아트로 결합했다
 * (2026-08-25, 사용자 요청). `@sfood/ui`의 이미지 생성 도구가 이 계정 플랜에서
 * 막혀 있어(Recraft "Requires basic plan or higher") 직접 SVG로 그렸다 — 외부
 * 이미지 자산 없이 코드로 관리되고, 브랜드 토큰이 바뀌면 자동으로 따라간다(색상은
 * 하드코딩하지 않고 `currentColor`만 쓴다 — 부모가 `text-on-brand`를 지정).
 */
export function BrandPanelArt({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 600 760"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <circle cx="470" cy="150" r="130" stroke="currentColor" strokeOpacity="0.08" strokeWidth="1.5" />
      <circle cx="90" cy="640" r="170" stroke="currentColor" strokeOpacity="0.07" strokeWidth="1.5" />

      <g transform="translate(90,90) scale(1.05)">
        {/* 줄기·잎 — 식품 기업 */}
        <g stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" fill="none">
          <path d="M70 430 C 58 372, 78 322, 122 284" strokeWidth="3" strokeOpacity="0.9" />
          <path
            d="M84 380 C 56 372, 38 346, 46 318 C 76 324, 92 350, 84 380 Z"
            strokeWidth="2.5"
            strokeOpacity="0.8"
          />
          <path
            d="M104 330 C 78 316, 68 288, 82 262 C 108 274, 118 304, 104 330 Z"
            strokeWidth="2.5"
            strokeOpacity="0.8"
          />
        </g>

        {/* 문서 더미 — 에디터 */}
        <g stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
          <rect
            x="150"
            y="176"
            width="150"
            height="192"
            rx="12"
            fill="currentColor"
            fillOpacity="0"
            stroke="currentColor"
            strokeOpacity="0.3"
            strokeWidth="3"
          />
          <rect
            x="166"
            y="158"
            width="150"
            height="192"
            rx="12"
            fillOpacity="0"
            stroke="currentColor"
            strokeOpacity="0.55"
            strokeWidth="3"
          />
          <path
            d="M182 140 H316 a13 13 0 0 1 13 13 V318 a13 13 0 0 1 -13 13 H182 a13 13 0 0 1 -13 -13 V153 a13 13 0 0 1 13 -13 Z"
            fillOpacity="0"
            stroke="currentColor"
            strokeWidth="3"
          />
          <line x1="198" y1="182" x2="284" y2="182" stroke="currentColor" strokeWidth="2.5" strokeOpacity="0.9" />
          <line x1="198" y1="208" x2="284" y2="208" stroke="currentColor" strokeWidth="2.5" strokeOpacity="0.9" />
          <line x1="198" y1="234" x2="258" y2="234" stroke="currentColor" strokeWidth="2.5" strokeOpacity="0.9" />
          <line x1="198" y1="260" x2="284" y2="260" stroke="currentColor" strokeWidth="2.5" strokeOpacity="0.55" />
          <line x1="198" y1="286" x2="250" y2="286" stroke="currentColor" strokeWidth="2.5" strokeOpacity="0.55" />
        </g>

        {/* 만년필 — 줄기에서 뻗어나와 문서에 닿는다("씀"으로 이어지는 흐름) */}
        <g strokeLinecap="round" strokeLinejoin="round">
          <path d="M122 284 L266 130" stroke="currentColor" strokeWidth="4" />
          <path
            d="M266 130 L286 108 L300 92 L316 108 L300 124 L280 146 Z"
            fill="currentColor"
            stroke="currentColor"
            strokeWidth="1"
          />
        </g>
      </g>
    </svg>
  );
}
