# P2-5: 표 안 텍스트 서식(색상·폰트) 격차 조사

## 배경
- 사용자가 실사용 중 발견한 공백 두 가지 중 하나(2026-09-09 보고): "표 안 텍스트의 색상이나 폰트 서식을 바꾸는 방법이 없다."
- 착수 전 코드 조사가 필요했다 — 문서 전체에는 이미 `@tiptap/extension-text-style`+`Color`(글자색), `@tiptap/extension-highlight`(하이라이트)가 `EditorBubbleMenu`(텍스트 선택 시 뜨는 버블 메뉴, `src/components/editor/RichTextEditor.tsx`)로 구현돼 있다. 두 갈래 가능성이 있었다: ① 이 서식 UI가 표 셀 안에서는 안 뜨는 버그이거나, ② 애초에 문서 전체에 "폰트(글꼴 종류·크기)" 서식 자체가 없어 표와 무관한 더 큰 공백이거나.
- 관련 PRD 체크리스트: `docs/product/prd.md`의 "P2 — 다듬기", P2-5. 표 삭제 버튼(P2-4)과는 별개 항목이다.

## 조사 결과
- **`EditorBubbleMenu`의 기본 `shouldShow`(`@tiptap/extension-bubble-menu`의 기본 구현, `node_modules/@tiptap/extension-bubble-menu/dist/index.cjs` 확인)는 표 셀 여부를 전혀 구분하지 않는다** — `view.hasFocus()`, 선택이 비어있지 않은지, 빈 텍스트 블록이 아닌지, `editor.isEditable`만 검사한다. 표 셀 안에서 텍스트를 선택하는 것도 일반 `TextSelection`이라(다중 셀을 가로질러 선택할 때만 `CellSelection`이 됨) 이 조건을 그대로 통과한다.
- 자동화 테스트(`selectText` 헬퍼로 표 셀 안 텍스트를 선택)로 실측한 결과, **표 셀 안에서도 서식 버블 메뉴(굵게/기울임/취소선/글자색/하이라이트/링크)가 정상적으로 뜬다** — 버그가 아니다.
- 다만 **글꼴 종류(font-family)·글자 크기(font-size)를 바꾸는 기능 자체가 문서 전체 어디에도 없다** — `package.json`을 확인한 결과 `FontFamily`/`FontSize` 확장이 설치돼 있지 않다. 즉 표 한정 문제가 아니라 문서 전체에 걸친 기능 격차다.
- 문서 전체 기능이고 값(글꼴 목록·크기 단계)이 정해지지 않아 [Issue #69](https://github.com/sfood-pioneer-1st/sfood-it-editor/issues/69)로 등록했다.

## 수용 기준 (Acceptance Criteria)
- [x] 표 셀 안 텍스트를 선택하면 서식 버블 메뉴가 뜨고 글자 색상 버튼이 노출됨을 검증하는 자동화 테스트를 `RichTextEditor.test.tsx`에 추가한다(회귀 방지 — 향후 표 관련 리팩터가 이 동작을 조용히 깨뜨리지 않도록 고정).
- [x] 조사 결과(색상/하이라이트는 이미 동작함, 폰트는 문서 전체 미구현)를 PRD·`result.md`에 명시한다.
- [x] 폰트(글꼴·크기) 서식 추가는 [Issue #69](https://github.com/sfood-pioneer-1st/sfood-it-editor/issues/69) 답변 전까지 구현하지 않는다 — 답변 결과 추가하지 않는 것으로 최종 결정됐다(아래 참고).

## 결정이 필요한 사항
- [x] 문서 전체(표 포함)에 글꼴 종류·글자 크기 서식을 추가할지 — Issue: [#69](https://github.com/sfood-pioneer-1st/sfood-it-editor/issues/69). **2026-09-09 답변**: "글꼴을 빼고 서식(볼드, 이테리, 취소선 등)만 구현" — 글꼴 종류(font-family)·글자 크기(font-size) 둘 다 추가하지 않고, 기존 서식(굵게/기울임/취소선·글자색·하이라이트)만 유지하는 것으로 최종 결정됐다. 추가 구현 없음.

## 범위 밖
- 폰트(글꼴·크기) 서식은 [Issue #69](https://github.com/sfood-pioneer-1st/sfood-it-editor/issues/69) 답변으로 추가하지 않는 것이 확정됐다 — 앞으로도 이 프로젝트 범위 밖이다(필요성이 다시 제기되면 그때 별도로 논의한다).
- 표 삭제 기능은 별도 항목(P2-4)에서 이미 다뤘다.
