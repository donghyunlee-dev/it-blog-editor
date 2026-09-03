# P5-2: 온보딩 팝업 — 구현 계획

## Global Constraints
- 이름·팀 유효성 검사는 API 라우트가 아니라 도메인 계층(`account.ts`)에서 한다 — `documents.ts`가 제목·본문 검증을 도메인 계층에서 하는 기존 관례와 동일.
- `@sfood/ui`의 `Modal`은 `onClose`가 Escape·배경 클릭·"✕" 버튼 클릭 모두를 그대로 호출한다(라이브러리에 별도의 "닫기 금지" 옵션이 없음, 소스 확인). 온보딩 완료 전에는 `onClose`에 no-op을 넘겨 세 가지 닫기 경로를 한 번에 막는다.
- UI 컴포넌트는 CLAUDE.md 규칙대로 `@sfood/ui`(`Modal`/`FormField`/`Input`/`Button`/`useToast`)만 쓰고 색상은 하드코딩하지 않는다.

## Files
- Modify: `src/lib/editor/account.ts` (`saveAccountMeta`에 빈 값 검증 추가)
- Modify: `src/lib/editor/account.test.ts`
- Create: `src/app/api/editor/account/route.ts`
- Create: `src/app/api/editor/account/route.test.ts`
- Create: `src/components/editor/OnboardingModal.tsx`
- Create: `src/components/editor/OnboardingModal.test.tsx`
- Modify: `src/components/editor/EditorShell.tsx` (`<OnboardingModal />` 마운트)

## Steps
- [ ] **Step 1**: `account.ts`의 `saveAccountMeta`가 `name`/`team`이 공백만 있어도 `ValidationError`를 던지도록 검증 추가. `account.test.ts`에 케이스 추가.
- [ ] **Step 2**: `src/app/api/editor/account/route.ts`에 `GET`(계정 정보+`needsOnboarding` 조회)·`PUT`(저장) 작성, `folder/route.ts`·`documents/route.ts`와 동일한 인증·에러 처리 관례 적용. `route.test.ts` 작성.
- [ ] **Step 3**: `OnboardingModal.tsx` 작성 — 마운트 시 `GET /api/editor/account` 호출, `needsOnboarding`이면 Modal을 자동으로 연다. 제출 시 `PUT /api/editor/account` 호출, 성공하면 Modal을 닫고 Toast, 실패하면 Modal 안에 오류 메시지를 유지.
- [ ] **Step 4**: `EditorShell.tsx`에 `<OnboardingModal />`을 `<GlobalSearchModal />`과 같은 위치에 추가.
- [ ] **Step 5**: `OnboardingModal.test.tsx` 작성 — `needsOnboarding: true`/`false` 각각의 초기 렌더링, 제출 성공/실패, Escape/배경 클릭으로 닫히지 않음(onClose no-op)을 검증.

각 Step은 `npm test -- account`/`OnboardingModal`로 검증 가능한 단위로 쪼갠다.

## 2026-09-03 갱신 — Modal에서 전용 페이지(`/welcome`)로 재구성

위 계획대로 구현·머지된 뒤, "메인에서 팝업으로 받는 방법은 아니다"라는 피드백을 받아 다시 짰다.

### Global Constraints (추가)
- 서버 리다이렉트(`redirect()`)로 강제한다 — 클라이언트 상태(예: 컴포넌트가 안 뜨는 것)에만 의존하면 사용자가 URL을 직접 조작해 우회할 수 있다. `/editor/layout.tsx`와 `/welcome/page.tsx` 양쪽 모두 서버 컴포넌트에서 판단한다.
- 로그인 화면(`src/app/login/page.tsx`)의 "박스 없이 중앙 정렬" 레이아웃을 그대로 재사용해 새로운 시각 언어를 만들지 않는다.

### Files (추가/변경)
- Modify: `src/lib/editor/folder.ts` (`ensurePersonalFolder` 신설 — `/editor/layout.tsx`·`/welcome/page.tsx` 공용)
- Modify: `src/lib/editor/folder.test.ts`
- Modify: `src/app/editor/layout.tsx` (`ensurePersonalFolder` 사용 + `needsOnboarding`이면 `/welcome`로 리다이렉트)
- Create: `src/app/welcome/page.tsx`
- Create: `src/components/welcome/WelcomeForm.tsx`
- Create: `src/components/welcome/WelcomeForm.test.tsx`
- Delete: `src/components/editor/OnboardingModal.tsx`, `src/components/editor/OnboardingModal.test.tsx`
- Modify: `src/components/editor/EditorShell.tsx`(`<OnboardingModal />` 제거), `src/components/editor/EditorShell.test.tsx`(더 이상 필요 없어진 fetch stub 되돌림)

### Steps (추가)
- [ ] **Step 6**: `folder.ts`에 `ensurePersonalFolder` 추가(find-or-create, 경쟁 상황의 `ConflictError`는 재조회로 흡수). `folder.test.ts`에 테스트 추가.
- [ ] **Step 7**: `editor/layout.tsx`를 `ensurePersonalFolder` + `needsOnboarding` 검사로 갱신.
- [ ] **Step 8**: `welcome/page.tsx`(서버 컴포넌트, 세션·온보딩 여부 판단) + `WelcomeForm.tsx`(클라이언트, 로그인 화면과 동일한 레이아웃) 작성.
- [ ] **Step 9**: `OnboardingModal` 관련 파일 삭제, `EditorShell.tsx`/`EditorShell.test.tsx` 정리.
- [ ] **Step 10**: `WelcomeForm.test.tsx` 작성(폼 표시, 제출 성공 시 `/editor`로 이동, 실패 시 오류 표시).
