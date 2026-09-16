# P17-11: 코드 블록 IDE 스타일 다크 테마 + 줄 번호 — 결과

## 커밋
- (커밋 후 기록 — 아래 "산출물" 참고)

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

## 산출물
- `docs/superpowers/tasks/P17-11-codeblock-ide-dark-theme-line-numbers/{task,plan,result,test}.md`
- `src/app/globals.css`
- `src/components/editor/RichTextEditor.tsx`, `RichTextEditor.test.tsx`
- `docs/product/prd.md`
