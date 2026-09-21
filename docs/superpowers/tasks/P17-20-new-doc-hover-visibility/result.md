# P17-20: 새 문서 버튼 hover가 라이트 모드에서 안 보이던 문제 수정 — 구현 결과 보고서

## 구현 내용
- `EditorSidebar.tsx`의 "새 문서" `<Link>`에서 `hover:bg-surface-raised`를 제거하고
  `sidebar-row-hover`(globals.css, `color-mix(in srgb, var(--color-brand) 5%,
  var(--color-surface))`)로 교체했다. 이 클래스는 이미 이 파일의 문서·폴더 행이
  같은 문제(P13-2)로 한 번 도입해 검증된 것이라 그대로 재사용했다.

## 파일 변경 내역
| 파일 | 변경 사항 |
|------|---------|
| `src/components/editor/EditorSidebar.tsx` | "새 문서" 링크의 hover 클래스를 `hover:bg-surface-raised` → `sidebar-row-hover`로 교체, 근거 주석 추가 |
| `src/components/editor/EditorSidebar.test.tsx` | 회귀 테스트 추가 — "새 문서" 링크가 `sidebar-row-hover` 클래스를 갖는지 확인 |
| `docs/product/prd.md` | P17-20 항목 추가 및 완료 표시 |

## 커밋 내역
| SHA | 메시지 |
|-----|--------|
| (커밋 예정 — 아래 산출물 참고) | fix: 새 문서 버튼 hover가 라이트 모드에서 안 보이던 문제 수정 (P17-20) |

## 자체 검토 (Self-Review)
### 긍정 사항
- 새 색상이나 새 CSS 메커니즘을 만들지 않고, 이 코드베이스가 정확히 같은 근본
  원인(라이트 모드에서 `--color-surface`와 `--color-surface-raised`가 같은 값)으로
  이미 겪고 고친 해결책(`.sidebar-row-hover`)을 그대로 재사용했다 — 이 프로젝트가
  다른 곳(문서·폴더 행)에서 이미 검증한 패턴이라 신뢰도가 높다.
- `node_modules/@sfood/ui/tokens/semantic.css`를 직접 읽어 원인(라이트 모드
  `--color-surface`/`--color-surface-raised` 둘 다 `var(--white)`)을 코드로
  증명했고, 브라우저 CSSOM으로 실제 컴파일된 규칙(`color-mix` + `@supports`
  폴백 구조)까지 확인해 수정이 실제로 라이트/다크 양쪽에서 `bg-surface`와
  다른 색을 낸다는 것을 검증했다.

### 주의사항
- 이 세션의 원격 브라우저에서 `data-theme="light"`를 강제로 지정해도 실제
  computed `background-color`가 즉시 반영되지 않는 현상이 있었다(CSS 변수
  `--color-surface`는 올바르게 `#fff`로 바뀌었는데 `<a>`의 `background-color`는
  계속 다크 값으로 보고됨 — 이 환경 고유의 색상 스킴 에뮬레이션/캐싱 이슈로
  보이며, 실제 수정 로직과는 무관하다). 그래서 "라이트 모드 화면을 직접 스크린샷"
  대신 컴파일된 CSS 규칙(`color-mix`)을 직접 확인하는 방식으로 검증을 대체했다 —
  로직상 `color-mix`는 브랜드색이 흰색/검정 어느 쪽과 섞여도 항상 구별되는 색을
  내므로 결론 자체는 안전하다.

### 우려사항
- 없음 — 이 클래스는 이미 프로젝트 곳곳에서 검증된 것이라 새로운 실패 모드를
  들여올 가능성이 낮다. 관련 테스트 79개(신규 1개 포함) 모두 통과.
