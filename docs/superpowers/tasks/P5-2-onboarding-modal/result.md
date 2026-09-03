# P5-2: 온보딩 팝업 — 구현 결과 보고서

## 구현 내용
- `src/lib/editor/account.ts`의 `saveAccountMeta`가 이름·팀이 비어 있으면(공백만 있는 경우 포함) `ValidationError`를 던지도록 검증을 추가했다(P5-1에서는 저장 로직만 있고 검증이 없었다).
- `GET`/`PUT /api/editor/account`를 추가했다(`src/app/api/editor/account/route.ts`) — `folder/route.ts`·`documents/route.ts`와 동일한 인증(`requireSessionEmail`)·에러 변환(`toErrorResponse`) 관례를 따른다. 개인 폴더가 없으면(이론상 `/editor` layout이 항상 먼저 만들어두므로 실제로는 거의 발생하지 않음) `documents/route.ts`의 `POST`와 동일하게 404를 던진다.
- `OnboardingModal.tsx`를 추가했다 — 마운트 시 `GET /api/editor/account`를 호출해 `needsOnboarding`이 true일 때만 자기 자신을 렌더링한다. `@sfood/ui`의 `Modal`은 `onClose`가 Escape·배경 클릭·"✕" 버튼 클릭 모두를 그대로 호출하는 것을 소스로 확인해(라이브러리에 별도의 "닫기 금지" 옵션 없음), `onClose={() => {}}`(no-op)로 세 경로를 한 번에 막았다. 제출 성공 시 자체 상태를 `needsOnboarding: false`로 바꿔 Modal이 사라지게 하고 성공 Toast를 띄운다. 실패 시 Modal은 열린 채로 `role="alert"` 오류 메시지를 보여준다.
- `EditorShell.tsx`에 `<OnboardingModal />`을 `<GlobalSearchModal />`과 같은 위치(사이드바·children보다 앞)에 마운트했다.

## 파일 변경 내역
| 파일 | 변경 사항 |
|------|---------|
| `src/lib/editor/account.ts` | `saveAccountMeta`에 이름·팀 빈 값 검증(`ValidationError`) 추가 |
| `src/lib/editor/account.test.ts` | 위 검증에 대한 테스트 추가 |
| `src/app/api/editor/account/route.ts` | 신규 — `GET`/`PUT` |
| `src/app/api/editor/account/route.test.ts` | 신규 — 인증·검증·404 경로 포함 9건 |
| `src/components/editor/OnboardingModal.tsx` | 신규 |
| `src/components/editor/OnboardingModal.test.tsx` | 신규 — 6건(비표시/표시/버튼 비활성화/Escape 차단/제출 성공/제출 실패) |
| `src/components/editor/EditorShell.tsx` | `<OnboardingModal />` 마운트 |
| `src/components/editor/EditorShell.test.tsx` | `fetch`를 `needsOnboarding: false`로 stub해(P5-2로 새로 생긴 마운트 시 네트워크 호출) 기존 테스트가 실제 네트워크를 타지 않게 함 |
| `docs/superpowers/tasks/P5-2-onboarding-modal/{task,plan,result,test}.md` | 이 작업의 4파일 |
| `docs/product/prd.md` | 체크리스트 P5-2 완료 표시 |

## 커밋 내역
| SHA | 메시지 |
|-----|--------|
| (PR에서 확인) | feat: add onboarding modal for name/team (Phase 5, P5-2) |

## 자체 검토 (Self-Review)
### 긍정 사항
- `@sfood/ui` Modal의 실제 구현(`onClose`가 Escape/배경 클릭/✕ 버튼 세 경로 모두에서 호출됨)을 소스(`node_modules/@sfood/ui/dist/index.js`)로 직접 확인한 뒤 no-op 패턴을 선택했다 — CLAUDE.md의 "design.md와 실제 구현이 다르면 실제 구현 우선" 원칙과 일치하며, 추측이 아니라 확인된 사실에 기반했다.
- 이름·팀 검증을 API 라우트가 아니라 도메인 계층(`account.ts`)에 둬 `documents.ts`의 기존 검증 관례(제목·본문 검증이 도메인 계층에 있음)와 일관성을 유지했다.
- 이 작업이 `EditorShell.test.tsx`에 새로 생긴 마운트 시 실제 네트워크 호출(fetch)을 발견해(기존에는 GlobalSearchModal이 검색어 입력 시에만 fetch해 이 문제가 없었다) 그 자리에서 fetch stub을 추가해 해결했다 — 방치했다면 CI 환경에 따라 느려지거나 불안정해질 수 있었다.

### 주의사항
- 온보딩 완료 여부는 클라이언트가 `GET /api/editor/account` 응답에만 의존한다 — 이 요청이 실패하면(네트워크 오류 등) Modal이 아예 뜨지 않고 조용히 넘어간다(의도적 선택, "필요 정보 요청 실패로 사용자를 화면에 영원히 가두지 않는다"). 대신 다음 로그인/새로고침 때 다시 시도된다.

