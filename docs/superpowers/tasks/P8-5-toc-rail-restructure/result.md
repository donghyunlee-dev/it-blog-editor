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

## 커밋 내역
| SHA | 메시지 |
|-----|--------|
| (커밋 후 기록) | feat: 우측 목차(TOC)를 독립된 레일 구조로 재구성, 활성 항목 버그 2건 수정 (P8-5) |

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
