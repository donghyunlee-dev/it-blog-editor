# P18-2: 이미지/문서 링크 카드 크기 조절 — 검증 기록

## 자동화 테스트

```bash
npx vitest run src/components/editor/RichTextEditor.test.tsx
```

결과: **84 passed (84)** — 기존 76개 + 이번에 추가한 8개(`clampResizeWidth` 4개,
저장된 width/height 반영 4개) 모두 통과.

```bash
npx eslint src/components/editor/RichTextEditor.tsx src/components/editor/RichTextEditor.test.tsx
```

결과: 에러/경고 없음(`globals.css`는 이 프로젝트의 ESLint 설정 대상이 아니라는
안내 경고만 있고 기존과 동일).

```bash
npm run build
```

결과: 성공(`Compiled successfully`, TypeScript/정적 페이지 생성 모두 통과).

## Browser pane 수동 검증

plan.md의 Global Constraints에 명시했듯, 드래그의 계산 로직(clamp, 종횡비)은
위 단위 테스트로, 실제 드래그 인터랙션 자체는 Browser pane에서 시각적으로
확인했다(P1-7b 표 크기 조절 핸들 검증과 동일한 접근).

임시 디버그 페이지(`src/app/dev-preview-table-toolbar/page.tsx`, `/editor/**`
바깥이라 AX 인증 우회, 검증 후 삭제)에 이미지 1개 + 문서 링크 카드 1개를 렌더링해
확인했다.

1. **이미지 축소**: 핸들을 왼쪽으로 80px 드래그 → `width: 520px; height: 260px;`
   로 정확히 반영(원본 600×300에서 종횡비 그대로 유지, 600-80=520,
   300×(520/600)=260). onMouseUp 이후에만 스타일이 바뀜(드래그 중간엔 로컬
   미리보기 state만 바뀌고 노드 attrs는 그대로임을 코드로 확인).
2. **문서 링크 카드 축소**: 핸들을 왼쪽으로 118px 드래그 → `width: 602px;
   max-width: 100%;`로 반영(원본 720px에서 720-118=602, 높이는 스타일에 없음 —
   내용 기준 자동 유지 확인).
3. **최소 너비 clamp**: 이미지를 최소 너비보다 훨씬 왼쪽까지 드래그 →
   `width: 100px; height: 50px;`에서 멈춤(더 줄어들지 않음, `RESIZE_MIN_WIDTH`
   그대로 반영, 종횡비도 유지).
4. **최대 너비 clamp**: 이미지를 편집기 폭보다 훨씬 오른쪽까지 드래그 →
   `width: 720px`(부모 컨테이너 실측 폭)에서 멈춤, 그 이상 커지지 않음 확인.
5. **하위 호환**: 두 테스트 모두 크기를 조절하기 전엔 인라인 스타일이 전혀
   없었고(이미지는 Preflight 100%, 카드는 CSS `width: 100%`), 조절 후에만
   스타일이 생김 — 기존 문서에 영향 없음을 확인.

## 발견 → 조치 → 재검증

**발견**: 이미지 리사이즈 핸들을 드래그(오른쪽 방향)하자 `updateAttributes`가
호출되지 않고 대신 이미지 노드가 그대로 복제되는 버그를 실사용 검증 중 발견했다.
문서 링크 카드 핸들에서는 재현되지 않았다.

**원인**: result.md에 기록한 대로, `@tiptap/extension-image`의 기본
`draggable: true` 스펙 때문에 ProseMirror가 핸들 위에서 벌어진 mousedown조차
"노드 드래그 시작"으로 해석해 우리 리사이즈 로직보다 먼저 개입했다.

**조치**: `AttachmentImage` 확장에 `draggable: false`를 명시적으로 추가.

**재검증**: 같은 디버그 페이지에서 이미지 핸들을 좌→우, 우→좌로 총 3회
반복 드래그(축소 1회, 최소 clamp 1회, 최대 clamp 1회) — 매번 정확히 이미지
1개만 유지되고(`find("너비 조절")`로 슬라이더 개수가 항상 2개 — 이미지 1 +
카드 1 — 임을 확인), 복제나 위치 이동 없이 너비/높이만 의도대로 바뀌었다.

## P18-2 후속 검증(PR 리뷰 중 — "사이즈 조절은 되는데 랜덤하게 또 보이네")

**발견**: 리사이즈 핸들을 드래그하면 크기는 바뀌지만 그 직후 `ImageBubbleMenu`
(캡션 입력·다시 업로드·삭제)가 원치 않게 뜨는 것을 사용자가 실사용 중 보고했다.

**진단 과정**: `window.getSelection()`/`.ProseMirror-selectednode` 클래스를
직접 찍어보며 단계적으로 격리했다.
1. 처음엔 ProseMirror의 클릭 감지가 원인이라 보고 NodeView `stopEvent`로
   막으려 했으나, `stopEvent` 호출 여부를 직접 계측(임시 로그)한 결과 **실제
   드래그 중 단 한 번도 호출되지 않음**을 확인 — 잘못된 가설이었다.
2. 디버그 문서가 이미지로 시작해 ProseMirror의 기본 초기 선택이 이미 이미지를
   가리키고 있던 착시였음을 발견 — 문단을 앞에 추가해 재현 조건을 현실적으로
   맞췄다.
3. 그제서야 `window.getSelection()`이 드래그 도중 이미 `.ProseMirror`를
   앵커로 하는 네이티브 `Range`를 갖고 있음을 확인 — 브라우저가 mousedown 이후
   mousemove 동안 `contentEditable=false`인 원자적 블록(이미지)을 기본 동작으로
   네이티브 선택해버리고, ProseMirror가 `selectionchange`를 통해 이를
   `NodeSelection`으로 그대로 반영한다는 진짜 원인을 찾았다.

**조치**: `useDragResize`의 `mousemove`/`mouseup` 핸들러 각각에
`preventDefault()`를 추가(기존엔 `mousedown`에만 있었다). 1차 가설로 추가했던
`stopEvent`/`isResizeHandleEvent` 관련 코드는 실제로 아무 역할이 없었음이
확인돼 제거했다.

**재검증**:
- 문단 → 이미지 → 문서 링크 카드 순서의 현실적인 문서에서 두 핸들 모두
  드래그 후 `.ProseMirror-selectednode`가 생기지 않음을 확인(수정 전에는 매번
  생겼다).
- 이미지를 직접 클릭했을 때 캡션 메뉴가 뜨는 기존 동작(P17-8)은
  `RichTextEditor.test.tsx`의 자동화 테스트로 계속 보장됨을 재확인
  (`npx vitest run` — 84 passed, 회귀 없음).
- `npx eslint`, `npm run build` 재실행 — 모두 클린.
