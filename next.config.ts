import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },
  // 개발 모드 온스크린 인디케이터("N" 로고 배지)의 기본 위치가 bottom-left라 사이드바
  // 하단의 로그아웃 영역과 겹쳐 보였다(2026-08-26, 사용자가 브라우저 확장 아이콘으로
  // 오인했던 원인 — node_modules/next/dist/docs/.../devIndicators.md 확인). 프로덕션
  // 빌드에는 아예 나오지 않는 개발 전용 기능이라 완전히 끄기보다 자리만 옮긴다.
  devIndicators: {
    position: "bottom-right",
  },
  // 개발 모드(`next dev`) 전용 fetch 캐시 — 기본적으로 켜져 있고, `cache: 'no-store'`로
  // 호출한 요청까지도 캐시해 HMR 사이에 재사용한다. router.refresh()는 이 캐시를 지우지
  // 않는다(문서: "cache will be cleared on navigation or full-page reloads" — refresh()는
  // 둘 다 아니다). 게시 설정을 바꾸면 서버에서 Confluence 페이지 폴더는 실제로 옮겨지는데,
  // 사이드바가 다시 목록을 읽어올 때 이 캐시된(옛) 응답을 돌려받아 즉시 반영이 안 됐다
  // (2026-08-26, 사용자 피드백 — "게시 여부가 변경이 되어도 메인 문서함에 바로 반영이
  // 안되네"). 실제 배포 빌드에는 이 캐시 자체가 없는 개발 전용 문제라 꺼서 항상 최신
  // Confluence 상태를 보여주게 한다.
  experimental: {
    serverComponentsHmrCache: false,
  },
};

export default nextConfig;
