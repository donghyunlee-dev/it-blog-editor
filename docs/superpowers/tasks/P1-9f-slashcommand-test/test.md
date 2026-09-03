# P1-9f: `SlashCommandExtension.ts` 테스트 — 검증 기록

## 자동화 테스트
| 커맨드 | 결과 |
|---|---|
| `npx vitest run "src/components/editor/SlashCommandExtension.test.ts"` | 통과 (20/20) |
| `npm test` (전체) | 통과 (287/287) |
| `npm run lint` | 통과 (기존 무관 경고 2건만 남음) |
| `npm run build` | 통과 |

## 수동 검증 (필요 시)
불필요 — 순수 유닛 테스트 추가.

## 발견된 문제와 조치
- **원인 1**: `createSlashMenuRenderer()`가 `document.createElement`를 호출하는데, 이 파일이 기본적으로 매칭되는 vitest의 "node" 프로젝트(`src/**/*.test.ts`)에는 DOM이 없어 `ReferenceError: document is not defined`로 실패했다.
  - **조치**: 파일 상단에 `// @vitest-environment happy-dom` 오버라이드를 추가해 이 파일만 DOM 환경에서 실행되게 했다(이 프로젝트에서 파일별 환경 오버라이드를 쓰는 첫 사례 — 주석으로 이유를 남김).
  - **재검증 결과**: 통과.
- **원인 2**: `npm run build`의 TypeScript 검사에서 타입 오류 3종이 발견됐다(vitest 실행 자체는 esbuild 변환이라 타입 오류를 잡지 못했음): (a) `ReturnType<typeof import(...)>`로 모듈 네임스페이스에 `ReturnType`을 잘못 적용, (b) `vi.fn(() => unmount)`가 매개변수 없는 목 함수로 추론돼 `mount.mock.calls[0][0]`이 빈 튜플의 인덱스 접근이 됨.
  - **조치**: (a) 렌더러가 실제로 쓰는 4개 콜백만 명시한 로컬 인터페이스(`SlashMenuRenderer`)로 캐스팅. (b) `vi.fn((_el: HTMLElement) => unmount)`로 매개변수 타입을 명시.
  - **재검증 결과**: `npm run build` 통과(TypeScript 오류 0건).

## 검증 중 새로 발견한 결정 사항
없음.

## 최종 판정
- [x] 수용 기준(`task.md`)을 모두 만족함 — PRD 갱신 가능
