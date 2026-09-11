# P8-5 버그 수정: 목차 초기 렌더 타이밍 — 검증 기록

## 자동화 테스트
변경 파일과 직접 연관된 테스트만 실행했다(전체 스위트는 돌리지 않음 — CLAUDE.md 정책 참고).

| 커맨드 | 결과 |
|---|---|
| `npx vitest run TableOfContents.test.tsx -t "비동기로 채워져도"`(수정 전 코드) | **실패** — 버그 재현 확인(`headings.length`가 0으로 남아 `nav` 자체가 렌더링되지 않음) |
| `npx vitest run src/components/editor/TableOfContents.test.tsx`(수정 후) | 9개 전부 통과(기존 8개 + 신규 1개) |
| `npx vitest run src/components/editor/DocumentEditor.test.tsx` | 40개 전부 통과 — TOC 통합 지점 회귀 없음 |
| `npx eslint src/components/editor/TableOfContents.tsx src/components/editor/TableOfContents.test.tsx` | 0 errors |
| `npm run build`(격리된 `git worktree`에서 재실행) | Turbopack 프로덕션 빌드 성공, TypeScript 통과, 19개 라우트 정상 생성 — 메인 작업 디렉터리에서 겪었던 `.next/dev/types/validator.ts` 손상이 다른 세션 때문이었음을 이 격리 환경에서 재확인했다 |

## 수동 검증
- 사용자가 공유한 스크린샷(저장된 문서를 열었을 때 목차가 안 보이는 실제 화면)이 이
  버그의 최초 재현 증거였다. 이 세션에서는 AX Auth 로그인 제약으로 직접 브라우저 검증을
  반복하지 못했지만, 사용자가 제공한 실제 사례와 코드 추적(TipTap `immediatelyRender:false`
  타이밍) + 그 타이밍을 흉내 낸 자동화 테스트로 원인과 수정을 모두 확인했다.

## 발견된 문제와 조치
1. **원인**: `RichTextEditor.tsx`의 `useEditor({ immediatelyRender: false })`가 첫 렌더에서
   DOM을 그리지 않고 마운트 후 다음 커밋에서야 실제 h2/h3를 붙이는데, `TableOfContents`의
   헤딩 스캔이 `doc` prop 변경(=사용자 편집)에만 반응해, 문서를 열기만 하고 편집하지 않으면
   영영 재스캔되지 않았다.
   **조치**: `MutationObserver`로 컨테이너 DOM 자체의 변화를 직접 감시하도록 바꿨다.
   **재검증**: 버그를 재현하는 회귀 테스트를 수정 전(실패) → 수정 후(통과) 순서로 직접
   실행해 확인했다.
2. **원인(환경)**: 이 작업 도중 같은 저장소를 다른 세션이 동시에 쓰고 있다는 것을
   발견했다 — 원래 메인 작업 디렉터리에서 `result.md`/`test.md`를 스테이징하는 시점에
   그 세션의 `git commit`이 함께 가져가 버리는 충돌이 실제로 일어났다(`result.md`의
   "우려사항" 참고). `npm run build`/전체 `npx tsc --noEmit`도 메인 디렉터리에서는 그
   세션이 동시에 건드리는 `.next` 캐시·파일들 때문에 신뢰할 수 없는 상태였다.
   **조치**: 메인 작업 디렉터리를 더 이상 건드리지 않고, `git worktree add`로 이
   브랜치(`fix/toc-initial-render-race`)만 격리된 별도 디렉터리에 체크아웃해 나머지
   작업(이 문서 작성, 최종 검증)을 이어갔다.
   **재검증**: 격리된 worktree에서 위 표의 vitest/eslint 커맨드를 재실행해 전부 통과를
   확인했다.

## 검증 중 새로 발견한 결정 사항
없음.

## 최종 판정
- [x] 수용 기준(`task.md`)을 모두 만족함 — 다만 PRD 체크리스트 갱신은 다른 세션의
      동시 작업으로 이 세션에서 안전하게 반영하지 못했다(`result.md` "우려사항" 참고,
      해당 작업이 정리되는 대로 후속 커밋으로 P8-5 항목에 추가해야 한다).
