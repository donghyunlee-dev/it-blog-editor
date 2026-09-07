# P2-1a: 슬래시 메뉴 ARIA 보강

## 배경
- 2026-08-27 [프로덕션 준비도 감사](https://claude.ai/code/artifact/87302c07-68d6-42ed-8712-9345547cb659)에서 발견된 접근성 공백 중 하나로, Phase 4의 P2-1a 항목이다(`docs/product/prd.md`의 "P2 — 다듬기" 체크리스트).
- `SlashCommandExtension.ts`의 `createSlashMenuRenderer`가 만드는 슬래시 명령어 메뉴(`/`를 입력하면 뜨는 팝업)는 지금 순수 `<div>`+`<button>` 조합이라 스크린 리더에게 "이것이 선택 가능한 목록이고, 지금 몇 번째가 선택돼 있는지"를 전달할 방법이 없다. 실제 포커스는 계속 에디터의 contenteditable(`/`를 입력한 문서 본문)에 남아있고 메뉴는 DOM에는 있지만 포커스를 받지 않는 구조라, 표준 콤보박스/리스트박스 패턴(`role="listbox"`+`aria-activedescendant`)이 필요하다.

## 수용 기준 (Acceptance Criteria)
- [ ] 메뉴 컨테이너(`menuEl`)에 `role="listbox"`와 목록임을 설명하는 `aria-label`이 있다.
- [ ] 각 항목 버튼에 `role="option"`, 안정적인 `id`, 선택 여부를 반영하는 `aria-selected`(`true`/`false`)가 있다.
- [ ] 키보드(ArrowUp/ArrowDown)로 선택이 바뀌거나 목록이 갱신될 때마다 `aria-selected`가 다시 계산된다.
- [ ] 에디터의 contenteditable DOM(`editor.view.dom`)에 메뉴가 열려있는 동안 `aria-activedescendant`가 현재 선택된 option의 `id`를 가리키고, 메뉴가 닫히면(`onExit`) 제거된다 — 실제 포커스는 에디터에 남아있으므로 스크린 리더가 무엇이 선택됐는지 알려면 이 속성이 필요하다.
- [ ] "일치하는 항목이 없습니다" 빈 상태는 `aria-live="polite"`로 스크린 리더에 변경이 즉시 안내된다.
- [ ] 기존 마우스 클릭·키보드 순환 동작(`SlashCommandExtension.test.ts`의 기존 테스트)은 그대로 통과한다 — 이번 변경은 속성 추가일 뿐 동작을 바꾸지 않는다.

## 결정이 필요한 사항
없음 — ARIA 속성 추가는 표준 리스트박스 패턴을 그대로 따르는 구현 디테일이라 별도 GitHub Issue 없이 진행한다(P1-6a/b/c 등 이 프로젝트의 기존 "URL 라우팅/표준 준수는 직접 정한다" 판단 근거와 동일).

## 범위 밖
- 슬래시 메뉴 자체의 시각 디자인 변경(색상·간격 등)은 다루지 않는다 — ARIA 속성 추가만.
- 다른 팝업(공유 검색 `ShareForm`, 계정 검색 `/editor/accounts` 등)의 ARIA는 이번 범위가 아니다 — P2-1a는 슬래시 메뉴로 명시돼 있다.
- 실제 스크린 리더(NVDA/VoiceOver 등)로 음성 안내를 직접 들어보는 수동 검증은 AX Auth 로그인 제약과 스크린 리더 소프트웨어 접근 제약으로 이 세션에서는 하지 못한다 — DOM 속성값 자동화 테스트로 대신 검증한다.
