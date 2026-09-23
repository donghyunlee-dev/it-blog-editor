# P17-25: 제목·본문 입력 영역 왼쪽 위치·폭 불일치 수정 — 검증 기록

## 자동화 테스트
| 커맨드 | 결과 |
|---|---|
| `npx vitest run src/components/editor/DocumentEditor.test.tsx` | 통과 (46/46) |
| `npx eslint src/components/editor/DocumentEditor.tsx` | 통과 (경고/에러 없음) |
| `npm run build` | 통과 — 라우트 목록에 임시 디버그 라우트(`/dev-preview-editor-canvas`)가 남지 않음을 확인 |

## 수동 검증(실측)
`/editor/[pageId]`는 AX Auth(MS SSO) 로그인 게이트 뒤에 있어 이 세션에서 직접 열 수
없다. P17-21 선례와 같은 방식으로 `DocumentEditor`를 임시 라우트
(`/dev-preview-editor-canvas`, AX Auth 밖, 검증 후 즉시 삭제)에 마운트해 Browser
pane(Chromium)에서 `getBoundingClientRect()`/`getComputedStyle()`로 실측했다.

**수정 전** (뷰포트 1009px, 본문 컬럼 920px 기준):
| 요소 | 텍스트 왼쪽 | 텍스트 오른쪽 | 텍스트 폭 |
|---|---|---|---|
| 제목(`textarea`) | 44.5px | 948.5px | 904px |
| 본문(`.prose`/`.ProseMirror`) | 44.5px | 964.5px | 920px |

왼쪽은 이미 같았고, 오른쪽이 16px(패딩 8px×2) 짧아 폭이 달랐다 — 사용자가 "왼쪽
위치와 가로 width 폭이 다른 것 같다"고 느낀 실체.

**수정 후**:
| 요소 | 텍스트 왼쪽 | 텍스트 오른쪽 | 텍스트 폭 |
|---|---|---|---|
| 제목(`textarea`) | 44.5px | 964.5px | 920px |
| 본문(`.prose`/`.ProseMirror`) | 44.5px | 964.5px | 920px |

완전히 일치함을 확인했다.

## 발견된 문제와 조치
없음 — 한 번의 클래스 교체로 목표 수치에 정확히 도달했다(재시도 없음).

## 검증 중 새로 발견한 결정 사항
- 색상(라이트 모드 배경/입력 모드 색감) 요청이 CLAUDE.md의 "@sfood/ui 토큰 재정의
  금지" 규칙과 충돌함을 발견 — GitHub Issue 대신 대화 중 `AskUserQuestion`으로
  직접 확인했다(값 자체가 아니라 "어느 절차를 따를지"에 대한 결정이라 값 확정을
  기다리는 이슈 등록 방식보다 즉시 대화로 확인하는 쪽이 적합하다고 판단). 결과:
  "일단 보류" — `task.md` "결정이 필요한 사항" 참고.

## 최종 판정
- [x] 수용 기준(`task.md`)을 모두 만족함 — PRD 갱신 가능(색상 항목은 보류로 남김).
