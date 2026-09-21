# P17-14: "새 문서" 버튼 강조도 낮추기 — 검증 기록

## 자동화 테스트
| 커맨드 | 결과 |
|---|---|
| `npx vitest run src/components/editor/EditorSidebar.test.tsx` | 통과 (78/78) |
| `npx eslint src/components/editor/EditorSidebar.tsx` | 통과 (경고/에러 없음) |
| `npm run build` | 통과 (컴파일·타입체크·정적 페이지 생성 모두 성공, 디버그 라우트 없음 확인) |

## 수동 검증
- `/editor`는 AX Auth 로그인 게이트 뒤에 있어 이 세션에서 직접 열 수 없다(P17-13
  test.md와 동일한 제약). `EditorShell`은 `/editor` 레이아웃(`layout.tsx`)의 auth
  게이트와 무관한 독립 컴포넌트라, `/dev-preview-new-doc-button`(임시 라우트, 검증
  후 즉시 삭제)에서 `documents=[]`/`folders=[]`로 직접 마운트해 Browser pane
  (Chromium)으로 확인했다.
- `getComputedStyle(link)`로 실측:
  - 변경 전 클래스: `bg-brand ... text-on-brand hover:bg-brand-hover`
  - 변경 후 실측값: `backgroundColor: rgb(17, 24, 39)`(다크 모드 surface, 브랜드 레드
    아님), `borderColor: rgb(55, 65, 81)`(연한 회색 테두리), `color: rgb(249, 250, 251)`
    (foreground) — `bg-surface border border-border text-foreground` 클래스가 의도대로
    적용됨을 확인했다.

## 발견된 문제와 조치
없음.

## 검증 중 새로 발견한 결정 사항
없음.

## 최종 판정
- [x] 수용 기준(`task.md`)을 모두 만족함 — PRD 갱신 가능.
