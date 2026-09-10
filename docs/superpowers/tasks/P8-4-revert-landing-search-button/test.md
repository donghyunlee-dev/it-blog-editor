# P8-4 되돌리기: 랜딩 화면 검색 버튼 제거 — 검증 기록

## 자동화 테스트
변경 파일과 직접 연관된 테스트만 실행했다(전체 스위트는 돌리지 않음 — CLAUDE.md 갱신된
정책 참고).

| 커맨드 | 결과 |
|---|---|
| `npx tsc --noEmit` | 통과, 에러 없음 |
| `npx vitest run src/components/editor/EditorShell.test.tsx src/components/editor/GlobalSearchModal.test.tsx src/components/editor/EditorSidebar.test.tsx` | 3개 파일, 97개 전부 통과 |
| `npx eslint src/app/editor/page.tsx src/components/editor/EditorShell.tsx src/components/editor/EditorShell.test.tsx` | 0 errors |
| `npm run build` | Turbopack 프로덕션 빌드 성공, TypeScript 통과, 27개 라우트 정상 생성(P8-4 도입 전과 같은 라우트 수 — 새 라우트를 추가한 적이 없어 당연한 결과) |

## 수동 검증
- AX Auth 로그인 제약으로 이 세션에서는 실제 브라우저로 랜딩 화면에서 버튼이 실제로
  사라졌는지 스크린샷으로 확인하지 못했다(기존 항목들과 동일한 한계). 대신
  `EditorShell.test.tsx`의 기존 헤더 검색 버튼 테스트 2개(모바일 상단 바/데스크톱 사이드바)
  가 여전히 통과함으로써 P8-1 기능이 이번 제거로 영향받지 않았음을 확인했고, 삭제한
  `LandingSearchButton.tsx`/`GlobalSearchContext.tsx`를 참조하는 곳이 남아있지 않다는 것은
  `npx tsc --noEmit`(미해결 import가 있으면 즉시 타입 에러)로 확인했다.

## 발견된 문제와 조치
없음 — 제거 대상 파일과 그 테스트만 걷어내는 작업이라 첫 시도에 타입 체크·스코프 테스트·
린트·빌드가 모두 통과했다.

## 검증 중 새로 발견한 결정 사항
없음 — 제거 여부 자체는 이미 사용자에게 직접 확인받았다(task.md 참고).

## 최종 판정
- [x] 수용 기준(`task.md`)을 모두 만족함 — PRD 갱신 가능
