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
