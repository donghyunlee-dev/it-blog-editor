# P8-5-toc-rail-restructure — 구현 결과 보고서

## 구현 내용
- **구조 변경**: TOC를 `DocumentEditor.tsx`의 본문 flex 그룹(스크롤 영역 안)에서 빼내,
  `EditorShell`이 소유한 우측 레일 슬롯으로 옮겼다. `EditorShell.tsx`에 새 Context
  `TocRailContext`(setter 함수를 흘려보냄)와 `tocRail` state를 추가하고, 좌측 사이드바와
  대칭인 위치(스크롤 영역 밖, `hidden w-60 shrink-0 xl:block`)에 `{tocRail}`을 렌더링한다.
  `TableOfContents.tsx`는 이제 자기 자리에 아무것도 그리지 않고(`return null`), 실제
  `<nav>` UI를 `useContext(TocRailContext)`로 받은 setter에 `useEffect`로 밀어 넣는다 —
  헤딩이 없으면 `setTocRail(null)`을 호출해 레일 자체가 사라지게 한다.
  - 이 구조에서는 TOC가 스크롤 영역 밖의 독립된 컬럼이라 `sticky`/`self-start` 같은
    계산이 아예 필요 없다 — 본문을 아무리 스크롤해도 레일 자체가 움직이지 않는다.
- **활성 헤딩 계산 교체**: `IntersectionObserver`(화면 상단 30% 띠에 걸쳐 있는지) 기반
  로직을 `computeActiveHeading`(스크롤 위치 기반) 함수로 교체했다.
  - 스크롤이 바닥에 닿았으면(`scrollHeight - scrollTop - clientHeight <= 2px`) 위치
    계산과 무관하게 **무조건 마지막 헤딩**을 활성으로 본다.
  - 그렇지 않으면 "지금 섹션 기준선"(`scrollParent.getBoundingClientRect().top + 64px`)
    을 지난 헤딩 중 문서 순서상 가장 마지막 것을 활성으로 본다. 아직 아무 헤딩도
    지나지 않았으면(문서를 막 열었을 때 등) **첫 헤딩을 기본값**으로 반환한다.
  - `scroll`(스크롤 조상 요소)·`resize`(윈도우) 이벤트로 재계산한다.
- `DocumentEditor.tsx`의 `<div className="flex justify-center gap-12">`(본문+TOC 묶음
  정렬)를 `<div className="flex justify-center">`(본문 단독 정렬)로 단순화했다.

- **클릭 활성 즉시 반영 수정(배포 직후 후속)**: "바닥에 닿았으면 무조건 마지막 헤딩을
  활성으로 본다"는 규칙이 너무 공격적이어서, 스크롤이 바닥 근처인 동안 다른 항목을
  클릭해도 클릭 직후의 다음 `scroll` 이벤트가 그 선택을 다시 마지막 헤딩으로 덮어써
  버렸다. 목차 항목 `onClick`에서 `scrollIntoView`와 함께 `setActiveElement`로 그
  항목을 즉시(낙관적으로) 활성 처리하도록 고쳤다.

- **헤더 정렬 수정(같은 대화 후속)**: 독립 레일로 뺀 부작용으로, 문서 헤더(본문 스크롤
  영역 안에만 있음)와 레일(그 밖의 독립 컬럼)의 높이가 안 맞아 TOC가 화면 맨 위부터
  시작하는 것처럼 보였다. 왼쪽 사이드바(`EditorSidebar.tsx`)가 이미 쓰는 패턴(자기만의
  `h-14` 자리표시 행으로 헤더와 높이를 맞춤)을 `TableOfContents.tsx`의 레일 최상단에도
  그대로 적용했다(`h-14 shrink-0 border-b border-border` spacer).

- **본문 스크롤바 숨김(같은 대화 후속)**: 사용자가 벤치마킹한 참고 사이트(페이지 전체
  스크롤이라 브라우저 자체 스크롤바만 보임)와 비교해 이 프로젝트의 본문 스크롤 영역에
  보이는 OS 기본 스크롤바가 이질적이라고 지적했다. `globals.css`에 `.scrollbar-hidden`
  유틸리티를 추가해 `EditorShell.tsx`의 `flex-1 overflow-y-auto`에 적용했다 —
  `overflow-y: auto`는 그대로 둬 스크롤 기능(휠·트랙패드·키보드·TOC 클릭)은 그대로다.

- **거터 위치 수정(같은 대화 후속)**: 사용자가 "컨텐츠와 TOC 사이에 공간이 있어서
  분리되어 보인다. 헤더 라인 연결이 안 되어 있어서 알 수 있다"고 지적했다 — 본문↔TOC
  거터(`pl-12`, design.md 실측값 48px)가 `<nav>` 최상단(헤더 정렬용 spacer 포함)에
  걸려 있어서, spacer의 `border-b`가 48px 안쪽에서 시작해 본문 헤더의 `border-b`와
  끊어져 보였다. `pl-12`를 spacer 밑 콘텐츠 div로만 옮겨, spacer는 레일 전체 폭으로
  그리고 "이 페이지" 텍스트는 그대로 48px 안쪽에서 시작하게 했다.

