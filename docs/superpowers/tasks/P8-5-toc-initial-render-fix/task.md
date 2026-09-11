# P8-5 버그 수정: 문서를 열기만 하면(편집 안 하면) 목차가 안 보이던 문제

## 배경
사용자가 실제 화면 스크린샷을 공유하며 "저장된 문서를 열었는데 헤딩이 여러 개 있고
화면 폭도 1280px를 훌쩍 넘는데 목차가 안 보인다"고 지적했다. 코드를 다시 추적한 결과
실제 버그였다.

**원인**: `RichTextEditor.tsx`는 Next.js SSR/hydration 안전을 위해
`useEditor({ immediatelyRender: false })`를 쓰는데, 이 옵션은 **첫 렌더에서는 아무 DOM도
그리지 않고 마운트 후 다음 커밋에서야** 실제 ProseMirror DOM(h2/h3 포함)을 붙인다.
`TableOfContents.tsx`의 헤딩 스캔은 `doc`(TipTap JSONContent) prop이 바뀔 때만 다시
실행됐는데, `doc`은 `RichTextEditor`의 `onUpdate`(사용자가 실제로 편집할 때만 호출)를
통해서만 바뀐다 — 즉 **문서를 열어서 읽기만 하고 아무것도 편집하지 않으면 `doc`이 한
번도 안 바뀌어 스캔이 다시 실행되지 않고, 뒤늦게 나타난 실제 헤딩 DOM을 영영 못 찾는다.**
문서를 편집하는 순간(예: 스페이스 하나만 쳐도) `doc`이 바뀌어 재스캔되며 그제서야 목차가
나타나는데, 사용자는 그 계기를 모르니 "목차가 아예 없다"로 보인다.

이 버그는 `TableOfContents.test.tsx`(합성 HTML을 동기적으로 미리 넣어두는 테스트)와
`DocumentEditor.test.tsx`(실제 TipTap 대신 `<textarea>` 대역을 쓰는 테스트) 어느 쪽도
잡아낼 수 없는 구조였다 — 실제 TipTap의 `immediatelyRender:false` 비동기 마운트 타이밍을
재현하는 테스트가 없었다.

관련 PRD 항목: `docs/product/prd.md`의 **P8-5**(우측 목차 TOC 신규 구현) — 이미 완료로
표시돼 있었으나, 이 버그는 그 완료 표시 이후 실사용 확인 중 발견됐다.

## 수용 기준 (Acceptance Criteria)
- [x] 문서를 열기만 하고(편집하지 않고) 그 문서에 H2/H3가 있으며 화면 폭이 1280px
      이상이면, 목차가 나타난다.
- [x] 기존 "doc이 바뀌면 재스캔"(사용자가 실제로 편집할 때) 동작은 그대로 유지된다.
- [x] `TableOfContents.test.tsx`에 이 버그를 재현하는 회귀 테스트를 추가한다(수정 전에는
      실패하고 수정 후에는 통과함을 직접 확인).
- [x] 기존 8개 TOC 테스트, `DocumentEditor.test.tsx` 40개에 회귀가 없다.

## 결정이 필요한 사항
없음 — 수정 방식(`MutationObserver`로 컨테이너 DOM 변화를 직접 감시)은 이 컴포넌트가
이미 채택한 원칙("ProseMirror는 React 렌더 트리 밖에서 관리하는 DOM이라 그 DOM을 직접
읽는다")의 연장선이라 GitHub Issue 없이 직접 정했다.

## 범위 밖
- `RichTextEditor.tsx`의 `immediatelyRender: false` 설정 자체를 바꾸는 것(SSR/hydration
  안전을 위해 의도적으로 켜둔 설정 — 이 설정은 그대로 두고 TOC 쪽에서 대응한다).
- TOC의 다른 동작(활성 추적, 클릭 스크롤, 반응형 노출 조건) 변경 — 이번 수정은 초기 스캔
  타이밍 버그만 다룬다.
