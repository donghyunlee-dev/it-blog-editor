# P17-5a: 코드 블록 Tab 들여쓰기 — 결과

## 커밋
- (커밋 후 기록 — 아래 "산출물" 참고)

## 변경 파일
- `src/components/editor/RichTextEditor.tsx` — `CodeBlockLowlight.configure()`에
  `enableTabIndentation: true`를 추가했다. `@tiptap/extension-code-block`이 이미
  구현해 둔 Tab(들여쓰기)/Shift-Tab(내어쓰기) 핸들러가 이 플래그 하나로 활성화된다.
  `tabSize`는 라이브러리 기본값(4칸)을 그대로 뒀다.
- `src/components/editor/RichTextEditor.test.tsx` — 코드 블록 안에서 Tab을 누르면
  공백 4칸이 삽입되는지, 코드 블록 밖(일반 문단)에서는 영향이 없는지 확인하는
  테스트 2개와, 이를 위한 `placeCursorAfter` 헬퍼(collapsed selection 배치)를
  추가했다.
- `docs/product/prd.md` — Phase 17 P17-5a 항목 완료 표시.

## 자체 검토
- **긍정**: 라이브러리가 이미 구현해 둔 기능을 옵션 하나로 켰을 뿐이라 리스크가
  거의 없다 — 새 로직을 직접 구현하지 않아 버그가 새로 생길 여지가 작다.
- **주의사항**: 테스트에서 코드 블록 텍스트에 커서를 두려 할 때, 문법 강조가
  `hljs-*` `<span>`별로 텍스트 노드를 여러 개로 쪼개 놓아 "const x = 1;" 전체를
  담은 단일 텍스트 노드가 없었다 — 마지막 글자(";")만으로 찾아 코드 끝에 커서를
  두는 방식으로 우회했다(실제 사용자 조작과는 무관한 테스트 헬퍼 제약).
- **우려사항**: 없음 — Shift-Tab(내어쓰기)은 별도 테스트를 추가하지 않았다(라이브러리
  기본 구현이고, Tab과 같은 옵션 플래그로 함께 켜지므로 Tab 테스트가 통과하면
  플래그 자체는 올바르게 켜진 것이 확인된다 — 과잉 테스트를 피했다).

## 산출물
- `docs/superpowers/tasks/P17-5a-codeblock-tab-indentation/{task,plan,result,test}.md`
- `src/components/editor/RichTextEditor.tsx`, `RichTextEditor.test.tsx`
- `docs/product/prd.md`
