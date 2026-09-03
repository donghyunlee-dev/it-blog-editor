# P5-2: 온보딩 팝업 — 검증 기록

## 자동화 테스트
| 커맨드 | 결과 |
|---|---|
| `npx vitest run src/lib/editor/account.test.ts src/app/api/editor/account/route.test.ts src/components/editor/OnboardingModal.test.tsx src/components/editor/EditorShell.test.tsx` | 통과 (25/25) |
| `npx vitest run` (전체 스위트) | 통과 (41 파일 / 380건) |
| `npm run lint` | 통과(기존 `postcss.config.js`/`tailwind.config.js` 경고 2건 외 신규 문제 없음) |
| `npx tsc --noEmit` | 통과(에러 없음) |
| `npm run build` | 통과 — `/api/editor/account` 라우트가 정상 등록됨을 빌드 출력으로 확인 |

## 수동 검증 (필요 시)
AX Auth 로그인 제약으로 이 세션에서 실제 계정으로 로그인해 `/editor` 화면에 온보딩 팝업이 뜨는 것을 브라우저로 직접 확인하지는 못했다(이 저장소의 다른 UI 작업들에 반복되는 동일한 제약). 대신 `OnboardingModal.test.tsx`가 `@sfood/ui`의 실제 `Modal`·`FormField`·`Input`·`Button`을 그대로 렌더링해 다음을 검증한다:
- `needsOnboarding: true`일 때만 `role="dialog"`가 나타난다.
- 이름·팀 `<label>`이 각각의 `<input>`과 올바르게 연결돼 있다(`getByLabelText`로 접근 가능).
- 이름·팀이 비어 있으면 "시작하기" 버튼이 비활성화된다.
- Escape 키를 눌러도 다이얼로그가 사라지지 않는다(저장 전 닫기 차단).
- 제출 성공 시 `PUT /api/editor/account`가 정확한 바디로 호출되고 다이얼로그가 사라진다.
- 제출 실패 시 다이얼로그가 남아있고 `role="alert"` 오류 메시지가 표시된다.

## 발견된 문제와 조치
- **원인**: `screen.getByLabelText("이름")`/`getByLabelText("팀")`이 처음엔 라벨을 찾지 못해 실패했다 — `@sfood/ui`의 `FormField`가 `required`일 때 라벨 텍스트 바로 뒤에 공백 없이 `<span>*</span>`을 붙여, 접근성 트리상 라벨 전체 텍스트가 "이름*"/"팀*"이 되기 때문이었다(정확히 일치해야 하는 `getByLabelText`의 기본 동작과 충돌).
- **조치**: 테스트의 `getByLabelText` 호출을 정확한 문자열 대신 접두 정규식(`/^이름/`, `/^팀/`)으로 바꿨다.
- **재검증 결과**: 6건 모두 통과.

- **원인**: `EditorShell.test.tsx`(마운트 시 `OnboardingModal`이 실제 `fetch`를 호출)에 `fetch`를 모킹하지 않아, 테스트 실행 중 실제(미해결) 네트워크 요청이 나갔다가 테스트 종료 시 `AbortError`가 콘솔에 출력됐다 — 테스트 자체는 통과했지만 CI 환경에 따라 느려지거나 불안정해질 수 있는 잠재 문제였다.
- **조치**: `EditorShell.test.tsx`의 `beforeEach`에 `needsOnboarding: false`로 응답하는 `fetch` stub을 추가했다.
- **재검증 결과**: `AbortError` 콘솔 출력 없이 3건 모두 통과.

## 검증 중 새로 발견한 결정 사항
없음.

## 최종 판정
- [x] 수용 기준(`task.md`)을 모두 만족함 — PRD 갱신 가능

## 2026-09-03 갱신 — Modal에서 전용 페이지(`/welcome`)로 재구성

### 자동화 테스트
| 커맨드 | 결과 |
|---|---|
| `npx vitest run src/lib/editor/folder.test.ts src/components/welcome/WelcomeForm.test.tsx src/components/editor/EditorShell.test.tsx` | 통과 (15/15) |
| `npx vitest run` (전체 스위트) | 통과 (41 파일 / 382건) |
| `npm run lint` | 통과(기존 경고 2건 외 신규 문제 없음) |
| `npx tsc --noEmit` | 통과(에러 없음) |
| `npm run build` | 통과 — `/welcome` 라우트가 정상 등록됨을 빌드 출력으로 확인 |

### 수동 검증 (필요 시)
이번에도 AX Auth 로그인 제약으로 이 세션에서 실제 계정으로 로그인해 `/welcome` 페이지가 뜨고
완료 시 `/editor`로 이동하는 것을 브라우저로 직접 확인하지는 못했다. 대신 `WelcomeForm.test.tsx`가
`@sfood/ui`의 실제 `FormField`·`Input`·`Button`을 렌더링해 다음을 검증한다:
- Modal(`role="dialog"`)이 아니라 일반 페이지 콘텐츠로 렌더링된다.
- 이름·팀이 비어 있으면 "시작하기" 버튼이 비활성화된다.
- 제출 성공 시 `PUT /api/editor/account`가 정확한 바디로 호출되고 `router.replace("/editor")`가
  호출된다.
- 제출 실패 시 오류 메시지가 뜨고 이동하지 않는다.

`ensurePersonalFolder`(서버 리다이렉트 판단의 기반)는 `folder.test.ts`에서 정상 조회·신규 생성·
동시 생성 경쟁(ConflictError 재조회)·재조회 실패 시 오류 전파 4가지 경로를 모두 검증한다.

### 발견된 문제와 조치
없음.

### 검증 중 새로 발견한 결정 사항
없음.

### 최종 판정
- [x] 갱신된 수용 기준(`task.md`)을 모두 만족함 — PRD 반영 완료
