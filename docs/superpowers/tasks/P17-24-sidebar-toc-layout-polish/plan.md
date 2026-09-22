# P17-24: 사이드바 들여쓰기·아이콘 정렬 + TOC 폭 흔들림 수정 — 구현 계획

## Global Constraints
- 새 spacing 값을 발명하지 않는다 — 기존 상수(`INDENT_BASE_PX`)와 기존 Tailwind 클래스
  (`pl-2`)를 재사용한다.
- TOC 레일의 접근성 계약(헤딩 0개면 `nav`/`aria-label="이 페이지"` 랜드마크 자체가
  없어야 한다)은 유지한다 — 폭만 고정하고 시맨틱은 바꾸지 않는다.

## Task 1 — 폴더 트리 들여쓰기 고정값 전환
### Files
- Modify: `src/components/editor/EditorSidebar.tsx`
- Modify: `src/components/editor/EditorSidebar.test.tsx`

### Steps
- [x] **Step 1**: `INDENT_STEP_PX` 상수와 그 사용처 3곳(`renderDocumentRow`,
      `renderFolderNode`, 빈 폴더 안내)의 `INDENT_BASE_PX + depth * INDENT_STEP_PX`를
      전부 `INDENT_BASE_PX` 고정값으로 교체.
- [x] **Step 2**: 상수 정의부 주석을 새 동작(깊이 무관 고정 여백)으로 갱신.
- [x] **Step 3**: 기존 테스트("하위 폴더는 상위 폴더보다 더 들여쓰기된다")를 새 동작
      (깊이와 무관하게 동일한 최소 여백)에 맞게 갱신.

## Task 2 — 폴더/문서 아이콘 왼쪽 위치 정렬
### Files
- Modify: `src/components/editor/EditorSidebar.tsx`

### Steps
- [x] **Step 1**: 폴더 행 컨테이너의 `pl-1 pr-1`을 문서 행(`Link`)과 같은 `pl-2 pr-2`로
      교체해, 들여쓰기(고정 8px) + 안쪽 여백(8px)이 두 행에서 동일하게 16px가 되도록
      맞춘다.
- [x] **Step 2**: 주석을 새 근거(사용자 요청 — 폴더 화살표와 문서 상태 아이콘 왼쪽
      위치 정렬)로 갱신.

## Task 3 — TOC 레일 폭 고정
### Files
- Modify: `src/components/editor/TableOfContents.tsx`

### Steps
- [x] **Step 1**: `setTocRail` 호출 로직에서 "헤딩 0개면 `setTocRail(null)`로 레일 전체를
      비운다"는 분기를 제거.
- [x] **Step 2**: 레일에 항상 밀어 넣는 최상위 요소를 `nav`에서 `div`로 바꾸고, 헤더
      높이 맞춤용 spacer(`h-14 border-b`)는 그 바깥에 항상 렌더링.
- [x] **Step 3**: 실제 목차 콘텐츠(레이블 + 목록)는 `headings.length > 0`일 때만 그
      안쪽에 `nav aria-label="이 페이지"`로 조건부 렌더링 — 접근성 계약 유지.
- [x] **Step 4**: 기존 "h2/h3가 하나도 없으면 아무것도 렌더링하지 않는다" 테스트가
      여전히 통과하는지 확인(랜드마크 부재는 유지, 레일 자체의 폭 변화는 이 테스트의
      관심사가 아니므로 수정 불필요).

## 공통 검증
- [x] `npx vitest run src/components/editor/EditorSidebar.test.tsx
      src/components/editor/TableOfContents.test.tsx
      src/components/editor/EditorShell.test.tsx
      src/components/editor/DocumentEditor.test.tsx`
- [x] `npx eslint src/components/editor/EditorSidebar.tsx
      src/components/editor/EditorSidebar.test.tsx
      src/components/editor/TableOfContents.tsx`
- [x] `npm run build`
- [x] `docs/product/design.md` 사이드바 섹션·TOC 섹션 갱신
