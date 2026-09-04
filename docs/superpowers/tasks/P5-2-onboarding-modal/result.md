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

## 2026-09-03 세 번째 갱신 — 환영 페이지 디자인 보강 (서비스 소개 + 대화체 문구)

같은 날 위 재구성이 머지되기 전, 실제로 로그인해 화면을 본 사용자가 "환영 페이지가 너무
심심하다, 서비스 소개·장점이 조금이라도 보이면 좋겠다, 필드 문구도 '왜 필요한지' 설명이
있어야 한다, 메일 계정 표시도 해달라"는 구체적인 피드백을 줬다.

### 구현 내용
- `WelcomeForm`을 `@sfood/ui`의 `LandingSplit`(마케팅 랜딩 페이지 템플릿)로 다시 짰다 —
  `headline`/`subheadline`으로 서비스를 한 줄 소개하고, `features`(3개, 이모지 아이콘)로
  핵심 기능(초안 비공개, 원클릭 게시, WYSIWYG 에디터)을 보여준다. `ctaPrimary`/`ctaSecondary`
  (마케팅 CTA)는 넘기지 않아 화면의 유일한 1차 액션이 폼의 "시작하기" 버튼 하나가 되게 했다.
- `media` 슬롯에 우리 온보딩 폼을 넣었다 — `Card` 안에 `Avatar`(이메일 앞 두 글자 이니셜)로
  로그인 계정 이메일을 먼저 보여주고, 그 아래 `FormField` 2개의 라벨을 "이름을 알고
  싶어요"/"어디 소속인지 알려주세요"처럼 서비스가 직접 묻는 말투로, `hint`에는 왜
  필요한지(문서함 표시용, Phase 6 공유 대상 검색용)를 붙였다.
- 실제 브라우저(이 세션의 dev 서버, 임시 인증 우회 라우트로 렌더링 확인 후 삭제)로 라이트/
  다크·데스크톱/모바일(375px) 4가지 조합을 스크린샷으로 직접 확인하는 과정에서, 이름
  입력의 `autoFocus`가 마운트 즉시 포커스를 받으며 브라우저가 페이지를 아래로 스크롤시켜
  헤더(브랜드 로고, "SFOOD IT Editor")가 뷰포트 밖(`top: -76px`)으로 밀려나는 버그를
  발견해 `autoFocus`를 제거했다 — "화면 전체로 서비스를 소개한다"는 이번 개선의 목적과
  정면으로 부딪히는 부작용이었다.
- 제출 실패 안내를 인라인 `role="alert"` 텍스트에서 `Toast`(danger)로 바꿨다 — CLAUDE.md
  "저장 성공/실패 안내는 인라인 텍스트 대신 Toast" 규칙에 맞춘 것으로, `PublishForm.tsx`가
  이미 쓰는 패턴과 동일하게 통일했다(첫 Modal 버전과 첫 페이지 버전 모두 이 규칙을
  놓치고 있었다).

### 파일 변경 내역
| 파일 | 변경 사항 |
|------|---------|
| `src/components/welcome/WelcomeForm.tsx` | `LandingSplit` 기반으로 재작성, `email` prop 추가, `autoFocus` 제거, 실패 안내를 Toast로 통일 |
| `src/components/welcome/WelcomeForm.test.tsx` | 새 문구·구조에 맞춰 재작성 |
| `src/app/welcome/page.tsx` | `WelcomeForm`에 `email` prop 전달 |
| `docs/product/design.md` | "환영 페이지 — `LandingSplit` 재사용" 절 추가(이모지 아이콘·`autoFocus` 버그 등 결정 근거 포함) |
| `docs/product/prd.md` | 화면 정의·기능 정의·체크리스트를 새 디자인 기준으로 갱신 |

### 커밋 내역
| SHA | 메시지 |
|-----|--------|
| (PR에서 확인) | feat: redesign the welcome page with a service intro and conversational copy (Phase 5, P5-2 second followup) |

### 자체 검토 (Self-Review)
#### 긍정 사항
- `LandingSplit`이 폼의 존재를 전혀 강제하지 않는(순수 슬롯 기반) 컴포넌트라는 것을
  타입·실제 구현(`index.js`) 양쪽으로 확인한 뒤 채택해, 로그인 화면처럼 레이아웃을 직접
  복제해 그릴 필요가 없었다 — CLAUDE.md의 "`@sfood/ui` 우선" 원칙을 그대로 지켰다.
- `autoFocus` 버그는 코드 리뷰만으로는 발견하기 어려웠고, 실제로 브라우저에 렌더링해
  스크린샷을 찍어봤기 때문에 찾을 수 있었다 — 이 프로젝트의 다른 UI 작업들이 이미 같은
  방식(Playwright 스크린샷)으로 잡아낸 버그들과 같은 종류다.

#### 주의사항
- `FeatureItem.icon`에 이모지를 쓰기로 한 결정은 `@sfood/ui`의 실제 구현(`text-2xl` 래퍼)에
  근거했다 — `@sfood/ui`가 업그레이드되어 이 래퍼가 바뀌면(예: 고정 픽셀 크기의 아이콘
  전용 슬롯으로 바뀌면) design.md의 이 결정도 다시 확인해야 한다.

