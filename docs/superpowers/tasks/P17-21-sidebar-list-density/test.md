# P17-21: 문서함 리스트 행 밀도 조정 — 검증 기록

## 자동화 테스트
| 커맨드 | 결과 |
|---|---|
| `npx vitest run src/components/editor/EditorSidebar.test.tsx` | 통과 (80/80, 신규 1건 포함) |
| `npx eslint src/components/editor/EditorSidebar.tsx src/components/editor/EditorSidebar.test.tsx` | 통과 (경고/에러 없음) |
| `npm run build` | 통과 (컴파일·타입체크·정적 페이지 생성 모두 성공, 디버그 라우트 없음 확인) |

## 수동 검증
`/editor`는 AX Auth 로그인 게이트 뒤에 있어 이 세션에서 직접 열 수 없다.
`EditorShell`을 문서 15개와 함께 임시 라우트(`/dev-preview-density`, 검증 후
즉시 삭제)에서 마운트해 Browser pane(Chromium)으로 확인했다.

- 수정 전: `py-1.5`(6px) 기준 행 간격 34px(추정, `py-1`로 실측한 30px + 패딩
  차이 4px).
- 수정 후 실측: 첫 번째 문서 행(`a[href="/editor/doc-0"]`)과 두 번째 행
  (`doc-1`)의 `getBoundingClientRect().top` 차이가 **30px**로 측정됨 — 패딩을
  4px 줄인 만큼(위아래 각 2px) 정확히 반영됐다.
- 클래스 확인: 렌더링된 링크의 `className`에 `py-1`이 포함되고 `py-1.5`는
  더 이상 없음을 확인했다.

## 발견된 문제와 조치
없음.

## 검증 중 새로 발견한 결정 사항
없음.

## 최종 판정
- [x] 수용 기준(`task.md`)을 모두 만족함 — PRD 갱신 가능.