### 우려사항
- AX Auth 로그인 제약으로 이 세션에서 실제 화면에 온보딩 팝업이 뜨는 것을 브라우저로 직접 확인하지는 못했다(이 저장소의 다른 UI 작업들과 동일한 제약, `test.md` 참고) — 컴포넌트 테스트(6건, Modal의 실제 DOM 렌더링·`role="dialog"`·라벨 연결·Escape 차단·제출 흐름을 모두 검증)로 대체했다.

## 2026-09-03 갱신 — Modal에서 전용 페이지(`/welcome`)로 재구성

위 구현이 머지된 뒤 사용자 피드백("팀, 이름 받는 게 메인에서 팝업으로 받는 방법은 아닌 것
같다 — 로그인 화면에서 계정을 못 찾으면 환영 페이지로 이동했다가 완료하면 메인으로 가야
한다")을 받아 다시 구현했다. 아래는 이 변경분만의 결과 보고다.

### 구현 내용
- `OnboardingModal.tsx`/`OnboardingModal.test.tsx`를 삭제하고, `EditorShell.tsx`에서 마운트를
  제거했다(더 이상 `/editor` 화면 위에 아무 것도 자동으로 뜨지 않는다).
- `src/lib/editor/folder.ts`에 `ensurePersonalFolder(email)`을 추가했다 — `/editor/layout.tsx`가
  이미 하던 "계정 폴더 find-or-create, 동시 생성 경쟁 시 `ConflictError`를 재조회로 흡수"
  로직을 `/welcome/page.tsx`도 똑같이 필요로 해서, 두 곳이 각자 복붙하는 대신 하나로 모았다.
- `src/app/editor/layout.tsx`가 `ensurePersonalFolder`로 계정 폴더를 확보한 뒤,
  `getAccountMeta`+`needsOnboarding`으로 온보딩 여부를 판단해 `true`면 `/welcome`로
  `redirect()`한다(서버 컴포넌트의 강제 리다이렉트라 클라이언트에서 우회할 수 없다).
- `src/app/welcome/page.tsx`(서버 컴포넌트)를 신설했다 — 세션이 없으면 `/login`으로, 이미
  온보딩이 끝난 계정이면 `/editor`로 각각 돌려보내고, 그 외에는 `WelcomeForm`을 렌더링한다.
- `src/components/welcome/WelcomeForm.tsx`(클라이언트 컴포넌트)를 신설했다 — 로그인
  화면(`src/app/login/page.tsx`)의 "박스 없이 배경 위에 뜬 중앙 정렬" 레이아웃을 그대로
  재사용했다. 제출 성공 시 `router.replace("/editor")`로 이동한다.

### 파일 변경 내역
| 파일 | 변경 사항 |
|------|---------|
| `src/components/editor/OnboardingModal.tsx`, `OnboardingModal.test.tsx` | 삭제 |
| `src/components/editor/EditorShell.tsx` | `<OnboardingModal />` 마운트 제거 |
| `src/components/editor/EditorShell.test.tsx` | 더 이상 필요 없어진 fetch stub 제거(원래 형태로 복귀) |
| `src/lib/editor/folder.ts` | `ensurePersonalFolder` 신설 |
| `src/lib/editor/folder.test.ts` | 위 함수에 대한 테스트 4건 추가 |
| `src/app/editor/layout.tsx` | `ensurePersonalFolder` + `needsOnboarding` 리다이렉트 적용 |
| `src/app/welcome/page.tsx` | 신규 |
| `src/components/welcome/WelcomeForm.tsx` | 신규 |
| `src/components/welcome/WelcomeForm.test.tsx` | 신규 — 4건 |
| `docs/product/design.md` | "온보딩 — Modal에서 전용 페이지로 전환" 절 추가 |
| `docs/product/architecture.md`, `docs/product/prd.md` | 온보딩 관련 서술을 페이지 방식으로 갱신 |

### 커밋 내역
| SHA | 메시지 |
|-----|--------|
| (PR에서 확인) | refactor: move onboarding from a modal to a dedicated /welcome page (Phase 5, P5-2 followup) |

### 자체 검토 (Self-Review)
#### 긍정 사항
- 온보딩 여부 판단을 서버 컴포넌트(`layout.tsx`/`welcome/page.tsx`)에서만 하고 `redirect()`로
  강제해, 클라이언트 상태 조작으로 우회할 수 없다 — Modal 버전은 컴포넌트가 안 뜨는 것에만
  의존했다는 점에서 이번 방식이 더 견고하다.
- 로그인 화면이 이미 정립해 둔 레이아웃을 재사용해 새로운 시각 언어를 만들지 않았다.

#### 주의사항
- AX Auth 콜백(`/api/auth/ax-callback`)은 그대로 두고 항상 `/editor`로만 보낸다 — 로그인 직후
  곧바로 `/welcome`으로 보내는 것도 가능했지만, 콜백 라우트에 도메인 조회 책임을 얹기보다는
  이미 그 책임을 지고 있는 `/editor/layout.tsx`가 판단하게 두는 것이 계층 원칙에 맞다고
  판단했다(왕복 리다이렉트 한 번이 늘어나는 대신 얻는 이득).

#### 우려사항
- 이번에도 AX Auth 로그인 제약으로 실제 브라우저에서 `/welcome` 페이지가 뜨는 것을 직접
  확인하지는 못했다 — `WelcomeForm.test.tsx`(4건)로 대체했다.
