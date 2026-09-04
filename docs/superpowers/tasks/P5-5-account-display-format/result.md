# P5-5: 계정 표시 형식 통일 — 구현 결과 보고서

## 구현 내용
- `src/lib/account-display.ts`에 `formatAccountLabel(email, name?)`를 추가했다 — 이름이 있으면 `"{이름}({이메일})"`, 없으면(공백만 있는 경우 포함) 이메일 그대로 반환한다.
- 계정을 표시하던 위치 두 곳을 이 함수로 통일했다:
  - 사이드바 하단(`EditorSidebar.tsx`)의 계정 정보 진입점(P5-4에서 만든 버튼) — `editor/layout.tsx`가 `accountMeta.name`을 `userName`으로 `EditorShell` → `EditorSidebar`까지 전달한다.
  - 접속 차단 안내 화면(`AccessBlockedScreen.tsx`, P5-3) — `editor/layout.tsx`가 같은 `accountMeta.name`을 `name` prop으로 전달한다(접속 차단은 온보딩 여부와 독립적이라, 이미 온보딩을 마친 뒤 차단된 계정은 이름이 있을 수 있다).
- 다음 두 곳은 의도적으로 그대로 뒀다: `AccountInfoModal`의 "이메일" 필드(값 자체가 이메일이라는 걸 라벨로 명시), 환영 페이지(`/welcome`)의 "이 계정으로 오셨어요"(온보딩 전 화면이라 애초에 이름이 있을 수 없음 — `formatAccountLabel`을 적용해도 항상 이메일만 나오는 것과 같다).

## 파일 변경 내역
| 파일 | 변경 사항 |
|------|---------|
| `src/lib/account-display.ts` | 신규 — `formatAccountLabel` |
| `src/lib/account-display.test.ts` | 신규 — 3건 |
| `src/app/editor/layout.tsx` | `accountMeta.name`을 `EditorShell.userName`·`AccessBlockedScreen.name`으로 전달 |
| `src/components/editor/EditorShell.tsx` | `userName` prop 추가, `EditorSidebar`로 전달 |
| `src/components/editor/EditorSidebar.tsx` | `userName` prop 추가, `formatAccountLabel`로 표시 문구 계산 |
| `src/components/editor/EditorSidebar.test.tsx` | `userName` 제공 시 "이름(이메일)" 표시 테스트 추가 |
| `src/components/AccessBlockedScreen.tsx` | `name` prop 추가, `formatAccountLabel`로 안내 문구 계산 |
| `src/components/AccessBlockedScreen.test.tsx` | `name` 제공 시 "이름(이메일)" 표시 테스트 추가 |
| `docs/product/prd.md` | 체크리스트 P5-5 완료 표시 |

## 커밋 내역
| SHA | 메시지 |
|-----|--------|
| (PR에서 확인) | feat: unify account display as "name(email)" (Phase 5, P5-5) |

## 자체 검토 (Self-Review)
### 긍정 사항
- 구현 전에 Explore 에이전트로 계정/이메일이 화면에 렌더링되는 모든 위치를 먼저 훑어(사이드바, 접속 차단 화면, 환영 페이지, `AccountInfoModal`의 "이메일" 필드) 어디를 바꾸고 어디를 그대로 둬야 하는지 근거를 갖고 판단했다 — 빠뜨린 위치 없이 한 번에 정리했다.
- 형식 계산을 컴포넌트마다 흩어놓지 않고 `formatAccountLabel` 함수 하나로 모아, 다음에 계정 표시 위치가 늘어나도(예: Phase 6의 계정 관리 페이지) 그대로 재사용할 수 있다.

### 주의사항
- 없음.

### 우려사항
- 없음 — 이미 검증된 레이아웃(사이드바 버튼, Alert 안내 문구)에 문자열만 바뀌는 변경이라 자동화 테스트로 충분하다고 판단했다.