#### 우려사항
- 없음 — 이번엔 실제 렌더링(4가지 뷰포트/테마 조합)까지 스크린샷으로 확인했다.

## 2026-09-03 네 번째 갱신 — 레퍼런스 조사 기반 재설계 (AI 클리셰 제거, 용어 순화)

바로 위 재설계가 머지되기 전, 사용자가 다시 이 화면을 보고 "UI가 별로다, 이게 AI가 자주
쓰는 패턴이다, '초안'·'Tech Blog'·'WYSIWYG' 같은 단어를 쓰지 마라, 비개발자·일반 사원이
나만의 문서를 만들어 관리하고 팀원과 공유하는 서비스로 다시 포지셔닝해라, 웹 검색으로
레퍼런스 3~5개를 뽑아 장점을 평가하고 조합해서 다시 설계하라"는 구체적인 지시를 줬다.

### 구현 내용
- 웹 검색으로 레퍼런스 5개(Slack·Basecamp·Coda·미니멀 메모 앱 온보딩 원칙·"AI Slop" 웹
  디자인 안티패턴 가이드)를 조사하고, 비개발자 친화·따뜻함/개인화·간결함·AI 클리셰 회피·
  적용 가능성 5개 기준(각 5점, 25점 만점)으로 채점했다(상세 표는 design.md 참고 —
  Basecamp·미니멀 메모 앱 원칙이 각 23점으로 최고점).
- 직전 버전이 쓴 `LandingSplit`(배지+거대 헤드라인+이모지 아이콘 3열 카드)이 "AI Slop"
  가이드가 정리한 안티패턴(균일한 카드 그리드, 범용 아이콘, 모호한 헤드라인)과 정확히
  겹친다는 것을 확인하고 걷어냈다.
- 로그인 화면(`src/app/login/page.tsx`)이 쓰던 좌우 분할 레이아웃(`BrandPanelArt` + 우측
  콘텐츠)을 `src/components/AuthSplitShell.tsx`로 뽑아 `/login`·`/welcome` 양쪽이 공유하게
  했다 — 로그인 화면도 함께 리팩터링했고, 실제 브라우저로 렌더링 결과가 그대로인지
  재확인했다.
- `WelcomeForm`을 다시 짰다: 헤드라인+서브헤드라인+기능 카드 구조를 없애고 "반가워요!" +
  인사말 한 단락(서비스 소개를 자연스럽게 녹임)으로 바꿨다. 개발 용어를 모두 순화했다 —
  "초안"은 "아직 다른 사람에게 보여주고 싶지 않은 내용은 나만 볼 수 있게"로 풀어쓰고,
  "Tech Blog 게시"는 이 화면에서 아예 언급하지 않으며(사용자가 다시 정의한 포지셔닝—
  "나만의 문서 관리 + 팀 공유"—과도 맞다), "WYSIWYG 에디터" 언급 자체를 뺐다.
- 실제 브라우저로 다시 렌더링해 로그인 화면(회귀 없음)과 새 환영 페이지(데스크톱+모바일,
  라이트) 모두 스크린샷으로 확인했다.

### 파일 변경 내역
| 파일 | 변경 사항 |
|------|---------|
| `src/components/AuthSplitShell.tsx` | 신규 — 로그인 화면에서 추출한 좌우 분할 셸 |
| `src/app/login/page.tsx` | `AuthSplitShell` 사용하도록 리팩터링(렌더링 결과 동일) |
| `src/components/welcome/WelcomeForm.tsx` | `LandingSplit` 제거, `AuthSplitShell` 기반으로 재작성, 개발 용어 순화 |
| `src/components/welcome/WelcomeForm.test.tsx` | 새 문구·구조에 맞춰 재작성 |
| `docs/product/design.md` | "환영 페이지 재설계 — 'AI가 자주 쓰는 패턴' 지적과 레퍼런스 조사", "환영 페이지 — `AuthSplitShell` 추출" 두 절 추가 |
| `docs/product/prd.md` | 화면 정의·기능 정의·체크리스트를 이번 재설계 기준으로 갱신 |

### 커밋 내역
| SHA | 메시지 |
|-----|--------|
| (PR에서 확인) | refactor: rebuild the welcome page from researched references, drop dev jargon (Phase 5, P5-2 third followup) |

### 자체 검토 (Self-Review)
#### 긍정 사항
- "AI가 자주 쓰는 패턴"이라는 다소 막연할 수 있는 피드백을, 실제 웹 검색으로 찾은 구체적인
  안티패턴 체크리스트(그라디언트·3D 도형·글래스모피즘·균일 카드 그리드·모호한 헤드라인)와
  대조해 "어느 부분이 왜 그런지" 근거를 남겼다 — 다음에 비슷한 지적이 나와도 이 체크리스트로
  바로 점검할 수 있다.
- 로그인 화면과 셸을 공유하게 되면서, 이후 인증 관련 화면이 추가되더라도(예: 향후 접속
  차단 안내 화면, P5-3) 같은 브랜드 정체성을 자연스럽게 이어갈 수 있는 기반이 생겼다.

#### 주의사항
- 없음.

#### 우려사항
- 없음 — 로그인 화면 회귀 여부까지 실제 브라우저로 재확인했다.
