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


## 후속 수정(2026-09-14, 같은 대화 — 헤더 정렬)
사용자가 "TOC가 헤더 밑으로 들어가야 하는데, 독립 레일로 완전히 분리하다 보니 헤더를
배제하고 화면 맨 위부터 시작하는 것처럼 보인다"고 지적했다. 독립 레일 자체가 잘못된
판단은 아니었다(스크롤 버그의 근본 원인은 `sticky` 흉내였지, 구조 분리가 아니었다) —
다만 문서 헤더가 본문 스크롤 영역 안에만 있어 레일이 그 밑에서 시작하지 못하는 부작용이
있었다. 왼쪽 사이드바가 이미 쓰는 패턴(자기만의 `h-14` 자리표시 행)을 TOC 레일에도
적용했다.

- **수동 검증**: 사이드바 브랜딩 행(h-14, border-b)·문서 헤더(h-14, border-b)·TOC 레일
  spacer(h-14, border-b)를 각각 자리표시자로 넣은 정적 페이지를 임시로 띄워 스크린샷으로
  비교 — 세 경계선이 화면에서 정확히 같은 높이(y좌표)에 맞춰지는 것을 확인했다. 확인 후
  임시 파일은 삭제했다.
- `npx vitest run src/components/editor/TableOfContents.test.tsx` — 13개 전부 통과(spacer는
  `aria-hidden`이라 기존 role 기반 쿼리에 영향 없음).
- `npx eslint`, `npx tsc --noEmit`, `npm run build` — 통과.
  
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


## 후속 수정(2026-09-14, 같은 대화 — 거터 위치)
사용자가 "컨텐츠와 TOC 사이에 공간이 있어서 분리되어 보인다. 헤더 라인 연결이 안
되어 있어서 알 수 있다. padding 48px이 적용되어 있는데 있을 필요가 있나?"고 지적했다.
원인은 본문↔TOC 거터(`pl-12`, 48px)가 헤더 정렬 spacer를 포함한 `<nav>` 최상단에
걸려 있어서였다 — spacer의 `border-b`가 48px 안쪽에서 시작해 본문 헤더의 `border-b`
와 만나지 못하고 끊어져 보였다. `pl-12`를 spacer 밑 콘텐츠 div로만 옮겼다(거터 자체는
design.md 실측값이라 유지 — "이 페이지" 텍스트만 48px 안쪽에서 시작).

- **수동 검증**: 문서 헤더·TOC 레일 spacer·TOC 텍스트를 각각 넣은 정적 페이지를
  임시로 띄워 `getBoundingClientRect()`로 직접 측정 — 수정 전에는 spacer.left가
  헤더.right보다 48px 안쪽이라 경계선 사이에 48px짜리 빈 틈이 있었고, 수정 후에는
  `header.right === spacer.left`로 완전히 이어짐을 확인했다. TOC 텍스트("이 페이지"
  레이블)는 여전히 spacer 왼쪽 끝에서 48px 안쪽에서 시작함도 함께 확인했다. 확인 후
  임시 파일은 삭제했다.
- `npx vitest run src/components/editor/TableOfContents.test.tsx` — 14개 전부 통과.
- `npx eslint`, `npx tsc --noEmit`, `npm run build` — 통과.

## 후속 수정(2026-09-14, 같은 대화 — 클릭 활성 판정 기준선)
사용자가 "선택했을 때 컨텐츠 포커스는 이동되는데, TOC 제목이 클릭한 제목 위로 한 칸
올라가서 포커스가 변경된다"고 지적했다. 원인 조사를 위해 `getBoundingClientRect()`/
`scrollIntoView()`를 실제 브라우저(정적 페이지, `globals.css`의 실제
`scroll-margin-top: 4.5rem` 규칙 포함)에서 실행해봤다 — 클릭 후 도착한 헤딩의
`top`이 정확히 72px임을 확인했는데, `computeActiveHeading`의 판정 기준선
(`ACTIVATION_OFFSET`)은 64px이었다. 72 > 64라 그 헤딩이 "지나온 헤딩" 조건을 만족
못 해 바로 위 헤딩이 계속 활성으로 남아 있었다 — 정확히 사용자가 묘사한 증상과
일치했다. `ACTIVATION_OFFSET`을 72로 맞췄다.

- **수동 검증**: 문서 헤더·본문·헤딩(`scroll-margin-top: 4.5rem` 포함)을 넣은 정적
  페이지에서 `heading.scrollIntoView({block:"start"})` 실행 후
  `heading.getBoundingClientRect().top - scrollParent.getBoundingClientRect().top`을
  측정 — 72px로 확인(스크롤 바닥 판정 여백 64px와 다름을 실측으로 확정).
