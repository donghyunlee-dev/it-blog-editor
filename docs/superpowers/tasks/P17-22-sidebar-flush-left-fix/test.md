# P17-22: 사이드바를 다시 항상 왼쪽에 고정 — 검증 기록

## 자동화 테스트
| 커맨드 | 결과 |
|---|---|
| `npx vitest run src/components/editor/EditorShell.test.tsx src/components/editor/DocumentEditor.test.tsx src/components/editor/TableOfContents.test.tsx src/components/editor/EditorSidebar.test.tsx` | 통과 (166/166) |
| `npx tsc --noEmit -p .` | 통과 |
| `npx eslint src/components/editor/EditorShell.tsx src/components/editor/EditorShell.test.tsx` | 통과 (경고/에러 없음) |
| `npm run build` | 통과 (컴파일·타입체크·정적 페이지 생성 모두 성공, 디버그 라우트 없음 확인) |

## 수동 검증(문제 재현 → 수정 → 재검증)
`/editor`는 AX Auth 로그인 게이트 뒤에 있어 이 세션에서 직접 열 수 없다.
`EditorShell`+`DocumentEditor`를 임시 라우트(`/dev-preview-sidebar-fix`, 검증
후 즉시 삭제)에서 함께 마운트해 Browser pane(Chromium)으로 확인했다.

1. **2200px(최대폭 1300px 초과) 뷰포트**:
   - 사이드바 링크(`a[href="/editor"]`) `left: 8` — 사용자가 보고한 것과 같은
     불필요한 왼쪽 여백이 사라짐(브랜딩 행 자체의 8px 안쪽 패딩만 남음).
   - 본문(`max-w-[920px]`) `left: 648, right: 1568`.
   - TOC 레일 `left: 1638, right: 1878`.
   - 대칭 확인: 사이드바 오른쪽 끝(256)부터 본문+TOC 묶음 시작(578, 위 rect 기반
     역산)까지 322px, 묶음 끝(1878)부터 뷰포트 끝(2200)까지도 322px로 정확히
     대칭.
2. **1440px(최대폭 이하) 뷰포트**: TOC 레일 `right: 1440` — 화면 진짜 오른쪽
   끝에 정확히 닿음. `max-w-[1300px]`가 전혀 작동하지 않아(콘텐츠 자체가 이미
   더 좁음) P17-18 이전과 동일한 배치임을 확인.

## 발견된 문제와 조치
- **원인**: P17-18이 사이드바까지 포함한 워크스페이스 전체를 `mx-auto
  max-w-[1800px]`로 감쌌는데, 실사용 화면에서 사이드바 왼쪽에만 여백이 생기고
  오른쪽(본문/TOC)은 실제로 끝까지 차 있는 비대칭 현상이 나타났다(정확한 근본
  원인은 재현하지 못했다 — result.md "주의사항" 참고).
- **조치**: 사용자 확인에 따라 사이드바는 항상 왼쪽에 고정하는 원래 구조로
  되돌리고, "넓은 화면 여백 방지"라는 목표는 본문+TOC 묶음에만 최대폭(1300px)을
  적용하는 것으로 범위를 좁혀 재구현했다.
- **재검증 결과**: 위 "수동 검증" 1·2번, 자동화 테스트로 확인.

## 검증 중 새로 발견한 결정 사항
없음.

## 최종 판정
- [x] 수용 기준(`task.md`)을 모두 만족함 — PRD 갱신 가능.
