# P1-1a 후속: 문서 본문 검색(Ctrl+K 전체 검색) — 검증 기록

## 자동화 테스트
| 커맨드 | 결과 |
|---|---|
| `npx vitest run "src/lib/editor/documents.test.ts"` | 통과 (29/29, 신규 5건 포함) |
| `npx vitest run "src/app/api/editor/documents/search/route.test.ts"` | 통과 (4/4) |
| `npx vitest run "src/components/editor/EditorSidebar.test.tsx"` | 통과 (27/27, 회귀 없음) |
| `npx vitest run "src/components/editor/GlobalSearchModal.test.tsx"` | 통과 (7/7) |
| `npm test` (전체) | 통과 (352/352) |
| `npm run lint` | 통과(신규 `react-hooks/set-state-in-effect` 오류 2건 발견 → 수정 후 재통과, 기존 무관 경고 2건만 남음) |
| `npm run build` | 통과 |

## 수동 검증 (필요 시)
- 개발 서버를 재기동해(`.next` 캐시 초기화 포함) `GET /api/editor/documents/search`가 인증 없이 401을 반환함을 확인 — 라우트가 정상적으로 등록됐음을 확인(P1-9 시리즈에서 겪은 것과 같은 `.next` 캐시 이슈가 없는지도 함께 확인).
- AX Auth 로그인 제약으로 실제 로그인 후 Ctrl+K를 눌러보는 시각적 확인은 하지 못했다.

## 발견된 문제와 조치
- **원인**: `GlobalSearchModal.tsx`의 두 `useEffect`에서 조건부로 `setState`를 직접 호출하는 부분이 `npm run lint`의 `react-hooks/set-state-in-effect` 규칙에 걸려 오류 2건이 발생했다.
- **조치**: `EditorShell.tsx`가 이미 쓰던 관례(외부 신호에 대한 의도된 상태 동기화 — `// eslint-disable-next-line react-hooks/set-state-in-effect` + 이유 주석)를 그대로 따라 각 effect의 첫 `setState` 호출에만 disable 주석을 추가했다(같은 effect 안의 나머지 `setState` 호출에 중복으로 붙였던 disable 주석은 "미사용 지시어" 경고가 나 제거했다 — 이 규칙은 effect당 한 번만 보고하는 것으로 보인다).
- **재검증 결과**: `npm run lint` 통과(오류 0건, 기존 무관 경고 2건만 남음).

## 검증 중 새로 발견한 결정 사항
없음 — Issue #7로 이미 확정된 방식(온디맨드 서버 검색 + Ctrl+K 팝업)을 그대로 구현했다.

## 최종 판정
- [x] 수용 기준(`task.md`)을 모두 만족함 — PRD 갱신 가능
