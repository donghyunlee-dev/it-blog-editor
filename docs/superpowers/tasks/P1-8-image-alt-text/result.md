# P1-8: 삽입된 이미지에 대체 텍스트(alt) 입력 UI 추가 — 구현 결과 보고서

## 구현 내용
- 이미지를 선택(클릭)하면 그 이미지 전용 버블 메뉴(`ImageBubbleMenu`)가 이미지 아래에 뜬다. 안에는 alt 텍스트 입력창(`ImageAltPopoverForm`)이 있어 값을 적고 "적용"을 누르면 `editor.chain().focus().updateAttributes("image", { alt }).run()`으로 선택된 이미지 노드의 `alt` 속성을 갱신한다. 빈 값 제출은 `alt: null`로 지워, alt는 항상 선택 사항으로 남는다.
- 이미지가 선택된 동안은 기존 텍스트 서식 버블 메뉴(`EditorBubbleMenu`, 굵게/기울임/색상/하이라이트/링크)가 뜨지 않도록 나눴다. `shouldShow`를 직접 오버라이드하는 대신 `useEditorState`로 `editor.isActive("image")`를 구독해 두 컴포넌트를 상호 배타적으로 조건부 렌더링(마운트/언마운트)했다 — `@tiptap/extension-bubble-menu`의 기본 `shouldShow`를 통째로 대체하면 그 안에 포함된 `isChildOfMenu` 로직(포커스가 메뉴 내부, 예: 기존 링크 팝오버 입력창으로 옮겨가도 메뉴를 유지)까지 함께 사라져 기존 링크 편집 UX가 깨진다는 것을 `node_modules/@tiptap/extension-bubble-menu/dist/index.js` 소스로 직접 확인하고 그 방식을 피했다.
- `tiptap-to-storage.ts`의 이미지 직렬화(`case "image"`, 첨부파일 참조·외부 URL 참조 두 경로 모두)에 `alt` 속성이 있으면 `ac:alt="..."`를 `<ac:image>` 태그에 포함하도록 추가했다. Confluence storage format에서 `ac:image`가 대체 텍스트를 `ac:alt` 속성으로 직접 받는다는 것을 Atlassian 공식 문서([Confluence Storage Format](https://confluence.atlassian.com/doc/confluence-storage-format-790796544.html))로 확인했다(별도 `ac:parameter` 구조가 아님). 값이 없으면 기존과 동일하게 속성 자체를 넣지 않는다.
- alt 입력창에는 `maxLength={300}`의 가벼운 클라이언트 가드만 뒀다(서버 검증은 범위 밖 — task.md 참고).

## 파일 변경 내역
| 파일 | 변경 사항 |
|------|---------|
| `src/components/editor/RichTextEditor.tsx` | `ImageAltPopoverForm`/`ImageBubbleMenu` 컴포넌트 추가, `EditorBubbleMenu`를 `useEditorState`로 이미지 선택 시 숨기도록 수정, `<ImageBubbleMenu editor={editor} />` 렌더링 추가 |
| `src/lib/editor/tiptap-to-storage.ts` | `case "image"` 직렬화에 `ac:alt` 속성 추가(첨부파일/외부 URL 두 경로 모두) |
| `src/lib/editor/tiptap-to-storage.test.ts` | alt 있음/없음/특수문자, 첨부파일/외부 URL 조합 테스트 4건 추가 |
| `src/components/editor/RichTextEditor.test.tsx` | 이미지 선택 시 alt UI 노출·서식 메뉴 배제, 기존 alt 초기값, 적용 후 노드 속성·`<img alt>` 반영을 확인하는 테스트 4건 추가 |
| `docs/product/prd.md` | P1-8 체크리스트 완료 표시 |

## 커밋 내역
| SHA | 메시지 |
|-----|--------|
| `248e2d1` | feat: 이미지 대체 텍스트(alt) 입력 UI 추가 (P1-8) |

## 자체 검토 (Self-Review)
### 긍정 사항
- `shouldShow` 오버라이드가 기존 링크 편집 UX를 깨뜨릴 뻔한 위험을 구현 전에 소스 확인으로 걸러내고, 더 단순하고 안전한 조건부 렌더링 방식으로 바꿨다.
- Confluence storage format의 `ac:alt` 속성명을 추측하지 않고 공식 문서로 확인했다.
- 자동화 테스트가 "이미지를 실제로 클릭해 선택"하는 상황을 `tableFirstDoc`과 동일한 원리(문서 첫 노드가 원자 노드면 `Selection.atStart`가 그 노드를 NodeSelection으로 선택)로 재현해, DOM `<img alt>` 결과와 `onChange`로 전달되는 TipTap JSON 양쪽을 모두 검증했다.

### 주의사항
- alt 입력 UI는 "이미지를 클릭해 선택했을 때"만 뜬다 — 이미지를 넣자마자 바로 뜨는 것은 아니므로, 사용자가 이 UI의 존재를 스스로 찾아야 한다(온보딩·툴팁 안내는 범위 밖).
- `updateAttributes`는 현재 선택이 정확히 그 이미지 노드의 NodeSelection일 때만 의미가 있다 — 여러 이미지를 연속으로 빠르게 클릭하는 동안 값을 미처 적용하지 못하고 다른 이미지로 넘어가면 입력 중이던 값은 버려진다(폼이 언마운트되므로). 기존 `LinkPopoverForm`도 동일한 특성을 갖고 있어 이 프로젝트의 기존 관례를 그대로 따른 것이다.

### 우려사항
- AX Auth 로그인 제약으로 이 세션에서 실제 화면에 직접 로그인해 클릭 상호작용을 눈으로 확인하지는 못했다(P1-7a/b/c/d와 동일한 제약, `test.md` 참고). 자동화 테스트가 DOM 결과(`<img alt>`)까지 검증하므로 신뢰도는 있으나, 버블 메뉴의 실제 위치·겹침 등 시각적 요소는 미확인이다.
- 공개 뷰어(Tech Blog)가 `ac:alt`를 실제로 어떻게 렌더링하는지는 이 저장소 밖 관심사라 확인하지 않았다(task.md에 범위 밖으로 명시).
