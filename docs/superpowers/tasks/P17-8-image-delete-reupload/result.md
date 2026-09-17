# P17-8: 이미지 노드 삭제/재업로드 버튼 — 결과

## 커밋
- (커밋 예정 — 아래 "산출물" 참고)

## 변경 파일
- `src/components/editor/RichTextEditor.tsx`
  - `NOT_SAVED_IMAGE_REUPLOAD_MESSAGE` 상수 추가.
  - `revertUploadPlaceholder(view, uploadId, previousAttrs)` 헬퍼 추가 — 재업로드
    실패 시 시작 전 attrs로 복원한다(`removeUploadPlaceholder`는 노드를 지우므로
    재업로드 실패에 쓰면 기존 이미지가 사라져 부적절).
  - `ImagePageIdContext`(React Context) 추가 — `RichTextEditor`의 최상위 반환을
    `<ImagePageIdContext.Provider value={pageId}>`로 감싸, NodeView/BubbleMenu로
    별도 렌더링되는 `ImageBubbleMenu`가 `pageId`를 받게 한다.
  - `ImageBubbleMenu`에 "다시 업로드"(`ImageReuploadIcon`)/"이미지 삭제"
    (`TrashIcon` 재사용) 버튼 추가:
    - 삭제: `editor.chain().focus().deleteSelection().run()` — 확인 Modal 없이
      즉시 실행(task.md 결정 참고).
    - 재업로드: `pageId` 없으면 안내 토스트만. 있으면 파일 선택 → 선택한 파일로
      같은 이미지 노드를 `updateAttributes({ uploading: true, uploadId,
      filename })`로 업로드 중 상태로 바꾼 뒤(P17-9 자리표시자 패턴 재사용) 업로드,
      성공 시 `resolveUploadPlaceholder`로 교체, 실패 시 `revertUploadPlaceholder`
      로 원래 이미지 복원 + 에러 토스트.
    - 두 버튼 모두 `onMouseDown={(e) => e.preventDefault()}` — P17-12에서 확인된
      "툴바 버튼이 비편집 영역에 있으면 mousedown이 에디터 선택을 흩트릴 수 있다"
      는 패턴을 여기서도 예방적으로 막는다.
- `src/components/editor/RichTextEditor.test.tsx`
  - "RichTextEditor 이미지 삭제/다시 업로드(P17-8)" describe 블록 추가(5개
    테스트): 버블 메뉴에 두 버튼 표시, 삭제 시 노드 제거, pageId 없을 때 안내
    토스트만, 재업로드 성공 시 이미지 교체, 재업로드 실패 시 원래 이미지 복원 +
    에러 토스트.
- `docs/product/prd.md` — P17-8 항목 완료 표시, 진행률 갱신.

## 자체 검토
- **긍정**: 새 노드뷰나 새 UI 위치를 만들지 않고 이미 사용자가 "이미지를 클릭하면
  뜨는 메뉴"로 학습해 둔 기존 alt 입력 버블 메뉴에 자연스럽게 붙였다. 재업로드는
  P17-9에서 이미 검증된 자리표시자 패턴을 그대로 재사용해(같은 스피너 UX) 새로운
  로딩 상태 UI를 또 만들지 않았다. 실패 시 원래 이미지로 복원하는 로직
  (`revertUploadPlaceholder`)은 재업로드 실패로 사용자의 기존 이미지가 사라지는
  사고를 막는다 — 이 부분은 특히 신경 써서 테스트로 고정했다.
- **주의사항**: `ImageBubbleMenu`(alt 텍스트 입력 포함)는 이번 작업 전까지 이
  프로젝트에 테스트가 전혀 없었다 — `@tiptap/extension-bubble-menu`의 기본
  `shouldShow`가 `view.hasFocus()`를 요구하는데(node_modules 확인), jsdom/
  happy-dom은 편집 불가 NodeView(이미지)를 클릭해도 실제 브라우저처럼 가장 가까운
  편집 가능 조상으로 포커스를 자동으로 옮기지 않아, 이미지를 클릭하기 전에
  `.ProseMirror`를 명시적으로 focus해야 버블 메뉴가 jsdom에서도 뜬다는 것을
  이번에 처음 발견해 테스트 헬퍼(`selectImage`)에 반영했다 — 앞으로 이미지 버블
  메뉴 관련 테스트를 추가할 때 참고할 수 있게 plan.md/result.md에 남겼다.
- **우려사항**: 삭제에 확인 Modal을 두지 않기로 한 결정은 P17-7의 "파괴성이 크지
  않은 블록 단위 삭제는 즉시 실행"이라는 선례에서 직접 도출했다 — 사용자가 다시
  확인이 필요하다고 판단하면 후속 요청으로 처리한다.

## P17-8 후속 버그 수정(같은 PR, 사용자 실사용 확인 후 리포트)
사용자 지적: "이미지 캡션 저장은 누를때마다 랜덤하게 컴포넌트가 나오고"(→ 정확히는
"이미지를 선택해도 alt 입력/삭제/재업로드 버블 메뉴가 뜰 때도 있고 안 뜰 때도
있다"는 뜻으로 확인).

- **재현**: Browser pane에서 이미지를 선택 → 바깥 클릭으로 선택 해제 → 다시 이미지
  선택을 반복했더니, 같은 동작인데도 버블 메뉴가 뜨는 경우와 안 뜨는 경우가 섞여
  나왔다(둘 다 `ProseMirror-selectednode` 클래스로 확인한 결과 이미지 자체는
  정상적으로 선택돼 있었음에도).
- **원인**: `@tiptap/extension-bubble-menu`(node_modules 확인)의 기본
  `updateDelay`가 250ms다 — 선택 변화를 250ms만큼 디바운스한 뒤에야 버블 메뉴를
  다시 계산한다. "선택 해제 → 곧바로 재선택"처럼 250ms 안에 선택이 여러 번 바뀌면
  디바운스 타이머들이 서로 경합해 최종적으로 "보여야 한다"는 계산 결과가 매번
  일관되게 적용되지 않았다.
- **조치**: `ImageBubbleMenu`의 `<BubbleMenu>`에 `updateDelay={0}`을 추가해 디바운스
  자체를 껐다 — 선택이 바뀔 때마다 즉시 다시 계산한다. 같은 근본 원인이 텍스트
  서식 버블 메뉴(`EditorBubbleMenu`)에도 있어 그쪽도 함께 고쳤다(다른 PR —
  `feat/hyperlink-open-on-click`, P18-1 — 에서 함께 다룬다. 이 PR은 이미지 관련
  버블 메뉴만 수정한다).
- **재검증**: Browser pane에서 "바깥 클릭 → 이미지 클릭"을 5회 연속 반복해 매번
  버블 메뉴가 정상적으로 뜸을 확인했다(수정 전에는 같은 반복에서 재현됨).

## 산출물
- `docs/superpowers/tasks/P17-8-image-delete-reupload/{task,plan,result,test}.md`
- `src/components/editor/RichTextEditor.tsx`, `RichTextEditor.test.tsx`
- `docs/product/prd.md`
