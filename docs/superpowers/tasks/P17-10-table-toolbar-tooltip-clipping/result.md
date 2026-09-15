# P17-10: 표 툴바 툴팁 클리핑 수정 — 결과

## 커밋
- (커밋 후 기록 — 아래 "산출물" 참고)

## 변경 파일
- `src/components/editor/RichTextEditor.tsx` — `TableToolbarButton`의
  `<Tooltip content={label}>`에 `side="bottom"`을 추가했다. 원인 주석을 함께 남겼다
  (`sticky top-14` 툴바가 `EditorShell`의 `overflow-y-auto` 스크롤 컨테이너 맨 위에
  붙으면, 기본값 `side="top"` 툴팁이 그 경계 밖으로 그려지려다 잘려서 얇은 흰 띠만
  보였다 — P14-3과 같은 클리핑 원인).
- `src/components/editor/RichTextEditor.test.tsx` — 표 툴바 버튼 3개(대표로 "행
  추가(위)"·"행 삭제"·"표 삭제")에 마우스를 올렸을 때 뜨는 툴팁이 `side="bottom"`
  (버튼 아래)에 해당하는 CSS 클래스를 갖는지 확인하는 테스트를 추가했다.
- `docs/product/prd.md` — Phase 17에 P17-10 항목 추가 및 완료 표시.

## 자체 검토
- **긍정**: 임시 디버그 페이지로 `EditorShell`의 실제 스크롤 컨테이너 구조를 그대로
  재현해 Browser pane에서 실제로 재현·측정(`getBoundingClientRect`)한 뒤 고쳤다 —
  추측이 아니라 확인된 원인에 대한 수정이다. 조건부 위치 계산 대신 "버튼 아래는 항상
  공간이 있다"는 구조적 사실을 이용해 근본적으로 클리핑이 생기지 않게 했다(P14-3·
  P15-4와 같은 원칙).
- **주의사항**: 사용자가 "이동하는 버튼 4개"만 언급했지만, 재현 결과 표 툴바의 모든
  버튼(행/열 추가·삭제, 병합, 분할, 표 삭제)이 같은 행에 있어 동일하게 영향받는다는
  것을 확인해 `TableToolbarButton` 컴포넌트 자체에 적용했다 — 개별 버튼마다 따로
  고치지 않아 향후 버튼이 늘어나도 자동으로 적용된다.
- **우려사항**: 없음 — 툴팁이 버튼 "아래"로 바뀌면서 표의 첫 행과 잠깐 겹칠 수 있지만,
  호버 중에만 나타나는 오버레이라(pointer-events: none) 클릭 등 실제 상호작용을
  막지 않는다.

## 산출물
- `docs/superpowers/tasks/P17-10-table-toolbar-tooltip-clipping/{task,plan,result,test}.md`
- `src/components/editor/RichTextEditor.tsx`, `RichTextEditor.test.tsx`
- `docs/product/prd.md`
