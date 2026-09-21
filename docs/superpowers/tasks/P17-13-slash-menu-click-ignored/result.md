# P17-13: 슬래시 메뉴 항목을 클릭해도 반응이 없는 문제 — 구현 결과 보고서

## 구현 내용
- `SlashCommandExtension.ts`의 `createSlashMenuRenderer` → `renderItems()`가 만드는
  각 메뉴 버튼에 `mousedown` 리스너를 추가해 `event.preventDefault()`를 호출한다.
  기존 `click` 리스너(`item.run(currentEditor, currentRange)`)는 그대로 둔다.
- 표 툴바 버튼(P17-12)과 동일한 패턴 — `mousedown`의 기본 동작(포커스 이동에 따른
  에디터 선택 변경)을 막아, 그 선택 변경이 `selectionchange`를 거쳐 `@tiptap/suggestion`
  플러그인 상태를 비활성화(`onExit` → 메뉴 DOM 제거)시키는 연쇄를 끊는다.

## 파일 변경 내역
| 파일 | 변경 사항 |
|------|---------|
| `src/components/editor/SlashCommandExtension.ts` | 메뉴 버튼에 `mousedown` → `preventDefault` 리스너 추가 |
| `src/components/editor/SlashCommandExtension.test.ts` | 회귀 테스트 추가 — 각 버튼의 `mousedown`이 `preventDefault`되는지 확인 |
| `docs/product/prd.md` | P17-13 항목 추가 및 완료 표시 |

## 커밋 내역
| SHA | 메시지 |
|-----|--------|
| (커밋 예정 — 아래 산출물 참고) | fix: 슬래시 메뉴 항목 클릭이 무시되던 문제 수정 (P17-13) |

## 자체 검토 (Self-Review)
### 긍정 사항
- 이 코드베이스에 이미 확립된 표준 패턴(P17-12)을 그대로 재사용해, 근본 원인이
  같은 클래스의 버그를 일관된 방식으로 고쳤다. 공용 렌더러(`createSlashMenuRenderer`)
  한 곳만 고쳐 슬래시 메뉴의 모든 항목(기본 13개 + 이미지·문서 링크 동적 2개)에
  동시에 적용된다.
- 기존 33개(신규 1개 포함) 테스트가 모두 통과해 키보드 탐색(Arrow/Enter)·ARIA·
  onExit 등 기존 동작에 회귀가 없음을 확인했다.

### 주의사항
- P17-12 때와 동일한 한계 — 이 세션의 jsdom 테스트 환경과 Browser pane 둘 다
  브라우저 고유의 "mousedown 시 에디터 선택 되돌림/포커스 이동" 동작 자체를
  재현하지 않는다. 게다가 이번 세션은 앱이 MS 계정 로그인 뒤에 있어(로컬
  dev-login 우회가 코드에 구현돼 있지 않음) 실제 화면에서 재현·재확인을 하지
  못했다 — 사용자의 실제 브라우저 재확인이 필요하다.
- 원인 분석은 `@tiptap/suggestion@3.30.2`의 실제 소스(`node_modules/@tiptap/suggestion/dist/index.js`)를
  직접 읽고 상태 전이(`apply()`)와 `dismissOnOutsideClick`의 `pointerdown` 처리를
  추적해 도출했다(단순 추측이 아님) — `element.contains(target)`이 참일 때는
  outside-click 처리를 건너뛰므로 그 경로가 아니라, `selectionchange` → 플러그인
  `apply()`의 `next.active=false` 경로가 원인임을 코드로 확인했다.

### 우려사항
- 없음 — `preventDefault()`는 `mousedown`에만 적용되고 `click` 이벤트 발생 자체를
  막지 않으므로, 버튼의 기존 클릭 동작(`item.run`)에는 영향이 없다.
