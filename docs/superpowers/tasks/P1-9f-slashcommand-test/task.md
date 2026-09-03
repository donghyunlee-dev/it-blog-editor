# P1-9f: `SlashCommandExtension.ts` 테스트를 추가한다

## 배경
- 2026-08-27 [프로덕션 준비도 감사](https://claude.ai/code/artifact/87302c07-68d6-42ed-8712-9345547cb659)에서 나온 항목으로, P1-9 시리즈의 마지막 항목이다. 이 모듈은 지금까지 어떤 테스트에서도(직접이든 `RichTextEditor.test.tsx`를 통한 간접이든) 한 번도 실행된 적이 없다.
- 이 파일은 두 부분으로 나뉜다: (1) `createSlashItems(query, extraItems)` — 쿼리로 필터링하는 순수 함수, (2) `createSlashMenuRenderer()` — TipTap `Suggestion` 플러그인이 요구하는 `onStart`/`onUpdate`/`onKeyDown`/`onExit` 콜백을 반환하는 DOM 렌더러. 9개 기본 항목(`ITEMS`)이 각각 올바른 TipTap 커맨드 체인을 호출하는지도 이번에 처음 검증한다 — 복붙으로 만들어진 유사 항목들(패널 3종 등) 사이에 값이 잘못 들어가는 실수(예: "경고 패널"이 실제로는 `panelType: "info"`를 넣는 것)를 잡아낼 수 있는 유일한 안전망이다.

## 수용 기준 (Acceptance Criteria)
- [x] `createSlashItems("")`는 기본 9개 항목을 전부 반환한다.
- [x] `createSlashItems(query)`는 대소문자 구분 없이 제목에 `query`가 포함된 항목만 반환한다.
- [x] 일치하는 항목이 없으면 빈 배열을 반환한다.
- [x] `extraItems`를 넘기면 기본 항목 뒤에 이어붙이고, 그 항목도 동일하게 쿼리 필터링 대상이 된다.
- [x] 9개 기본 항목 각각의 `run(editor, range)`이 올바른 커맨드 체인을 정확한 인자로 호출한다(제목1/2, 글머리목록, 번호목록, 표, 코드블록, 정보/경고/노트 패널 — 특히 세 패널 항목이 서로 다른 `panelType`을 정확히 쓰는지).
- [x] `createSlashMenuRenderer().onStart`는 항목들을 버튼으로 렌더링하고 `props.mount(menuEl)`를 호출한다.
- [x] 항목이 없을 때는 "일치하는 항목이 없습니다" 안내를 렌더링한다.
- [x] `onKeyDown`의 ArrowDown/ArrowUp이 선택 인덱스를 순환시키고(마지막에서 ArrowDown 시 처음으로), Enter가 현재 선택된 항목의 `run`을 호출한다.
- [x] 메뉴 항목을 클릭하면 그 항목의 `run`이 호출된다.
- [x] `onExit`가 `props.mount`이 반환한 unmount 콜백을 호출한다.

## 결정이 필요한 사항
없음.

## 범위 밖
- `@tiptap/suggestion` 패키지 자체의 동작(`/` 트리거 감지, 위치 계산 등)은 검증하지 않는다 — 이 프로젝트 코드가 그 패키지에 넘기는 콜백들의 동작만 다룬다.
- 이미지 슬래시 항목(`createImageSlashItem`, `RichTextEditor.tsx` 소속)은 P1-9e에서 이미 간접적으로 다뤄지지 않았고 이 파일 소속도 아니라 범위 밖이다.
