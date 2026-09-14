# P8-5-toc-rail-restructure — 검증 기록

## 자동화 테스트
변경 파일과 직접 연관된 테스트만 실행했다(전체 `npm test`는 돌리지 않음 — 회귀 위험이
낮다고 판단한 이유는 아래 "전체 스위트를 안 돌린 이유" 참고). 코드 변경이 있어 전체
빌드는 실행했다.

| 커맨드 | 결과 |
|---|---|
| `npx vitest run src/components/editor/TableOfContents.test.tsx src/components/editor/EditorShell.test.tsx src/components/editor/DocumentEditor.test.tsx` | 3 파일, 71개 테스트 전부 통과 |
| `npx eslint src/components/editor/TableOfContents.tsx src/components/editor/TableOfContents.test.tsx src/components/editor/EditorShell.tsx src/components/editor/EditorShell.test.tsx src/components/editor/DocumentEditor.tsx` | 통과(출력 없음) |
| `npx tsc --noEmit -p tsconfig.json` | 통과(출력 없음) |
| `npm run build` | 성공(`Compiled successfully`, 19개 라우트 정상 생성) |

### 전체 스위트를 안 돌린 이유
`TocRailContext`를 새로 쓰는 곳은 `EditorShell.tsx`(정의)·`TableOfContents.tsx`(소비)뿐이고,
둘 다 위 커맨드에 포함된다. `DocumentEditor.tsx`의 변경은 JSX 구조 단순화(그룹 해제)뿐이라
`DocumentEditor.test.tsx`로 충분히 커버된다. 다른 화면(문서 목록 등)은 `EditorShell`을
그대로 쓰지만 `TocRailContext`를 소비하지 않으므로(`tocRail` 기본값 `null`) 영향이 없다 —
이 경계는 `EditorShell.test.tsx`의 "레일이 비어있음" 테스트로 확인했다.

## 수동 검증
**로그인(MS SSO)이 필요한 실제 화면은 이 세션에서 접근할 수 없어**, `DocumentEditor.tsx`/
`EditorShell.tsx`의 실제 Tailwind 클래스를 그대로 복제한 정적 페이지를 프로젝트
`public/`에 임시로 올려(`next dev`로 서빙 후 검증 완료 즉시 삭제) 브라우저로 확인했다.

