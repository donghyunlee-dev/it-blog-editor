# P8-1: 헤더 레이아웃 정비 — 검색 트리거 버튼 추가 — 검증 기록

## 자동화 테스트
| 커맨드 | 결과 |
|---|---|
| `npx vitest run src/components/editor/GlobalSearchModal.test.tsx src/components/editor/EditorShell.test.tsx src/components/editor/EditorSidebar.test.tsx` | 3개 파일, 84개 전부 통과(신규 6개 포함) |
| `npx tsc --noEmit` | 통과, 에러 없음 |
| `npm test` | 61개 파일, 624개 전부 통과 |
| `npm run lint` | 변경 파일 3개(`GlobalSearchModal.tsx`/`EditorSidebar.tsx`/`EditorShell.tsx`) 기준 0 errors(아래 "문제 → 조치" 참고). 전체 실행 시 나오는 나머지 항목은 이 브랜치와 무관한 기존/로컬 노이즈(아래 설명) |
| `npm run build` | Turbopack 프로덕션 빌드 성공, TypeScript 통과, 28개 라우트 정상 생성 |

## 수동 검증
- AX Auth 로그인 제약으로 이 세션에서는 실제 브라우저로 확인할 수 없었다(PRD의 기존 항목들과
  동일한 한계, P7-7 `test.md` 참고). 자동화 테스트(컴포넌트 렌더링 + 클릭 이벤트 + 결과 DOM
  확인)로만 검증했다 — `GlobalSearchModal.test.tsx`/`EditorSidebar.test.tsx`/
  `EditorShell.test.tsx`의 신규 6개 케이스가 "버튼 클릭 → `getByLabelText('문서 전체 검색')`
  로 모달이 실제로 나타남"을 각 진입점(사이드바 헤더, 모바일 상단 바, `openSignal` prop
  자체)마다 직접 확인한다.

## 발견된 문제와 조치
1. **원인**: `npm run lint` 첫 실행에서 `GlobalSearchModal.tsx`의 새 effect(`openSignal`
   변경 시 `setOpen(true)` 호출)가 `react-hooks/set-state-in-effect` 규칙에 걸려 에러가
   났다 — "effect 안에서 곧바로 setState를 호출하지 말라"는 규칙인데, 이 프로젝트는 같은
   패턴(외부 신호를 내부 state로 동기화하는 의도된 effect)에 대해 `EditorShell.tsx`의
   `isMobile`/`sidebarWidth` 초기화 등에서 이미 `eslint-disable-next-line
   react-hooks/set-state-in-effect` 주석으로 예외 처리해 온 기존 관례가 있었다.
   **조치**: 같은 주석을 새 effect에도 추가했다(코드 자체는 바꾸지 않음 — 의도된 동작임을
   명시).
   **재검증**: `npx eslint src/components/editor/GlobalSearchModal.tsx
   src/components/editor/EditorShell.tsx src/components/editor/EditorSidebar.tsx` → 0 errors.
2. **참고(이 작업이 만든 문제 아님)**: `npm run lint`를 저장소 루트 전체로 실행하면
   `.claude/worktrees/gallant-engelbart-b2998e/...`(다른 세션이 남긴 로컬 워크트리의 빌드
   산출물, `.git/info/exclude`로 이미 git에서는 무시됨) 안의 번들 파일이 함께 린트되어
   `react/no-find-dom-node` 등 무관한 에러/경고가 섞여 나온다. 이 디렉터리는 이 브랜치의
   변경 사항이 아니고 공유 저장소에도 커밋되지 않으므로(로컬 전용) 이 작업의 범위에서
   고치지 않았다 — 변경 파일 3개만 별도로 린트해 이 작업 자체는 깨끗함을 확인했다.

## 검증 중 새로 발견한 결정 사항
없음.

## 최종 판정
- [x] 수용 기준(`task.md`)을 모두 만족함 — PRD 갱신 가능