- **회귀 테스트로 재확인**: 헤딩 3개(A/B/C) 중 B를 "클릭 후 도착 지점"(top=72px)으로
  모킹하는 테스트를 추가하고, 일부러 `ACTIVATION_OFFSET`을 64로 되돌려 테스트가
  실제로 실패하는 것(B가 아니라 A가 활성으로 남음)을 먼저 확인한 뒤, 72로 복원해
  통과함을 확인했다 — 이 과정에서 헤딩 2개로만 구성했던 첫 시도는 "마운트 직후(모킹
  전) 기본값이 우연히 기대값과 같아서" 버그가 있어도 거짓으로 통과하는 결함이 있어,
  헤딩 3개로 바꿔 그 위험을 없앴다(`TableOfContents.test.tsx` 참고).
- `npx vitest run src/components/editor/TableOfContents.test.tsx` — 15개 전부 통과.
- `npx eslint`, `npx tsc --noEmit`, `npm run build` — 통과.

## 후속 수정(2026-09-14, 같은 대화 — 클릭-바닥 판정 충돌)
사용자가 "화면에 제목이 2개 이상 보일 때 TOC를 클릭하면 컨텐츠는 이동하는데 TOC는
클릭한 제목에 포커스가 안 된다"고 제보하고, 이벤트가 루프를 도는 건 아닌지 확인해
달라고 요청했다.

- **원인 조사**: 무한 루프는 아니었다. 헤딩이 화면에 2개 이상 한 번에 보일 만큼
  문서(또는 마지막 구간)가 짧으면 `atBottom` 판정이 거의 항상 참이 되는데, 클릭 후
  `scrollIntoView`의 smooth 스크롤이 안착하기까지 여러 `scroll` 이벤트가 연달아
  오고, 그때마다 `computeActiveHeading`이 다시 불려 "바닥이니까 마지막 헤딩"으로
  클릭 선택을 되돌렸다 — PR #114(낙관적 클릭 처리)는 클릭 직후 "다음" 재계산 한
  번만 막아줬을 뿐, 안착 중 반복되는 재계산까지는 못 막았다. 무한 루프는 아니지만
  "클릭 의도 vs 스크롤 위치 기반 계산"이 매 이벤트마다 서로 덮어써 사실상 클릭이
  무효화되는 상태였다는 점에서 사용자가 감지한 "루프처럼 꼬인다"는 인상과 실체가
  일치한다.
- **조치**: 클릭으로 이동 중인 헤딩을 `pinnedByClickRef`(리렌더를 일으키지 않는
  ref)로 기억해 두고, `atBottom`이 참이어도 그 헤딩이 현재 목차에 존재하면 마지막
  헤딩 대신 그 헤딩을 반환하도록 `computeActiveHeading`을 수정했다. 사용자가 실제로
  휠/터치로 스크롤하면(`wheel`/`touchmove` 이벤트 — `scrollIntoView`가 만드는
  프로그램적 스크롤은 이 이벤트들을 발생시키지 않는다) 그 고정을 풀어, 진짜로 바닥까지
  스크롤했을 때는 원래 의도(마지막 헤딩 활성화)대로 동작하게 했다.
- **회귀 테스트로 재확인**: 헤딩 2개(A/마지막)로 "바닥" 상태를 모킹한 뒤 A를 클릭,
  이어서 smooth 스크롤 안착을 흉내 내 `scroll` 이벤트를 2번 더 강제로 흘려보내도
  A가 계속 활성으로 남는지, 그다음 `wheel` 이벤트 후에는 마지막 헤딩으로 돌아가는지
  확인하는 테스트를 추가했다. 이 fix를 임시로 빼고 돌려 테스트가 실제로 실패하는
  것(마지막 헤딩으로 되돌아감)을 먼저 확인한 뒤, 복원해 통과함을 재확인했다.
  - 이 과정에서 테스트 자체의 결함도 하나 발견했다: `fireScroll`이 `act()` 없이
    네이티브 `dispatchEvent`만 호출하면, 그 안에서 일어나는 `setActiveElement`가
    React 자동 배칭 타이밍에 따라 다음 줄의 동기 assertion 시점까지 반영되지 않을
    수 있어(자동 배칭이 마이크로태스크로 지연시킨다), 실제로는 값이 틀렸는데도
    "아직 이전 값이 남아 있어서" 우연히 통과해버리는 경우가 있었다(수정 코드를 빼고
    돌렸는데도 처음엔 테스트가 통과했다 — 재현·디버깅으로 확인). `fireScroll`을
    `act()`로 감싸 이 타이밍 문제를 없앴다.
- `npx vitest run src/components/editor/TableOfContents.test.tsx` — 16개 전부 통과.
- `npx eslint`, `npx tsc --noEmit`, `npm run build` — 통과.

## 검증 중 새로 발견한 결정 사항
없음.

## 최종 판정
- [x] 수용 기준(`task.md`)을 모두 만족함 — PRD 갱신 가능