- **구조 검증**: 본문 스크롤 컨테이너의 `scrollTop`을 0 → 1400px로 바꿔가며 우측 레일
  컬럼의 `getBoundingClientRect().top`을 읽었다 — 스크롤 전/후 모두 `top: 0`으로 동일해,
  본문을 아무리 스크롤해도 레일이 전혀 움직이지 않음을 확인했다(이전 `sticky` 구조에서는
  같은 방식으로 재현했을 때 `top`이 스크롤한 만큼 그대로 밀려났었다 — PR #112 test.md 참고).
- 좌측 사이드바(자리표시자)도 함께 렌더링해, 새 우측 레일이 사이드바와 동급(스크롤
  영역 밖 형제 컬럼)으로 앉는 구조인지 시각적으로도 확인했다.

## 발견된 문제와 조치
- **원인**: 첫 구현에서 `EditorShell.tsx`의 우측 레일을 `{tocRail && <div>...}`로만 조건부
  렌더링하면, `DocumentEditor`가 항상 `<TableOfContents/>`(리액트 엘리먼트, `null`이 아님)를
  렌더 트리에 두는 이상 `setTocRail`이 호출될 수 있어 헤딩이 없는 문서에서도 빈 레일이
  뜰 위험이 있었다.
- **조치**: 레일을 채우고 비우는 책임을 `EditorShell`이 아니라 헤딩 유무를 실제로 아는
  `TableOfContents` 쪽으로 옮겼다 — `headings.length === 0`이면 `setTocRail(null)`을 직접
  호출하도록 구현(최종 코드에 반영, 첫 시도의 흔적은 없음).
- **재검증 결과**: `TableOfContents.test.tsx`의 "h2/h3가 하나도 없으면 아무것도 렌더링하지
  않는다" 테스트와 `EditorShell.test.tsx`의 "아무도 TocRailContext를 쓰지 않으면 우측
  레일을 렌더링하지 않는다" 테스트로 이 경계를 확인했다 — 둘 다 통과.


## 후속 수정(2026-09-14, 같은 대화 — 본문 스크롤바 숨김)
사용자가 벤치마킹한 참고 사이트(페이지 전체 스크롤이라 브라우저 자체 스크롤바만
보임)와 비교해, 이 프로젝트의 본문 스크롤 영역에 보이는 OS 기본 스크롤바가 이질적
이라고 지적했다. `globals.css`에 `.scrollbar-hidden` 유틸리티를 추가해
`EditorShell.tsx`의 `flex-1 overflow-y-auto`에 적용했다.

- **수동 검증**: 로그인 화면에 접근할 수 없어, 같은 CSS 규칙만 떼어 스크롤 가능한
  `<div>` 두 개(대조군/적용군)를 프로젝트 `public/`에 임시로 올려 브라우저로 비교했다
  — 대조군은 스크롤바가 보이고, `.scrollbar-hidden` 적용군은 스크롤바가 안 보이면서도
  `el.scrollTop`을 바꾸면 실제로 스크롤됨(`scrollTop` 값이 그대로 반영됨)을 확인했다.
  확인 후 임시 파일은 삭제했다.
- `npx vitest run src/components/editor/EditorShell.test.tsx` — 18개 전부 통과(클래스
  추가만으로 렌더링 결과 자체는 바뀌지 않아 기존 테스트가 그대로 커버).
- `npx eslint src/components/editor/EditorShell.tsx`, `npm run build` — 통과.

## 후속 수정(2026-09-14, 배포 직후 실사용 중 발견)
- **원인**: "스크롤이 바닥에 닿았으면 무조건 마지막 헤딩을 활성으로 본다"는 규칙이
  너무 공격적이었다 — 스크롤이 바닥 근처인 동안 사용자가 다른(마지막이 아닌) 항목을
  클릭해도, 클릭 직후의 다음 `scroll` 이벤트가 그 선택을 다시 "바닥이니까 마지막"으로
  덮어써버려서, 마지막 항목보다 위에 있는 항목은 클릭해도 활성 표시가 안 바뀌는
  것처럼 보였다(사용자 제보: "마지막 위에는 클릭도 선택도 안되는 문제가 있어").
- **조치**: 목차 항목 `onClick`에서 `scrollIntoView` 호출과 함께 `setActiveElement`로
  그 항목을 즉시(낙관적으로) 활성 처리하도록 `TableOfContents.tsx`를 수정. smooth
  스크롤이 끝나 실제 위치가 안정되면 이후 `scroll` 이벤트가 `computeActiveHeading`으로
  다시 계산해 확정한다(대부분 같은 항목으로 재확인되고, 극히 드문 경우 — 클릭한 항목
  바로 아래 남은 분량이 뷰포트보다 짧아 스크롤이 여전히 바닥에 닿아 있는 경우만 —
  이후 마지막 헤딩으로 다시 넘어갈 수 있다. 이 재검증은 실제 스크롤 동작에 의존해
  자동화 테스트로는 다루지 않는다).
- **재검증 결과**: "스크롤이 바닥에 닿아 마지막 헤딩이 강제로 활성인 상태에서도, 다른
  항목을 클릭하면 그 항목이 즉시 활성으로 바뀐다" 테스트를 추가해 수정 전 실패 →
  수정 후 통과를 확인했다(`npx vitest run src/components/editor/TableOfContents.test.tsx`,
  14개 전부 통과). `npx eslint`, `npx tsc --noEmit`도 통과.


## 검증 중 새로 발견한 결정 사항
없음.

## 최종 판정
- [x] 수용 기준(`task.md`)을 모두 만족함 — PRD 갱신 가능
