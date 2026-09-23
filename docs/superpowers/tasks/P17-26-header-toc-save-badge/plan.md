# P17-26: 헤더 버튼·TOC 경계 여백 정렬 + 저장 상태 뱃지화 — 구현 계획

## Global Constraints
- 헤더 버튼/TOC 컬럼의 구조(그리드, 컬럼 폭)는 바꾸지 않는다 — 여백 값만 조정한다.
- 저장 상태 표시는 새 컴포넌트를 만들지 않고 `@sfood/ui`가 이미 제공하는 `Badge`를
  쓴다(CLAUDE.md 우선순위 ①).

## Task 1 — 경계선 기준 좌우 여백 정렬 (TOC 왼쪽 여백 축소)
### 원인 조사
- 임시 디버그 라우트(`/dev-preview-header-toc`, `EditorShell` + `DocumentEditor`를
  AX Auth 밖에서 마운트, 검증 후 삭제)에서 `getBoundingClientRect()`로 실측.
- 결과: 본문↔TOC 경계선(x=1160px, 1400px 뷰포트 기준) 기준 헤더 버튼 여백 24px
  (`px-6`) vs TOC 콘텐츠 여백 48px(`pl-12`) — 2배 차이.

### Files
- Modify: `src/components/editor/TableOfContents.tsx`
- Modify: `docs/product/design.md`(본문↔TOC 거터 스펙, TOC 섹션)

### Steps
- [x] **Step 1**: `TableOfContents.tsx`의 `nav` 클래스 `pl-12`(48px) → `pl-6`(24px).
- [x] **Step 2**: 근거 주석 갱신(48px였던 이유·24px로 줄인 이유 모두 남김).
- [x] **Step 3**: 임시 라우트에서 수정 후 재실측 — TOC 콘텐츠 여백(24px)이 헤더
      버튼 여백(24px)과 정확히 일치하는지 확인.
- [x] **Step 4**: `docs/product/design.md`의 "본문↔TOC 거터 48px" 표 값과 TOC
      섹션 설명을 24px로 갱신.

## Task 2 — 저장 상태를 Badge로 교체
### Files
- Modify: `src/components/editor/DocumentEditor.tsx`(`SaveStatusIndicator`, import)
- Modify: `docs/product/design.md`(컴포넌트 사용 표에 행 추가)

### Steps
- [x] **Step 1**: `@sfood/ui`가 제공하는 배지류 컴포넌트 확인 — `Badge`(배경·테두리
      있는 알약, variant: default/success/warning/danger/info)와 `StatusBadge`
      (점+텍스트, 배경 없음) 중 사용자가 요청한 "뱃지 형식"에 맞는 `Badge`를 채택.
- [x] **Step 2**: `import { Badge, Button, Modal, useToast } from "@sfood/ui"` 추가.
- [x] **Step 3**: `SaveStatusIndicator`를 `Badge`로 감싸고, 반응형 숨김(`hidden
      sm:flex`)은 Badge 바깥의 별도 `<span>`으로 분리 — Badge 자신의 기본
      `inline-flex`와 표시 유틸리티가 충돌하지 않게 한다.
- [x] **Step 4**: 상태별 `variant` 매핑 — 저장 중=`info`, 변경사항 있음=`warning`,
      저장됨=`success`.
- [x] **Step 5**: `role="status"`/`aria-live="polite"`는 바깥 `<span>`에 유지.
- [x] **Step 6**: `docs/product/design.md` 컴포넌트 사용 표에 "문서 헤더 저장 상태"
      행 추가.

## Task 3 — 헤더 버튼 그룹핑(구분선 도입)
사용자 확인 결과 **진행하지 않음** — Task 2(배지화)만으로 충분히 정돈되어 보인다는
판단. 별도 파일 변경 없음.

## 공통 검증
- [x] `npx vitest run src/components/editor/DocumentEditor.test.tsx
      src/components/editor/TableOfContents.test.tsx src/components/editor/EditorShell.test.tsx`
- [x] `npx eslint src/components/editor/DocumentEditor.tsx
      src/components/editor/TableOfContents.tsx`
- [x] `npm run build`
- [x] 임시 디버그 라우트로 실측 검증(수정 전/후 비교), 검증 후 라우트 삭제
