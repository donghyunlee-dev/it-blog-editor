# P17-18: 본문 폭 확대 + Wide mode + 워크스페이스 중앙 정렬 — 검증 기록

## 자동화 테스트
| 커맨드 | 결과 |
|---|---|
| `npx vitest run src/components/editor/EditorShell.test.tsx src/components/editor/DocumentEditor.test.tsx src/components/editor/VersionHistoryPage.test.tsx src/components/editor/DeletedDocumentsPage.test.tsx src/components/editor/TableOfContents.test.tsx src/components/editor/EditorSidebar.test.tsx` | 통과 (181/181, 신규 8건 포함) |
| `npx eslint src/components/editor/{DocumentEditor,DocumentEditor.test,EditorShell,EditorShell.test,VersionHistoryPage,DeletedDocumentsPage}.tsx` | 통과 (경고/에러 없음) |
| `npx tsc --noEmit -p .` | 통과 |
| `npm run build` | 통과 (컴파일·타입체크·정적 페이지 생성 모두 성공, 디버그 라우트 없음 확인) |

TableOfContents/EditorSidebar는 EditorShell의 구조 변경(워크스페이스 래퍼 추가)에
영향받을 수 있는 화면이라 함께 포함했다.

## 수동 검증
`/editor/[pageId]`는 AX Auth 로그인 게이트 뒤에 있어 이 세션에서 직접 열 수 없다.
`EditorShell` + `DocumentEditor`를 임시 라우트(`/dev-preview-workspace-width`,
검증 후 즉시 삭제)에서 함께 마운트해 Browser pane(Chromium)으로 확인했다.

1. **워크스페이스 중앙 정렬**: 뷰포트 2200px에서 워크스페이스 컨테이너
   (`max-w-[1800px]`)의 `getBoundingClientRect()`가 `{left: 200, width: 1800,
   right: 2000}`으로 나와, 정확히 1800px로 잘리고 좌우 200px씩 여백이 생겨
   가운데 정렬됨을 확인했다(200+1800+200=2200 ✓).
2. **Wide mode 토글**: 기본 상태에서 본문(`max-w-[920px]`) 존재 확인 후 "넓게
   보기" 버튼 클릭 → 본문이 `max-w-[1200px]`(rect width 1200)로 바뀌고,
   버튼의 `aria-pressed="true"`, `aria-label`이 "좁게 보기"로 바뀜을 확인. 새로고침
   없이 `localStorage.getItem('sfood-editor-wide-mode')`가 `"true"`로 저장됨도
   확인했다.
3. **사이드바 드래그(오프셋 반영)**: 워크스페이스 왼쪽 끝이 x=200인 상태에서
   폭 조절 핸들에 `mousedown` → `mousemove(clientX: 700)` → `mouseup`을 실제
   디스패치하자 `aria-valuenow`가 최종적으로 `440`(MAX_WIDTH로 clamp)이 됨을
   확인했다 — 오프셋을 빼지 않았다면 `700` 그대로 계산돼야 했는데, `700-200=500`이
   440으로 clamp된 것이 오프셋 반영의 증거다.

## 발견된 문제와 조치
없음 — 계획 단계에서 이미 "워크스페이스 중앙 정렬이 사이드바 드래그·접힘 버튼의
기존 가정을 깬다"는 걸 코드 주석에서 미리 찾아 함께 고쳤으므로, 구현 도중 새로
발견된 회귀는 없었다.

## 검증 중 새로 발견한 결정 사항
없음 — 워크스페이스 전체 최대폭(1800px)은 이미 계획 단계에서 "구현 디테일"로
분류해 직접 정했다(`result.md`의 "주의사항" 참고).

## 최종 판정
- [x] 수용 기준(`task.md`)을 모두 만족함 — PRD 갱신 가능.
