# P12-2: 태그 입력 영역 하단 이동 + 컴팩트화 — 결과

## 커밋
- (커밋 후 기록 예정)

## 변경 파일
- `src/components/editor/TagInput.tsx` — 바깥 `flex flex-col` 래퍼와 별도 `<p>태그</p>` 줄을
  없애고, 라벨("태그")·칩·입력을 한 flex 행에 배치해 2줄 레이아웃을 1줄로 압축했다. 패딩을
  `px-3 py-2`에서 `px-2.5 py-1.5`로 살짝 줄였다. `<input>`에 `aria-label="태그"`를 추가했고,
  `placeholder`를 `value.length === 0 ? "예: React, Backend" : undefined`로 바꿔 태그가 있으면
  예시 문구를 더 이상 보여주지 않는다. 자동완성 드롭다운·IME 처리·검증 등 기존 동작은 전혀
  바꾸지 않았다.
- `src/components/editor/TagInput.test.tsx` — 태그가 이미 있는 상태에서
  `getByPlaceholderText("예: React, Backend")`로 입력을 찾던 6개 지점을
  `getByRole("combobox", { name: "태그" })`로 교체했다(placeholder 유무와 무관하게 안정적으로
  입력을 찾기 위함). placeholder 조건부 표시를 검증하는 테스트 2개를 추가했다.
- `src/components/editor/DocumentEditor.tsx` — 제목 바로 아래(`mt-2`) 있던 `TagInput` 블록을
  제거하고, 본문(`RichTextEditor`) 다음·풋터 앞(`mt-4`)에 새로 배치했다. 새 문서 작성
  (`mode === "create"`)에서도 항상 보이도록 풋터의 조건부 렌더링(`mode === "edit" &&
  initialUpdatedAt`)과 독립시켰다. 위계 설명 주석(제목→태그→본문 간격 근거)을 새 순서(제목→
  본문→태그→풋터)에 맞게 갱신했다.
- `docs/product/prd.md` — "화면 정의" 표(새 문서 작성/문서 편집 화면 구성 요소 순서)와 "문서
  태그 지정" 기능 설명에 위치 변경·placeholder 조건을 반영했다. Phase 12 계획에 P12-2 결정
  내용을 기록하고 체크리스트에 완료 항목으로 추가했다.
- `docs/product/design.md` — "위계가 다른 영역 사이는 간격 크기를 다르게 준다" 절의 간격 표를
  새 레이아웃(제목→본문, 본문→태그, 태그→풋터)에 맞게 갱신했다.

## 자체 검토
- **긍정**: 태그 입력의 핸들러 로직(Enter/쉼표 확정, IME 조합, 자동완성, 삭제, 검증)은 전혀
  건드리지 않고 마크업 구조·클래스·placeholder 조건만 바꿔, 회귀 위험이 낮다. 새 문서 작성
  경로에서 풋터가 없어도 태그 입력이 사라지지 않도록 조건부 렌더링에서 명시적으로 분리했다.
- **주의사항**: `TagInput`을 감싸던 바깥 `<div>`(라벨 줄 포함)를 없애고 컴포넌트 최상위가 바로
  `relative flex ...` 박스가 되도록 구조를 한 단계 줄였다 — 자동완성 드롭다운의 `absolute
  left-0 top-full` 위치 기준(relative 컨테이너)이 바뀌지 않았음을 테스트(자동완성 옵션 클릭
  테스트 통과)로 확인했다.
- **우려사항**: 태그 입력이 본문보다 아래로 내려가면서, 문서를 열자마자 태그를 확인하고 싶은
  사용자는 스크롤이 필요할 수 있다 — 다만 이는 이번 방향 전환(태그를 "검색용 가벼운 키워드"로
  좁힘)에서 사용자가 이미 감수하기로 한 트레이드오프다.

## 산출물
- `docs/superpowers/tasks/P12-2-tag-input-bottom-compact/{task,plan,result,test}.md`
- `src/components/editor/TagInput.tsx`
- `src/components/editor/TagInput.test.tsx`
- `src/components/editor/DocumentEditor.tsx`
- `docs/product/prd.md`
- `docs/product/design.md`
