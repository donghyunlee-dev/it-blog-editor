# P17-24: 사이드바 들여쓰기·아이콘 정렬 + TOC 폭 흔들림 수정 — 검증 기록

## 자동화 테스트
| 커맨드 | 결과 |
|---|---|
| `npx vitest run src/components/editor/EditorSidebar.test.tsx` | 통과 (80/80, 들여쓰기 테스트 1건 갱신) |
| `npx eslint src/components/editor/EditorSidebar.tsx src/components/editor/EditorSidebar.test.tsx` | 통과 (경고/에러 없음) |
| `npm run build` (들여쓰기·아이콘 정렬 변경 직후) | 통과 |
| `npx vitest run src/components/editor/TableOfContents.test.tsx src/components/editor/EditorShell.test.tsx src/components/editor/DocumentEditor.test.tsx` | 통과 (86/86) |
| `npx eslint src/components/editor/TableOfContents.tsx` | 통과 (경고/에러 없음) |
| `npm run build` (TOC 폭 고정 변경 직후) | 통과 |

## 수동 검증
`/editor/[pageId]`는 AX Auth(MS SSO) 로그인 게이트 뒤에 있고, 이 세션에서는 MS 계정
자격 증명이 없어 로그인할 수 없다 — Browser pane으로 실제 화면의 좌우 흔들림 재현/
해소 여부를 직접 스크린샷으로 확인하지 못했다. 대신:
- `TableOfContents.test.tsx`의 기존 접근성 테스트("h2/h3가 하나도 없으면 아무것도
  렌더링하지 않는다" 등)가 새 구조에서도 그대로 통과함을 확인해, 레일 폭을 고정해도
  헤딩 0개 문서에서 `nav`/`aria-label="이 페이지"` 랜드마크가 생기지 않음을 검증했다.
- `EditorSidebar.test.tsx`의 갱신된 들여쓰기 테스트로 폴더 깊이와 무관하게 왼쪽
  패딩이 고정값(0보다 큼)을 유지함을 확인했다.
- 코드 리뷰로 `EditorShell.tsx`의 `{tocRail && <div className="hidden w-60 shrink-0
  xl:block">{tocRail}</div>}` 조건이 이제 `TableOfContents` 마운트 여부(헤딩 유무가
  아니라)에만 의존하게 됐음을 확인했다 — 헤딩이 나중에 발견돼도 이 조건식 자체가
  다시 평가되지 않고 컬럼은 이미 렌더링된 상태를 유지한다.

## 발견된 문제와 조치
없음.

## 검증 중 새로 발견한 결정 사항
없음.

## 최종 판정
- [x] 수용 기준(`task.md`)을 모두 만족함 — 단, 실제 로그인된 화면에서의 시각적
      흔들림 해소는 사용자의 다음 실사용 확인이 필요하다(로그인 게이트로 이 세션에서
      직접 확인 불가).
