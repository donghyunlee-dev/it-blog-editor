# P2-1b: 사이드바 리사이즈 핸들 키보드 조작 — 구현 결과 보고서

## 구현 내용
- `EditorShell.tsx`의 사이드바 폭 조절 핸들(`role="separator"`)이 마우스 드래그(`onMouseDown`)만
  지원하던 것에, `tabIndex={0}` + `onKeyDown`(방향키/Home/End)을 추가해 키보드로도 조작할 수
  있게 했다.
  - `ArrowLeft`/`ArrowRight`: `WIDTH_STEP`(16px)만큼 줄이고 늘린다.
  - `Home`/`End`: 각각 `MIN_WIDTH`(220)/`MAX_WIDTH`(440)로 즉시 이동한다.
  - 모든 경로가 기존 `clampWidth()`를 그대로 거쳐 드래그와 동일한 범위를 공유하고, 마우스
    드래그가 끝날 때(`handleMouseUp`)와 마찬가지로 `persistWidth()`로 `localStorage`에 즉시
    저장한다(드래그는 마우스를 뗄 때 한 번 저장하지만, 키보드는 누를 때마다 바로 저장 —
    "누른 채로 있다가 저장" 개념 자체가 없어 굳이 흉내 내지 않았다).
  - 핸들에 `aria-valuenow`(현재 폭)·`aria-valuemin`/`aria-valuemax`를 추가해 스크린 리더가
    현재 값을 읽을 수 있게 했다(WAI-ARIA APG "Window Splitter" 패턴).
  - 키보드 포커스 시각 표시는 `globals.css`의 `.rounded-btn:focus-visible`과 톤을 맞춘
    `.sidebar-resize-handle:focus-visible` 규칙을 새로 추가해 적용했다(브랜드 컬러 아웃라인).
- 기존 마우스 드래그 로직(`startResize`/`handleMouseMove`/`handleMouseUp`)은 전혀 바꾸지 않았다.

## 파일 변경 내역
| 파일 | 변경 사항 |
|------|---------|
| `src/components/editor/EditorShell.tsx` | 핸들 키보드 조작(`handleHandleKeyDown`), `aria-valuenow`/`min`/`max`, `tabIndex` 추가 |
| `src/components/editor/EditorShell.test.tsx` | 키보드 조작·저장 검증 테스트 4건 추가 |
| `src/app/globals.css` | `.sidebar-resize-handle:focus-visible` 브랜드 포커스 링 규칙 추가 |
| `docs/superpowers/tasks/P2-1b-sidebar-resize-keyboard/{task,plan,result,test}.md` | 신규 |
| `docs/product/prd.md` | P2-1b 완료 표시 |

## 커밋 내역
| SHA | 메시지 |
|-----|--------|
| (PR에서 확인) | feat: 사이드바 리사이즈 핸들에 키보드 조작 추가 (P2-1b) |

## 자체 검토 (Self-Review)
### 긍정 사항
- 방향키·Home/End 모두 `clampWidth()`를 거치게 해, 키보드로 반복해서 범위를 벗어나려
  시도해도(`End` 이후 `ArrowRight`) 440을 넘지 않음을 테스트로 확인했다.
- 폭이 `localStorage`에 저장돼 컴포넌트를 언마운트·재마운트해도(새로고침을 흉내) 유지됨을
  테스트로 확인했다 — 마우스 드래그가 이미 갖고 있던 "개인 설정 유지" 보장을 키보드 경로도
  똑같이 지킨다.
- 새 포커스 링 규칙을 기존 `.rounded-btn:focus-visible`과 별개의 클래스(`.sidebar-resize-handle`)
  로 분리했다 — 핸들이 `rounded-btn`을 그대로 쓰면 그 클래스가 강제하는 `cursor: pointer`가
  이미 있는 `cursor-col-resize`와 충돌할 수 있어(같은 특이도의 클래스 두 개가 다른 cursor 값을
  주면 스타일시트 순서에 좌우됨) 피했다.

### 주의사항
- 실제 스크린 리더로 `aria-valuenow` 변경이 읽히는지 직접 들어보는 수동 검증은 AX Auth
  로그인 제약으로 이번에도 하지 못했다(P1-7 시리즈·P2-1a와 동일한 제약, `test.md` 참고) —
  jsdom 기반 자동화 테스트로 속성값과 동작을 검증했다.
- `WIDTH_STEP`(16px)은 GitHub Issue 없이 직접 정한 값이다(`task.md`의 "결정이 필요한 사항"
  참고) — 실사용 피드백으로 나중에 조정될 수 있다.

### 우려사항
- 없음.

## 후속 수정(2026-09-07, 머지 후 실사용 QA)
사용자가 실제 Edge 브라우저로 확인하던 중, 핸들이 키보드 포커스를 받으면 포커스 테두리가
`DocumentEditor.tsx`의 sticky 헤더(같은 `z-10`, DOM상 더 뒤라 페인트 순서에서 이김)에 가려
헤더 높이만큼 끊겨 보이는 문제를 발견해 보고했다. 핸들의 `z-index`를 `z-20`으로 올려 고쳤다
(`docs/superpowers/tasks/P2-1b-sidebar-resize-keyboard/test.md`의 "발견된 문제와 조치" 참고).
