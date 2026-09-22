# P17-23: 헤더는 항상 꽉 채우고 본문만 가운데 정렬 — 검증 기록

## 자동화 테스트
| 커맨드 | 결과 |
|---|---|
| `npx vitest run src/components/editor/EditorShell.test.tsx src/components/editor/DocumentEditor.test.tsx src/components/editor/TableOfContents.test.tsx src/components/editor/EditorSidebar.test.tsx` | 통과 (166/166, 회귀 없음) |
| `npx tsc --noEmit -p .` | 통과 |
| `npx eslint src/components/editor/EditorShell.tsx` | 통과 (경고/에러 없음) |
| `npm run build` | 통과 (컴파일·타입체크·정적 페이지 생성 모두 성공, 디버그 라우트 없음 확인) |

## 수동 검증(문제 재현 → 수정 → 재검증)
`/editor`는 AX Auth 로그인 게이트 뒤에 있어 이 세션에서 직접 열 수 없다.
`EditorShell`+`DocumentEditor`를 임시 라우트(`/dev-preview-header-check`, 검증
후 즉시 삭제)에서 함께 마운트해 Browser pane(Chromium)으로 확인했다.

1. **수정 전 재현(1920px 뷰포트, P17-22 상태)**: 사용자 스크린샷과 일치하는
   증상 — 헤더가 사이드바 오른쪽 끝(256)이 아니라 그보다 더 안쪽에서 시작하고,
   TOC도 화면 오른쪽 끝(1920)이 아니라 그보다 안쪽에서 끝났다(둘 다 대칭적으로
   182px씩 안쪽으로 밀림 — 버그는 아니었지만 헤더까지 좁아지는 게 문제).
2. **수정 후 재확인(같은 1920px 뷰포트)**:
   - 헤더(`<header>`) `left: 256, right: 1680` — 정확히 사이드바 오른쪽 끝부터
     TOC 왼쪽 끝까지, 빈틈 없이 꽉 참.
   - TOC 레일(`nav[aria-label="이 페이지"]`) `left: 1680, right: 1920` — 화면
     진짜 오른쪽 끝에 정확히 닿음.
   - 본문 텍스트(`max-w-[920px]` 컨테이너) `left: 508, right: 1428` — 헤더가
     차지한 1424px 칼럼 안에서 자체적으로 가운데 정렬(양쪽 252px)됨.

## 발견된 문제와 조치
- **원인**: P17-22가 "본문+TOC"를 하나로 묶어 최대폭(1300px)으로 가운데
  정렬했는데, 그 "본문" 안에 문서 헤더(툴바)까지 포함돼 있어 헤더까지 함께
  좁아지고 밀렸다.
- **조치**: 그 wrapper를 제거하고 TOC를 다시 독립된, 화면 진짜 오른쪽 끝에
  고정된 컬럼으로 되돌렸다 — 헤더는 자동으로 다시 자기 칼럼 전체를 채운다.
- **재검증 결과**: 위 "수동 검증" 2번, 자동화 테스트로 확인.

## 검증 중 새로 발견한 결정 사항
없음.

## 최종 판정
- [x] 수용 기준(`task.md`)을 모두 만족함 — PRD 갱신 가능.
