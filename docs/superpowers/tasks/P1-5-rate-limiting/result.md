# P1-5: 민감 API 엔드포인트에 레이트리밋을 추가한다 — 구현 결과 보고서

## 구현 내용
- `src/lib/rate-limit.ts`에 고정 윈도우(1분) 레이트리밋 유틸리티 `enforceRateLimit(action, identifier, limit = 30, now = Date.now())`를 추가했다. `action:identifier`를 키로 프로세스 메모리(`Map`)에 윈도우 시작 시각과 카운트를 저장하고, 윈도우가 바뀌면 자동으로 초기화한다. [Issue #5](https://github.com/sfood-pioneer-1st/sfood-it-editor/issues/5) 결정대로 외부 스토어 없이 단일 인스턴스 가정으로 구현했다.
- `src/lib/editor/errors.ts`에 `RateLimitError`(`retryAfterSeconds` 포함)를 추가하고, `src/lib/api-response.ts`가 이를 429(`RATE_LIMITED`)로 매핑하며 `Retry-After` 헤더에 남은 초를 싣는다.
- 문서 생성(`documents/route.ts` POST)·이미지 업로드(`[pageId]/images/route.ts` POST)·게시(`[pageId]/publish/route.ts` PATCH) 세 라우트에 `requireSessionEmail()` 직후 `enforceRateLimit("documents:{create|image-upload|publish}", email)`를 추가했다 — 세션 확인 다음, 실제 도메인 작업(폴더 조회·소유자 검증 등) 전에 검사해 초과 시 불필요한 후속 호출을 막는다.
- 임계값은 대화로 확인한 **사용자당 분당 30회**, 엔드포인트(action)별로 독립 집계한다.

## 파일 변경 내역
| 파일 | 변경 사항 |
|------|---------|
| `src/lib/rate-limit.ts` | 신규 — `enforceRateLimit` |
| `src/lib/rate-limit.test.ts` | 신규 — 5건 |
| `src/lib/editor/errors.ts` | `RateLimitError` 추가 |
| `src/lib/api-response.ts` | `RateLimitError` → 429 + `Retry-After` 매핑 |
| `src/app/api/editor/documents/route.ts` | POST에 레이트리밋 검사 추가 |
| `src/app/api/editor/documents/route.test.ts` | 초과 테스트 1건 추가 |
| `src/app/api/editor/documents/[pageId]/images/route.ts` | POST에 레이트리밋 검사 추가 |
| `src/app/api/editor/documents/[pageId]/images/route.test.ts` | 초과 테스트 1건 추가 |
| `src/app/api/editor/documents/[pageId]/publish/route.ts` | PATCH에 레이트리밋 검사 추가 |
| `src/app/api/editor/documents/[pageId]/publish/route.test.ts` | 초과 테스트 1건 추가 |
| `docs/product/prd.md` | P1-5 체크리스트 완료 표시 |

## 커밋 내역
| SHA | 메시지 |
|-----|--------|
| `37b77ce` | feat: 민감 API 엔드포인트에 레이트리밋 추가 (P1-5) |

## 자체 검토 (Self-Review)
### 긍정 사항
- `enforceRateLimit`에 `now` 파라미터를 주입 가능하게 해, `Date.now()`를 모킹하지 않고도 윈도우 롤오버·`retryAfterSeconds` 계산을 결정적으로 테스트할 수 있었다.
- 세 라우트 모두 세션 확인 직후, 다른 어떤 작업(폴더 조회·소유자 검증·Confluence 호출)보다 먼저 검사해 초과 시 낭비되는 작업이 없다.

### 주의사항
- 사용자별 식별자로 세션 이메일을 쓴다 — 로그인하지 않은 요청은애초에 `requireSessionEmail()`에서 401로 막히므로 레이트리밋 대상이 아니다(익명 요청 자체가 불가능).
- 서버 재시작 시 모든 카운터가 초기화된다(Issue #5에서 받아들인 한계).

### 우려사항
- 다중 인스턴스로 배포하면 인스턴스마다 카운터가 분리돼 실효 임계값이 인스턴스 수만큼 늘어난다 — Issue #5가 이미 이 한계를 명시적으로 받아들였고, AWS 배포 방식(P2-3)이 오토스케일링으로 바뀌면 재논의가 필요하다.
