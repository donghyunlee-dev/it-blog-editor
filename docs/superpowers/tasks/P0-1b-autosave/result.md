# P0-1b: 자동 저장 도입 — 구현 결과 보고서

## 구현 내용

### 1. `autosave-storage.ts`(신규) — 순수 localStorage 헬퍼
- `writeAutosaveSnapshot`/`readAutosaveSnapshot`/`clearAutosaveSnapshot` — 문서별 키(`sfood-editor-autosave:{pageId}`)에 `{ title, doc, tags, savedAt }`을 담고/읽고/지운다. `savedAt`은 쓰기 시점에 자동으로 채워진다.
- 모든 localStorage 접근을 `try/catch`로 감싸 프라이빗 브라우징 등에서도 조용히 실패한다(`ThemeToggle.tsx`와 같은 기존 패턴).

### 2. `DocumentEditor.tsx` — 자동 저장 루프 + 복구 흐름
- **주기**: `mode==="edit" && pageId`일 때만 60초(`AUTOSAVE_INTERVAL_MS`) `setInterval`을 등록한다. 등록 자체는 `[mode, pageId]`에만 의존해, 매 키 입력마다 타이머가 리셋되지 않는다(조건 2 — "1분마다 체크").
- **변경분만**: `performAutosave`는 `isDirtyRef.current`가 false면 아무 것도 하지 않는다(조건 1).
- **localStorage 우선 기록**: Confluence PUT을 시도하기 직전에 `writeAutosaveSnapshot`으로 먼저 담아 둔다(조건 3). 저장이 성공하면 `clearAutosaveSnapshot`으로 지우고, 실패하면(네트워크 오류·버전 충돌 등) 그대로 남겨 다음 주기에 다시 시도한다 — 실패 시 경고 토스트로 알린다.
- **태그는 제외**: 자동 저장은 제목·본문만 저장한다(기존 `PUT /api/editor/documents/{pageId}`를 그대로 재사용, P0-3의 버전 가드도 자동으로 함께 적용된다). localStorage 임시본에는 태그도 함께 담아, 복구 시에는 태그도 되돌아온다.
- **조용한 진행**: 매 분 "저장되었습니다" 토스트를 띄우지 않는다 — 대신 풋터에 `role="status" aria-live="polite"`로 "자동 저장 중..."/"자동 저장됨"만 표시한다(PublishForm의 기존 상태 표시 패턴과 동일).
- **복구 흐름**: 마운트 시 `readAutosaveSnapshot`으로 임시 저장본을 확인하고, `savedAt`이 `initialUpdatedAt`(서버 최종 수정 시각)보다 최신이면 복구 확인 `Modal`을 띄운다. "복구"를 누르면 제목·본문·태그를 그 값으로 바꾸고 dirty로 표시한다. 오래된(이미 반영된) 임시본은 묻지 않고 조용히 지운다.

## 파일 변경 내역
| 파일 | 변경 사항 |
|------|---------|
| `src/lib/editor/autosave-storage.ts` | 신규 |
| `src/lib/editor/autosave-storage.test.tsx` | 신규(localStorage 의존이라 `.tsx`로 두어 happy-dom 환경을 쓴다 — 프로젝트 컨벤션) |
| `src/components/editor/DocumentEditor.tsx` | 자동 저장 루프, 복구 확인 Modal, 상태 표시 추가 |
| `src/components/editor/DocumentEditor.test.tsx` | 신규 테스트 6개 |

## 자체 검토 (Self-Review)

### 긍정 사항
- Issue #1의 확정 조건 3가지를 모두 그대로 구현했다.
- TDD로 진행했다 — 순수 헬퍼(`autosave-storage.ts`)부터 시작해 컴포넌트 통합까지 각 단계마다 먼저 실패를 확인했다.
- 기존 수동 저장 경로(`PUT /api/editor/documents/{pageId}`)를 그대로 재사용해 P0-3(sourceDocument 버전 가드)의 보호가 자동 저장에도 별도 작업 없이 그대로 적용된다.
- 새 문서(mode="create")는 의도적으로 범위 밖으로 뒀다(`task.md` 참고) — 사용자가 "저장"을 누르지 않았는데 문서함에 새 문서가 나타나는 예상 밖의 부작용을 피했다.

### 주의사항
- **테스트 작성 중 두 가지 vitest 함정을 발견했다**:
  1. `vi.useFakeTimers()`를 컴포넌트가 마운트되어 `setInterval`을 이미 등록한 **뒤에** 호출하면, 그 인터벌은 가짜 시계의 통제를 받지 않는다(실제 타이머로 이미 만들어졌기 때문) — 렌더링 **전에** 먼저 가짜 타이머를 켜야 한다.
  2. `vi.useFakeTimers()`를 인자 없이(모든 타이머 API를 가짜로) 켜면 React 19의 스케줄러가 내부적으로 쓰는 타이머까지 멈춰 렌더링이 아예 멈춘다(테스트가 타임아웃남) — `{ toFake: ["setInterval", "clearInterval"] }`로 정확히 필요한 것만 가짜로 바꿔야 한다.
  두 함정 모두 `DocumentEditor.test.tsx`의 "자동 저장(P0-1b)" describe 블록 주석에 남겨, 같은 패턴을 다시 쓸 때 반복하지 않게 했다.
- 자동 저장(1분 주기)이 진행 중일 때 사용자가 수동으로 "저장" 버튼을 누르면 두 PUT 요청이 겹칠 수 있다 — `status`(수동 저장/삭제 상태)와 `autosaveStatus`를 별개로 뒀기 때문에 서로를 막지 않는다. 다만 P0-3의 버전 가드 덕분에 겹치더라도 하나는 성공하고 다른 하나는 "이미 최신 버전으로 변경되었습니다" 오류로 안전하게 실패한다(새로운 회귀가 아니라 기존에도 있던 이중 제출 처리와 동일).

### 우려사항
- 실제 브라우저에서 1분을 기다려 눈으로 확인하는 수동 검증은 이 환경의 dev 서버 접속 제약으로 하지 못했다 — 자동화 테스트(가짜 타이머로 60초 경과를 시뮬레이션)로 대체했다.

## 후속 조치 — 가시성 개선(2026-08-27, 실사용 확인 중)
사용자가 실제 dev 서버에서 조건(변경 → 저장 안 함 → 60초 이상 대기)을 정확히 지켰는데도
풋터의 "자동 저장됨" 표시를 확인하지 못했다. 원인 진단을 위해 `console.log`/`console.error`
로 타이머 등록·tick·저장 시도/성공/실패를 단계별로 남기고, 성공 시에도(기존에는 실패 시에만
토스트가 있었다) 토스트를 띄우도록 임시로 바꿔 다시 확인을 요청했다.

**결과**: 토스트를 추가한 뒤에는 바로 보였다. 실제 원인은 타이밍 문제가 아니라 **가시성
문제**였던 것으로 판단된다 — 풋터의 `text-xs text-muted` 스타일 텍스트가 눈에 띄지 않아
지나쳤을 가능성이 높다(정확한 근본 원인을 100% 확정하지는 못했다 — 진단 로그를 볼 기회
없이 문제가 해결됨을 먼저 확인받았다).

**최종 조치**: 사용자 요청대로 진단용 `console.log`/`console.error`는 제거했다. 성공 시
토스트(`toast("자동 저장됨", "success")`)는 실제로 문제를 해결한 개선이라 그대로 남겼다 —
이제 자동 저장은 성공·실패 모두 토스트로 알리고, 풋터의 조용한 상태 표시는 보조 수단으로
유지된다.
