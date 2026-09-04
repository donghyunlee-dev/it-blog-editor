# P5-5: 계정 표시 형식 통일 — 구현 계획

## Global Constraints
- 이름이 없으면(하위 호환) 기존처럼 이메일만 보여준다 — 새 포맷 함수 하나로 계산하고 표시 위치마다 조건문을 반복하지 않는다.
- `AccountInfoModal`의 "이메일" 필드는 대상이 아니다(그 자체로 "이메일"이라는 라벨을 단 필드) — 계정을 "누구인지" 나타내는 일반 표시(사이드바 하단)만 바꾼다.

## Files
- Create: `src/lib/account-display.ts` (표시 형식 계산 함수 + 테스트)
- Modify: `src/app/editor/layout.tsx` (`accountMeta.name`을 `EditorShell`·`AccessBlockedScreen`에 전달)
- Modify: `src/components/editor/EditorShell.tsx` (`userName` prop 추가, `EditorSidebar`로 전달)
- Modify: `src/components/editor/EditorSidebar.tsx` (`userName` prop 추가, 표시 문구 계산)
- Modify: `src/components/editor/EditorSidebar.test.tsx`(있다면 회귀 확인)
- Modify: `src/components/AccessBlockedScreen.tsx` (`name` prop 추가, 표시 문구 계산)
- Modify: `src/components/AccessBlockedScreen.test.tsx`

## Steps
- [ ] **Step 1**: `src/lib/account-display.ts`에 `formatAccountLabel(email, name?)` 작성 — 이름이 있으면 `"{name}({email})"`, 없으면 `email` 그대로. 테스트 작성.
- [ ] **Step 2**: `editor/layout.tsx`가 `accountMeta.name`을 `EditorShell`의 새 `userName` prop과 `AccessBlockedScreen`의 새 `name` prop으로 전달.
- [ ] **Step 3**: `EditorShell.tsx`가 `userName`을 받아 `EditorSidebar`로 그대로 전달.
- [ ] **Step 4**: `EditorSidebar.tsx`가 `formatAccountLabel(userEmail, userName)`으로 계산한 문구를 하단 계정 버튼에 표시(title 속성도 함께 갱신). 관련 테스트 추가/보강.
- [ ] **Step 5**: `AccessBlockedScreen.tsx`가 `formatAccountLabel(email, name)`으로 계산한 문구를 안내 문구에 표시하도록 갱신. 관련 테스트 추가/보강.

각 Step은 `npm test -- account-display`/`EditorSidebar`/`AccessBlockedScreen`으로 검증 가능한 단위로 쪼갠다.
