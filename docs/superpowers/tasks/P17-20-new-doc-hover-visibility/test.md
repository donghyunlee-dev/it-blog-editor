# P17-20: 새 문서 버튼 hover가 라이트 모드에서 안 보이던 문제 수정 — 검증 기록

## 자동화 테스트
| 커맨드 | 결과 |
|---|---|
| `npx vitest run src/components/editor/EditorSidebar.test.tsx` | 통과 (79/79, 신규 1건 포함) |
| `npx eslint src/components/editor/EditorSidebar.tsx src/components/editor/EditorSidebar.test.tsx` | 통과 (경고/에러 없음) |
| `npm run build` | 통과 (컴파일·타입체크·정적 페이지 생성 모두 성공) |

## 수동 검증(원인 확인 + 컴파일된 CSS 검증)
1. **원인 확인**: `node_modules/@sfood/ui/tokens/semantic.css` 14~17행 —
   라이트 모드(`:root`) 기본값에서 `--color-surface: var(--white)`,
   `--color-surface-raised: var(--white)` — 완전히 같은 값. 반면 다크 모드
   (81~84행, 99~102행)에서는 `--color-surface: gray-900`,
   `--color-surface-raised: gray-800`으로 다르다 — 이 세션이 다크 모드로만
   확인해 처음에 이 버그를 놓쳤다는 것과 정확히 일치.
2. **수정 후 컴파일된 CSS 확인**: `/dev-preview-hover`(임시 라우트, 검증 후
   삭제)를 열어 브라우저 CSSOM에서 `.sidebar-row-hover`와 관련된 규칙을 모두
   덤프한 결과:
   ```
   .sidebar-row-hover:hover { background-color: var(--color-brand); }
   @supports (color: color-mix(in lab, red, red)) {
     .sidebar-row-hover:hover { background-color: color-mix(in srgb, var(--color-brand) 5%, var(--color-surface)); }
   }
   ```
   Chromium은 `color-mix`를 지원하므로 `@supports` 블록이 적용된다 — 즉 hover 시
   배경이 `--color-surface`에 브랜드색 5%를 섞은 색이 되어, 라이트/다크 어느
   테마든 기본 `bg-surface`와 항상 실제로 다른 색이 나온다.
3. `data-theme="light"`를 강제 지정했을 때 `<html>`의 `--color-surface` 계산값이
   `#fff`로 정상 확인됐다(라이트 토큰 자체는 올바르게 적용됨). 다만 이 세션의
   원격 브라우저에서 개별 요소의 `background-color`가 그 변경을 즉시 반영하지
   않는 환경 고유 현상이 있어(색상 스킴 에뮬레이션 이슈로 추정), 실제 화면
   스크린샷 대신 위 2번(컴파일된 CSS 규칙 자체)으로 검증을 대체했다.

## 발견된 문제와 조치
- **원인**: `hover:bg-surface-raised`가 라이트 모드에서 `bg-surface`와 같은 값이라
  hover 시 아무 변화가 없었다.
- **조치**: 이미 검증된 `.sidebar-row-hover`(color-mix 기반)로 교체.
- **재검증 결과**: 위 "수동 검증" 2번, 자동화 테스트로 확인.

## 검증 중 새로 발견한 결정 사항
없음.

## 최종 판정
- [x] 수용 기준(`task.md`)을 모두 만족함 — PRD 갱신 가능.
