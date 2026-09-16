# P17-6: 슬래시 메뉴 항목 아이콘 추가 — 결과

## 커밋
- (커밋 예정 — 아래 "산출물" 참고)

## 변경 파일
- `src/components/editor/SlashCommandExtension.ts`
  - `CommandItem`에 `icon?: string`(optional, 하위 호환) 필드 추가.
  - `ICON` 상수 객체 — 기존 `TableIcon`/`CodeCopyIcon`(RichTextEditor.tsx)과 같은
    시각 스타일(viewBox 0 0 24 24, stroke=currentColor, stroke-width=2, h-4 w-4)의
    SVG 마크업 문자열을 블록 타입별로 정의(제목1/2/3은 "H1"/"H2"/"H3" 텍스트 배지,
    글머리·번호 목록, 인용구, 구분선, 표, 코드블록, 인라인 코드).
  - 기본 13개 `ITEMS`에 각각 아이콘 지정 — 패널 3종은 새 아이콘을 그리지 않고 이미
    있던 `DEFAULT_PANEL_ICONS`(ℹ️/⚠️/📝) 이모지를 그대로 재사용했다.
  - `createSlashMenuRenderer`의 `renderItems()` — `item.icon`이 있으면 `aria-hidden`
    span(아이콘)을 별도 텍스트 span(제목) 앞에 렌더링. `icon`이 없으면 아이콘 span
    자체를 만들지 않아(하위 호환) 텍스트만 있던 기존 항목도 그대로 동작한다. 버튼
    레이아웃을 `block` → `flex items-center gap-2`로 바꿔 아이콘·텍스트가 나란히
    놓이게 했다.
- `src/components/editor/RichTextEditor.tsx`
  - `IMAGE_SLASH_ICON`/`DOCUMENT_LINK_SLASH_ICON` 상수(같은 시각 스타일의 SVG
    마크업) 추가, `createImageSlashItem`/`createDocumentLinkSlashItem`에 각각 지정.
- `src/components/editor/SlashCommandExtension.test.ts`
  - 기본 13개 항목 전부 non-empty `icon`을 갖는지 확인하는 회귀 테스트 추가(아이콘을
    깜빡 빠뜨려도 타입 체크로는 안 잡히므로).
  - `createSlashMenuRenderer` 아이콘 렌더링 테스트 2개 추가: icon 없는 항목은
    아이콘 요소 없이 텍스트 span만(자식 1개), icon 있는 항목은 `aria-hidden` 아이콘
    span + 별도 텍스트 span(자식 2개, 텍스트 span의 textContent는 title 그대로).
- `docs/product/prd.md` — P17-6 항목 완료 표시, 진행률 갱신.

## 자체 검토
- **긍정**: `icon`을 optional로 둬서 기존 테스트 픽스처·호출부를 전혀 건드리지 않고
  하위 호환을 유지했다. 아이콘은 `aria-hidden`으로 감싸 스크린 리더가 중복으로
  읽지 않는다 — 버튼의 텍스트 노드(레이블 span)는 title 그대로라 접근성 이름이
  바뀌지 않는다. 패널 3종은 새 아이콘을 만들지 않고 그 패널이 실제로 표시하는
  이모지(`DEFAULT_PANEL_ICONS`)를 그대로 재사용해, "메뉴에서 본 아이콘 = 삽입된
  패널의 아이콘"이 일치하도록 했다.
- **주의사항**: `createSlashMenuRenderer`는 React가 아니라 순수 DOM 렌더러라
  아이콘을 SVG 마크업 문자열로 전달하고 `innerHTML`로 꽂는다 — 문자열은 전부
  개발자가 직접 작성한 상수(사용자 입력 아님)라 XSS 위험은 없지만, 일반적인 React
  프로젝트의 "JSX 컴포넌트로 아이콘 관리" 관례와는 다른 패턴이라는 점을 이 파일
  상단 주석에 남겼다.
- **우려사항**: 제목 1/2/3 아이콘은 선 그림(line-art)이 아니라 "H1"/"H2"/"H3"
  텍스트 배지다 — PRD가 "버블 메뉴의 글자 아이콘과는 별개로"라고 명시했지만, 헤딩
  레벨 자체를 나타내는 배지는 인라인 서식 마크(B/I)와 다른 범주이고 Notion·Coda 등
  대부분의 문서 도구가 쓰는 관례라 그대로 채택했다(task.md "결정이 필요한 사항"
  참고). 사용자가 순수 그래픽 아이콘을 원하면 후속 요청으로 처리한다.

## Browser pane 시각 검증
AX Auth 로그인 제약으로 실제 `/editor/[pageId]` 화면은 열 수 없어, 빈 문서 하나를
렌더링하는 임시 디버그 페이지(검증 후 삭제)에서 실제 키보드 입력으로 `/`를 입력해
메뉴를 열었다. 스크린샷으로 15개 항목(기본 13개 + 이미지·문서 링크) 전부가 각자
구분되는 아이콘과 함께 렌더링됨을 확인했다 — H1/H2/H3 배지, 글머리·번호(1·2·3)
목록, 인용부호, 구분선(가로줄), 표(격자), 코드블록(중괄호)·인라인 코드(꺾쇠), 패널
3종 이모지, 이미지(사진틀)·문서 링크(고리) 아이콘이 모두 텍스트 앞에 정렬되어 보였다.

## 산출물
- `docs/superpowers/tasks/P17-6-slash-menu-icons/{task,plan,result,test}.md`
- `src/components/editor/SlashCommandExtension.ts`, `SlashCommandExtension.test.ts`
- `src/components/editor/RichTextEditor.tsx`
- `docs/product/prd.md`
