# P8-5 긴급 수정: 목차 무한 루프 — 검증 기록

## 자동화 테스트
| 커맨드 | 결과 |
|---|---|
| `npx vitest run src/components/editor/TableOfContents.test.tsx` | 11개 전부 통과(기존 10개 갱신/유지 + 실제 TipTap 통합 테스트 1개 신규) |
| `npx vitest run src/components/editor/DocumentEditor.test.tsx` | 40개 전부 통과 — 통합 지점 회귀 없음 |
| `npx eslint src/components/editor/TableOfContents.tsx src/components/editor/TableOfContents.test.tsx` | 0 errors |
| `npm run build` | Turbopack 프로덕션 빌드 성공, TypeScript 통과, 28개 라우트 정상 생성 |

## 수동 검증
- 사용자가 실사용 중 두 증상(새로고침해도 목차 안 뜸, "## 중제목" 입력 시 사이트 멈춤)을
  보고했다. 이 세션은 AX Auth 로그인 제약으로 직접 브라우저에서 재현·재확인하지 못했지만,
  `node_modules/prosemirror-view/src/domobserver.ts` 소스로 원인을 확정하고, 실제
  `RichTextEditor`(TipTap)를 마운트해 ProseMirror의 진짜 `DOMObserver`와 우리
  `MutationObserver`가 공존하는 조건에서 헤딩을 새로 삽입해도 무한 루프 없이(테스트가
  타임아웃되지 않고 끝남) 목차가 갱신되며 헤딩에 아무 속성도 남지 않음을 확인했다 — 이
  실제 편집기 통합 테스트가 사이트가 멈추던 정확한 메커니즘을 재현·검증하는 가장 근접한
  방법이었다.

## 발견된 문제와 조치
- **원인**: `TableOfContents.tsx`가 스캔한 각 헤딩에 `element.id`를 직접 썼는데, 그 헤딩은
  ProseMirror가 관리하는 DOM이고 ProseMirror 자신도 같은 DOM에 `MutationObserver`
  (`attributes: true` 포함)를 붙여 감시한다. `registerMutation()`이 예상 밖 속성 변화를
  감지하면 그 노드 범위를 재조정 대상으로 돌려주는데, 그 재조정(다시 그리기)은 `childList`
  변화라 우리 쪽 `MutationObserver`가 또 감지해 다시 `scan()` → 다시 `id` 쓰기 →
  ProseMirror 재조정 → … 무한 루프가 됐다.
  **조치**: 헤딩을 id 대신 엘리먼트 참조로 추적하도록 다시 설계해, `TableOfContents`가
  ProseMirror의 DOM에 어떤 쓰기도 하지 않게 했다.
  **재검증**: 실제 TipTap 에디터를 마운트하는 통합 테스트를 추가해 확인(위 "수동 검증"
  참고) — 타임아웃 없이 통과.

## 검증 중 새로 발견한 결정 사항
없음.

## 최종 판정
- [x] 수용 기준(`task.md`)을 모두 만족함
