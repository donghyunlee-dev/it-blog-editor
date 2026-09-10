# P2-8: 인용구·구분선·밑줄 서식과 "제목 3" 진입점 추가 — 결과

## 커밋
- `81c0aec` feat: 슬래시 메뉴에 제목3·인용구·구분선, 버블 툴바에 밑줄 추가 (P2-8)

## 변경 파일
- `src/components/editor/SlashCommandExtension.ts` — `ITEMS`에 세 항목 추가: "제목 3"(제목 2 뒤, `setNode("heading",{level:3})`), "인용구"(번호 목록 뒤, `toggleBlockquote()`), "구분선"(인용구 뒤, `setHorizontalRule()`). 각 항목 위에 왜 슬래시 메뉴인지(블록 레벨 토글/삽입 명령이라 버블 툴바가 아니다) 이유를 남겼다.
- `src/components/editor/SlashCommandExtension.test.ts` — 기본 항목 개수 10→13 갱신, "제목 3"/"인용구"/"구분선"의 커맨드 체인을 기존 `it.each` 표에 추가.
- `src/components/editor/RichTextEditor.tsx` — `EditorBubbleMenu`에 "밑줄" `ToggleButton`(`toggleUnderline()`, 표시 텍스트 "U")을 "취소선" 바로 뒤에 추가.
- `src/components/editor/RichTextEditor.test.tsx` — 버블 메뉴 노출 테스트에 "밑줄" 어서션 추가, 클릭 시 `.ProseMirror u` 마크가 적용되는 전용 테스트 추가.

## 자체 검토
- **긍정**: 새 확장·스키마 변경 없이 기존에 이미 켜져 있던 커맨드에 UI만 연결해 끝났다 — 회귀 위험이 매우 낮다(실제로 전체 테스트 641개가 기존 테스트 수정 없이, 개수 갱신 1건만 반영하고 전부 통과했다).
- **주의사항**: 원문 PRD 문구는 "인용구·구분선·밑줄 서식 버튼"이라고 세 개를 묶어 "버튼"으로 표현했지만, 실제로는 인용구·구분선을 슬래시 메뉴로, 밑줄만 버블 툴바 버튼으로 넣었다 — task.md에 그 판단 근거(기존 코드가 이미 확립한 "버블 툴바=인라인 마크 전용, 슬래시 메뉴=블록 명령 전용" 두 그룹, 그리고 구분선은 애초에 "선택 텍스트에 씌운다"는 개념 자체가 성립하지 않는 삽입형 명령이라는 점)를 명시적으로 남겼다.
- **우려사항**: AX Auth 로그인 제약으로 이 세션에서는 실제 브라우저로 네 항목이 실제 문서 편집 중 자연스럽게 발견·사용되는지는 확인하지 못했다(PRD의 기존 항목들과 동일한 한계). 자동화 테스트(커맨드 체인 호출 순서, 클릭 후 DOM 마크 반영)로만 검증했다.

## 산출물
- `docs/superpowers/tasks/P2-8-slash-menu-additions/{task,plan,result,test}.md`
