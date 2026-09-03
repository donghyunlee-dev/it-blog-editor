# P1-9e: `RichTextEditor.tsx` 테스트 — 검증 기록

## 자동화 테스트
| 커맨드 | 결과 |
|---|---|
| `npx vitest run "src/components/editor/RichTextEditor.test.tsx"` | 통과 (27/27, 신규 12건 포함) |
| `npm test` (전체) | 통과 (280/280) |
| `npm run lint` | 통과 (기존 무관 경고 2건만 남음) |
| `npm run build` | 통과 |

## 수동 검증 (필요 시)
불필요 — 순수 유닛 테스트 추가.

## 발견된 문제와 조치
- **원인 1**: 링크 팝오버에서 `javascript:` 스킴을 입력하고 제출 버튼을 클릭하는 테스트가 처음엔 실패했다 — happy-dom의 `<input type="url">`이 `checkValidity()`에서 이 값을 무효로 판정해 `submit` 이벤트 자체를 막고 있었다(`node`로 happy-dom을 직접 띄워 `checkValidity()`를 호출해 재현·확인). 실제 브라우저(WHATWG `type=url` 검증)는 `javascript:`도 통과시키므로, 이는 happy-dom 쪽이 더 엄격한 테스트 환경 함정이지 프로덕션 버그가 아니다.
  - **조치**: `fireEvent.click(제출버튼)` 대신 `fireEvent.submit(form)`으로 네이티브 제약 검증을 우회해, 이 앱 자신의 방어 로직(`isSafeLinkHref`)을 직접 테스트하도록 고쳤다.
  - **재검증 결과**: 통과.
- **원인 2**: 하이라이트 팔레트 테스트가 `[style*="background"]` 셀렉터로 스와치를 찾지 못해 실패했다 — `HIGHLIGHT_SWATCHES`가 쓰는 `color-mix(...)` 값을 happy-dom의 CSSOM이 인식하지 못해 React `style` prop 설정이 조용히 무시되고(`node`로 happy-dom CSSStyleDeclaration을 직접 확인), 결과적으로 `style` 속성 자체가 렌더링되지 않았다.
  - **조치**: 셀렉터를 스와치의 `aria-label`(예: "브랜드") 기반으로 바꿨다.
  - **재검증 결과**: 통과.
- **원인 3**: task.md에 "지우기 선택 시 색상/하이라이트 해제"를 수용 기준으로 적어놓고, 처음 구현에서 적용(apply) 테스트만 작성하고 해제(clear) 테스트를 빠뜨렸다 — 자체 검토 중 발견.
  - **조치**: 글자색·하이라이트 각각 "색상 지우기" 버튼 클릭 시 해제되는지 확인하는 테스트 2건을 추가로 작성했다.
  - **재검증 결과**: 통과(전체 27/27).

## 검증 중 새로 발견한 결정 사항
없음.

## 최종 판정
- [x] 수용 기준(`task.md`)을 모두 만족함 — PRD 갱신 가능