## 파일 변경 내역
| 파일 | 변경 사항 |
|------|---------|
| `src/components/editor/EditorShell.tsx` | `TocRailContext` 추가, `tocRail` state와 우측 레일 렌더링 추가 |
| `src/components/editor/TableOfContents.tsx` | 항상 `null` 반환으로 변경, `TocRailContext`로 UI를 밀어 넣는 방식으로 전환, `IntersectionObserver` → `computeActiveHeading`(스크롤 기반)으로 교체 |
| `src/components/editor/DocumentEditor.tsx` | 본문+TOC `gap-12` flex 그룹을 본문 단독 정렬로 단순화 |
| `src/components/editor/TableOfContents.test.tsx` | `TocRailContext.Provider` 하네스로 재작성, 스크롤/rect 모킹으로 교체, 초기 활성·바닥 스크롤 활성 회귀 테스트 추가 |
| `src/components/editor/EditorShell.test.tsx` | 레일 슬롯 채워짐/비어있음 테스트 추가 |
| `docs/product/design.md` | "7. 우측 목차(TOC)" 절에 구조 변경 배경 기록 |
| `docs/product/prd.md` | P8-5 항목에 이번 수정 이력 추가 |
| `src/app/globals.css` | `.scrollbar-hidden` 유틸리티 추가 |
| `src/components/editor/TableOfContents.tsx`(추가 수정) | `pl-12`를 헤더 정렬 spacer에서 콘텐츠 div로 이동 |

## 커밋 내역
| SHA | 메시지 |
|-----|--------|
| d52c82e | feat: 우측 목차(TOC)를 독립된 레일 구조로 재구성, 활성 항목 버그 2건 수정 (P8-5) |
| c7ecd48 | fix: 바닥 스크롤 중 클릭한 목차 항목이 즉시 활성 표시되도록 수정 (P8-5 후속) |
| c6e5554 | fix: 본문 스크롤 영역의 스크롤바를 숨김 (P8-5 후속) |
| caaccaa | fix: TOC 레일이 문서 헤더 높이에 맞춰 시작하도록 정렬 수정 (P8-5 후속) |
| ef8f62e | fix: 본문↔TOC 거터가 헤더 정렬 spacer까지 밀어내던 문제 수정 (P8-5 후속) |

## 자체 검토 (Self-Review)
### 긍정 사항
- `sticky`/`align-items` 같은 CSS 계산에 기대지 않는 구조라, 지금까지 반복된 "스크롤하면
  목차가 사라진다"류 버그가 구조적으로 재발하기 어렵다.
- 활성 헤딩 계산을 별도 순수 함수(`computeActiveHeading`)로 뽑아 유닛 테스트로 초기
  진입/바닥 스크롤 두 엣지 케이스를 직접 검증할 수 있었다.
- `EditorShell`이 TOC 데이터를 몰라도 되는 구조라(Context를 통한 "슬롯" 패턴), 문서
  목록 등 다른 라우트에는 영향이 없다 — 실제로 TableOfContents.test.tsx의 "레일이
  비어있음" 테스트와 EditorShell.test.tsx의 대응 테스트로 확인했다.

### 주의사항
- `TableOfContents`가 이제 `EditorShell`(`TocRailContext`)이 트리 상단에 있어야 정상
  동작한다 — `DocumentEditor`를 `EditorShell` 없이 단독으로 렌더링하는 새 테스트를
  작성할 경우 `TocRailContext.Provider`로 감싸지 않으면 TOC가 조용히(에러 없이) 아무
  것도 하지 않는다(`setTocRail`이 `null`이라 effect 안 early return). 실제 프로덕션
  라우팅에서는 `app/editor/layout.tsx`가 항상 `EditorShell`로 감싸므로 문제가 되지 않는다.
- `computeActiveHeading`의 "지금 섹션 기준선"(64px)은 문서 헤더 높이(56px)에 여유를
  더한 값으로, 기존 `IntersectionObserver`의 `rootMargin` 상단값을 그대로 가져왔다 —
  헤더 높이가 바뀌면 이 값도 같이 조정해야 한다(하드코딩된 매직 넘버, 주석에 근거는
  남겨뒀다).

### 우려사항
- 로그인(MS SSO)이 필요한 실제 화면에서 최종 시각 확인을 할 수 없어, `DocumentEditor.tsx`/
  `EditorShell.tsx`의 실제 레이아웃 클래스를 그대로 복제한 정적 페이지로 대신 검증했다
  (test.md 참고). 실제 배포 후 사용자가 직접 스크롤/클릭으로 최종 확인이 필요하다.
