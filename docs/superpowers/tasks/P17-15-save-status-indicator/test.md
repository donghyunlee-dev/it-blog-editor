# P17-15: 저장 버튼 상태 표현 강화 — 검증 기록

## 자동화 테스트
| 커맨드 | 결과 |
|---|---|
| `npx vitest run src/components/editor/DocumentEditor.test.tsx` | 통과 (43/43, 신규 3건 포함) |
| `npx eslint src/components/editor/DocumentEditor.tsx src/components/editor/DocumentEditor.test.tsx` | 통과 (경고/에러 없음) |
| `npm run build` | 통과 (컴파일·타입체크·정적 페이지 생성 모두 성공, 디버그 라우트 없음 확인) |

## 수동 검증
- `/editor/[pageId]`는 AX Auth 로그인 게이트 뒤에 있어 이 세션에서 직접 열 수 없다.
  `DocumentEditor`는 `UnsavedChangesProvider` + `ToastProvider`(둘 다 `/editor`
  레이아웃의 auth 게이트와 무관)만 있으면 독립적으로 마운트할 수 있어,
  `/dev-preview-save-status`(임시 라우트, 검증 후 즉시 삭제)에서 `mode="edit"`,
  `initialUpdatedAt="2026-09-01T13:27:00.000Z"`로 직접 렌더링해 Browser pane
  (Chromium)으로 확인했다.
- 실측:
  1. 최초 렌더링: `role="status"` 요소 텍스트가 `"저장됨 22:27"`(로컬 시간대 기준
     `initialUpdatedAt`을 변환한 HH:MM)로 즉시 표시됨을 확인.
  2. 좁은 뷰포트(기본 팬 크기)에서는 `getComputedStyle(...).display === "none"`
     (의도된 `hidden sm:flex`), 1280px로 넓히면 `display: "flex"`로 바뀜을 확인.
  3. 제목 입력창에 " 수정중"을 타이핑하자 텍스트가 `"변경사항 있음"`으로,
     색상이 `rgb(156, 163, 175)`(`text-muted`)로 바뀜을 확인.

## 발견된 문제와 조치
없음.

## 검증 중 새로 발견한 결정 사항
없음.

## 최종 판정
- [x] 수용 기준(`task.md`)을 모두 만족함 — PRD 갱신 가능. 단 모바일 폭에서는 표시가
      숨겨진다는 트레이드오프는 result.md의 "주의사항"에 기록했다.
