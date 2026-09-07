# P2-1b: 사이드바 리사이즈 핸들 키보드 조작

## 배경
- 2026-08-27 [프로덕션 준비도 감사](https://claude.ai/code/artifact/87302c07-68d6-42ed-8712-9345547cb659)에서 발견된 접근성 공백 중 하나로, Phase 4의 P2-1b 항목이다(`docs/product/prd.md`의 "P2 — 다듬기" 체크리스트).
- `EditorShell.tsx`의 사이드바 폭 조절 핸들(`role="separator" aria-orientation="vertical"`, 2026-08-26 P0 단계에서 추가)은 지금 `onMouseDown`(드래그)만 지원한다. `tabIndex`가 없어 키보드로는 아예 포커스를 받을 수 없고, 마우스가 아니면 사이드바 폭을 조절할 방법이 없다. WAI-ARIA APG의 "Window Splitter" 패턴(`role="separator"` + 포커스 가능 + 방향키 + `aria-valuenow`/`min`/`max`)을 따르지 않고 있다.

## 수용 기준 (Acceptance Criteria)
- [ ] 핸들이 `tabIndex={0}`으로 키보드 포커스를 받을 수 있다.
- [ ] 포커스된 상태에서 방향키(왼쪽/오른쪽 화살표)로 사이드바 폭이 일정 단위(step)만큼 줄고 늘어난다 — 기존 드래그와 같은 `MIN_WIDTH`(220)/`MAX_WIDTH`(440) 범위로 clamp된다.
- [ ] `Home`/`End` 키로 각각 최소/최대 폭으로 즉시 이동한다.
- [ ] 키보드 조작 결과도 드래그와 동일하게 `localStorage`(`WIDTH_STORAGE_KEY`)에 저장돼 새로고침 후에도 유지된다.
- [ ] 핸들에 `aria-valuenow`(현재 폭)·`aria-valuemin`(`MIN_WIDTH`)·`aria-valuemax`(`MAX_WIDTH`)가 있어 스크린 리더가 현재 값을 읽을 수 있다.
- [ ] 핸들이 키보드 포커스를 받으면(브랜드 컬러) 시각적으로 구분 가능한 포커스 표시가 있다 — 이 프로젝트가 이미 Button류에 쓰는 `--color-brand` 포커스 링과 톤을 맞춘다(`globals.css`의 `.rounded-btn:focus-visible` 선례).
- [ ] 사이드바가 접힌 상태(`collapsed`)에서는 핸들 자체가 렌더링되지 않으므로(기존 동작), 이 상태에서는 당연히 키보드 조작도 없다 — 별도 처리 불필요.
- [ ] 기존 마우스 드래그 동작(`startResize`/`handleMouseMove`/`handleMouseUp`)은 그대로 유지된다.

## 결정이 필요한 사항
- [ ] 방향키 한 번당 조절 폭(step)을 몇 px로 할지 — GitHub Issue 없이 직접 정한다: 마우스 드래그가 1px 단위로 촘촘히 움직이는 것과 달리 키보드는 이산적인 조작이라 한 번에 체감 가능한 변화가 필요하다. Shift+화살표 등 별도 modifier 없이 단일 값으로 16px을 쓴다(사이드바 폭 범위 220~440px = 220px 폭에서 약 14회 왕복이면 끝에서 끝까지 이동 가능한, 과하지 않은 값). ARIA "Window Splitter" 패턴 예제들이 흔히 쓰는 5%나 화면 크기 비례 같은 규칙은 이 사이드바처럼 절대 px로 관리되는 폭에는 맞지 않아 채택하지 않았다.

## 범위 밖
- 모바일 오프캔버스 드로어(포커스 트랩, P2-1c)는 이번 범위가 아니다.
- 실제 스크린 리더로 `aria-valuenow` 안내를 직접 들어보는 수동 검증은 AX Auth 로그인 제약으로 하지 못한다 — DOM 속성값·상태 변화 자동화 테스트로 검증한다.
