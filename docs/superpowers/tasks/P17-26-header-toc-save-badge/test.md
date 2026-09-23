# P17-26: 헤더 버튼·TOC 경계 여백 정렬 + 저장 상태 뱃지화 — 검증 기록

## 자동화 테스트
| 커맨드 | 결과 |
|---|---|
| `npx vitest run src/components/editor/DocumentEditor.test.tsx src/components/editor/TableOfContents.test.tsx src/components/editor/EditorShell.test.tsx` | 통과 (86/86) |
| `npx eslint src/components/editor/DocumentEditor.tsx src/components/editor/TableOfContents.tsx` | 통과 (경고/에러 없음) |
| `npm run build` | 통과 — 라우트 목록에 임시 디버그 라우트(`/dev-preview-header-toc`)가 남지 않음을 확인 |

## 수동 검증(실측)
`/editor/[pageId]`는 AX Auth(MS SSO) 로그인 게이트 뒤에 있어 이 세션에서 직접 열 수
없다. P17-21/P17-25 선례와 같은 방식으로 `EditorShell` + `DocumentEditor`(제목·H2
헤딩 1개 포함)를 임시 라우트(`/dev-preview-header-toc`, AX Auth 밖, 검증 후 즉시
삭제)에 마운트해 1400×900 뷰포트에서 Browser pane(Chromium)으로 확인했다.

**수정 전 실측** (본문↔TOC 경계선 x=1160px 기준):
| 요소 | 경계선까지 거리 |
|---|---|
| 헤더 버튼 클러스터(저장 버튼 오른쪽 끝) | 24px(`px-6`) |
| TOC "이 페이지" 레이블(왼쪽 끝) | 48px(`pl-12`) |

경계선을 기준으로 TOC 쪽이 헤더 버튼 쪽의 정확히 2배 — 사용자가 지적한 "버튼 위치가
정돈되지 않은 느낌"의 실체.

**수정 후 실측**:
| 요소 | 경계선까지 거리 |
|---|---|
| 헤더 버튼 클러스터 | 24px |
| TOC "이 페이지" 레이블 | 24px |

일치 확인. 헤더 하단 경계선과 TOC 상단 spacer 경계선 자체는 수정 전후 모두 x=1160,
y=56에서 끊기지 않고 이어져 있음을 재확인했다(애초에 문제가 아니었음).

**저장 상태 뱃지 확인**: 저장 버튼을 눌러 저장 완료 상태를 재현한 뒤, 상태 표시
엘리먼트의 `innerHTML`을 읽어 다음을 확인했다.
```
<span class="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-badge
  bg-green-50 text-green-700 border border-green-200 gap-1">
  <svg .../>저장됨 09:39
</span>
```
`Badge`의 `success` variant(배경·테두리가 있는 초록 알약)로 정상 렌더링되며, 체크
아이콘과 텍스트가 함께 표시됨을 확인했다. 스크린샷으로도 이전의 맨텍스트 대신
옅은 초록 배경의 알약 모양임을 육안으로 확인했다.

## 발견된 문제와 조치
없음.

## 검증 중 새로 발견한 결정 사항
없음 — 모든 결정(TOC 여백 값, 저장 상태 표현 방식, 버튼 그룹핑 진행 여부)은 구현
전 대화에서 사용자에게 직접 확인했다(`task.md` "결정이 필요한 사항" 참고).

## 최종 판정
- [x] 수용 기준(`task.md`)을 모두 만족함 — PRD 갱신 가능.
