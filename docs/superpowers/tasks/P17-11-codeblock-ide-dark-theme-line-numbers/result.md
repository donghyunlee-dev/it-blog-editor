# P17-11: 코드 블록 IDE 스타일 다크 테마 + 줄 번호 — 결과

## 커밋
- `e1f1ca2` feat: 코드 블록에 IDE 스타일 다크 테마 + 줄 번호 추가 (P17-11)

## 변경 파일
- `src/app/globals.css`
  - `.prose pre`에 `--tw-prose-pre-bg`/`--tw-prose-pre-code`/`--color-secondary`/
    `--color-muted`를 `@sfood/ui`의 고정 팔레트 토큰(`--gray-900`/`--gray-50`/
    `--gray-300`/`--gray-400`)으로 오버라이드해, 코드 블록 배경·기본 글자색·일부
    hljs 토큰 색을 앱 테마와 무관하게 항상 다크로 고정했다. `--color-brand`/
    `success`/`warning`/`info`/`danger`는 원래 테마 간 값이 안 바뀌는 토큰이라
    그대로 뒀다.
  - `.code-block-gutter`(줄 번호 거터) 스타일 추가 — `<pre>`를 `display: flex`로
    바꿔 거터·코드가 나란히 놓이고 같은 패딩 기준으로 줄이 맞는다.
  - `.code-block-toolbar`에도 `--color-foreground`/`--color-border`/`--color-muted`
    를 같은 방식으로 고정 — 언어 선택 드롭다운(P17-5b) 등 그 안의 디자인 시스템
    컴포넌트가 항상 올바른 대비를 갖게 한다(아래 "자체 검토" 참고, 작업 중 발견한
    회귀 수정 포함).
- `src/components/editor/RichTextEditor.tsx` — `CodeBlockView`에 줄 번호 거터
  (`node.textContent.split("\n").length`로 줄 수 계산, `contentEditable={false}`
  로 편집 대상에서 제외)를 `<pre>` 안 `<code>` 앞 형제로 추가했다.
- `src/components/editor/RichTextEditor.test.tsx` — 줄 번호가 코드 줄 수만큼 순서대로
  보이는지, 빈 코드 블록엔 "1"만 보이는지 확인하는 테스트 2개 추가.
- `docs/product/prd.md` — Phase 17에 P17-11 항목 추가 및 완료 표시(사용자가 원래
  목록에 없던 항목을 P17-5b 리뷰 중 추가 요청한 경위 기록).

## 자체 검토
- **긍정**: "항상 다크"라는, 앱의 테마 전환 메커니즘과 근본적으로 어긋나는 요구를
  임의 hex 하드코딩 없이 구현했다 — `@sfood/ui`의 기본 팔레트 토큰(`base.css`의
  `--gray-*`, 테마 조건과 무관하게 고정)을 직접 참조하는 방식으로, "커스텀 색상은
  CSS Variables로만 참조한다"는 프로젝트 규칙을 지키면서도 시맨틱 토큰(테마에 따라
  값이 바뀜)을 우회했다. Browser pane에서 라이트/다크 테마 전환 둘 다 실제로
  확인했다.
- **주의사항(작업 중 발견한 버그, 같은 작업에서 수정)**: 코드 블록 배경을 고정
  다크로 만든 직후, 라이트 테마에서 언어 선택 드롭다운(P17-5b) 글자가 안 보이는
  회귀가 생겼다 — `Select`가 쓰는 `text-foreground`가 라이트 테마에서는 어두운
  색인데, 배경이 이제 항상 어두워 "어두운 글자 위에 같은 색 배경"이 됐기 때문이다.
  `.code-block-toolbar` 컨테이너 자체에 `--color-foreground`(및 관련 토큰)를 같은
  방식으로 고정해, 그 안에 놓이는 어떤 디자인 시스템 컴포넌트든(향후 P17-5c 복사
  버튼 포함) 자동으로 올바른 대비를 갖도록 근본적으로 해결했다 — 개별 컴포넌트마다
  땜질하지 않는다.
- **우려사항**: 줄 번호 거터가 `<pre>`와 같은 `overflow-x: auto` 스크롤 상자 안에
  있어, 코드가 화면 폭을 넘겨 가로 스크롤되면 거터도 함께 스크롤돼 사라진다(거터만
  고정하려면 별도 스크롤 컨테이너 분리가 필요해 범위 밖으로 남겼다 — task.md 참고).
  일반적인 짧은 코드 스니펫에서는 문제되지 않는다.

## P17-11 후속 버그 수정(같은 PR, 사용자 실사용 확인 후 리포트)
사용자 지적: "수정하면서 언어 감지가 이상해졌네. 위로 드롭다운이 생기고, 폰트 컬러가
화이트라서 안보여."

- **폰트 컬러 문제(실제 버그, 수정함)**: 원래 조치는 "닫혀 있는" select 상자의 글자색만
  고쳤을 뿐, 클릭해서 펼치는 옵션 목록(브라우저가 그리는 네이티브 팝업)은 별개였다 —
  그 팝업의 배경색은 우리 CSS가 아니라 페이지의 `color-scheme`(라이트/다크 배색 힌트)을
  따르는데, 이 프로젝트는 어디에도 `color-scheme`을 지정하지 않아 브라우저가 기본값
  (라이트, 흰 배경)으로 그렸다. 거기에 강제로 밝게 만든 글자색이 얹혀 "흰 배경 위에
  흰 글자"가 되어 옵션 목록 자체가 안 보였다. `.code-block-toolbar`에
  `color-scheme: dark`를 추가해, 이 컨테이너 안의 네이티브 컨트롤(옵션 팝업 포함)이
  다크 배색으로 그려지게 했다 — 별도로 각 옵션에 배경색을 일일이 지정할 필요가 없다.
- **"위로 드롭다운이 생긴다" 부분(버그 아님, 안내)**: 네이티브 `<select>`의 옵션 목록이
  위/아래 중 어디로 펼쳐질지는 브라우저가 "그 select 아래 남은 화면 공간"을 보고 자체
  결정하는 것으로, 저작자 CSS로 방향을 지정할 방법이 없다(표준에 그런 API가 없음).
  화면 아래쪽에 가까운 코드 블록일수록 위로 펼쳐지는 것이 정상 동작이며, 이번 커밋
  전후로 이 계산 방식 자체가 달라지지 않았다 — 다만 그동안은 글자가 안 보여 "이상하게
  동작한다"고 느껴졌을 가능성이 크다. 색상 수정 후 재확인이 필요하다.

## 산출물
- `docs/superpowers/tasks/P17-11-codeblock-ide-dark-theme-line-numbers/{task,plan,result,test}.md`
- `src/app/globals.css`
- `src/components/editor/RichTextEditor.tsx`, `RichTextEditor.test.tsx`
- `docs/product/prd.md`
