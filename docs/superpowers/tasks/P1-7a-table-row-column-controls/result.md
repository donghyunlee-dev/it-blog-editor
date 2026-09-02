# P1-7a: 표에 행/열 추가·삭제 컨트롤을 추가한다 — 구현 결과 보고서

## 구현 내용
`src/components/editor/RichTextEditor.tsx`의 `TableControls`에 TipTap `@tiptap/extension-table`이 이미 제공하는 표준 커맨드를 그대로 노출하는 버튼 6개를 추가했다.

- **행 추가(위)** → `addRowBefore`
- **행 추가(아래)** → `addRowAfter`
- **행 삭제** → `deleteRow`
- **열 추가(왼쪽)** → `addColumnBefore`
- **열 추가(오른쪽)** → `addColumnAfter`
- **열 삭제** → `deleteColumn`

기존 "셀 병합"/"셀 분할"과 동일한 스타일(`variant="ghost"`, `size="sm"`, `editor.can()`으로 비활성화)을 따랐고, 행/열 조작과 셀 병합/분할을 시각적으로 구분하기 위해 세로 구분선을 뒀다.

**2026-08-31 사용자 실사용 확인 후 수정**: PR #20을 실제로 테스트한 사용자가 "표 생성까지만 되고 툴이 보인다거나 다른 기능은 확인이 안 된다"고 알려왔다. 원인은 `TableControls`가 (버튼을 추가하기 전부터, "셀 병합"/"셀 분할" 시절부터) 에디터 콘텐츠 영역 위쪽에 고정된 정적 `<div>`였다는 점이었다 — 문서 맨 위에만 표가 있는 경우엔 눈에 띄지만, 표가 문서 중간·아래쪽에 있으면 컨트롤이 화면 상단에 그대로 남아 스크롤 밖으로 벗어나 사실상 보이지 않았다. `EditorBubbleMenu`(굵게/기울임 등)가 이미 쓰고 있는 `@tiptap/react/menus`의 `BubbleMenu`(플로팅 UI, 선택 위치를 자동으로 따라다님)로 바꾸고, `shouldShow`에 "커서가 표 안에 있는가"를 직접 판단하게 해 텍스트를 선택하지 않고 커서만 놓아도 표 바로 옆에 뜨도록 고쳤다.

**2026-08-31 사용자 실사용 확인 2차 후 UI/UX 재설계**: `BubbleMenu`로 바꾼 뒤 다시 테스트한 사용자로부터 "텍스트로만 툴바가 구성되어 있어서 가로 사이즈가 커서 불편하고, 클릭할 때마다 나와서 사용이 불편하다. Confluence처럼 특정 위치의 컴포넌트를 클릭하면 나오거나 상단에 고정해서 나오거나 했으면 좋겠다. 아이콘을 활용해서 좀 더 직관적이게 보이면서 툴바의 사이즈를 줄였으면 좋겠다"는 피드백을 받았다. 두 대안(① Confluence류 행/열 손잡이를 hover/click하면 뜨는 방식 ② 상단 고정) 중, ①은 ProseMirror 데코레이션으로 표 grip UI를 새로 구현해야 해 리스크가 커서, `DocumentEditor.tsx`에 이미 검증된 선례(`sticky top-0` 헤더)가 있는 ②를 택했다:
- 정적/플로팅 → `sticky top-14`(헤더 `h-14` 바로 아래)로 전환해, 캐럿을 따라 화면 여기저기로 튀지 않고 항상 같은 자리에 나타나게 했다.
- 텍스트 라벨 8개를 전부 아이콘 + `Tooltip`으로 교체해 가로 폭을 크게 줄였다. `@sfood/ui`의 `Icon`은 `search`/`comment` 두 개만 제공해(node_modules 확인) 표 조작용 아이콘이 없었다 — design.md 선례(로그인 화면 자체 제작 SVG)를 따라 `Icon`이 실제 쓰는 스타일(`viewBox 0 0 24 24`, `stroke=currentColor`, `strokeWidth=2`, round cap/join)로 직접 그렸다. 삽입 4종은 "화살표가 새 선을 향해 뻗는다"는 하나의 문법을 공유하고, 병합/분할은 안쪽/바깥쪽 화살표로 대비시켰으며, 삭제(행/열 공통)는 범용 휴지통 아이콘을 재사용했다.
- 이 과정에서 `editor.isActive`/`editor.can()`을 렌더 시점에 그냥 읽기만 하던 기존 방식이, TipTap v3의 `shouldRerenderOnTransaction` 기본값이 `false`라 선택만 바뀌고 문서 내용은 안 바뀌는 전환에는 컴포넌트가 리렌더되지 않아 표시·비활성화 상태가 갱신되지 않을 수 있는 잠재적 버그였다는 것도 확인했다 — 공식 문서가 권장하는 `useEditorState`(선택자 결과가 바뀔 때만 즉시 리렌더)로 옮겨 이 문제도 함께 없앴다.

**2026-09-01 사용자 실사용 확인 3차 후 재설계(표 자체에 고정)**: "툴바가 상단에 고정하는 게 수정된 버전이 맞아? 테이블 상단이나 하단으로 툴바를 고정시킬 수 있는지 검토해봐"라는 질문을 받았다. 확인해보니 2차 버전의 `sticky top-14`는 **문서 전체 스크롤 영역** 기준이라 표가 스크롤로 멀리 내려가면 툴바는 화면 맨 위에 그대로 남아 표와 시각적으로 분리되는 문제가 있었다. 두 대안(표 상단 고정 vs 표 하단 고정) 중 표 상단 고정을 추천했고(표에 진입하자마자 스크롤 없이 바로 보임, Notion/Confluence류 관례와 일치) 사용자가 승인해 다음과 같이 재설계했다:
- "표 자체에" sticky를 고정하려면 sticky의 range 제약이 그 표를 감싸는 컨테이너여야 하는데, 일반 React 트리로는 표 하나하나를 감싸는 지점에 접근할 수 없다(TipTap이 `table` 노드를 스키마로 직접 렌더링) — 표 노드 렌더링 자체를 커스터마이즈하는 TipTap NodeView가 필요했다.
- 표의 실제 DOM 구조(`.tableWrapper > table > colgroup + tbody`)와 셀 선택·컬럼 너비 관리는 prosemirror-tables가 세밀하게 의존하는 부분이라 직접 재구현하지 않고, TipTap이 기본 제공하는 `TableView` 클래스(이 프로젝트의 `resizable: false` 설정에서 실제로 쓰이는 바로 그 클래스)를 `StickyTableView`로 상속해 `.tableWrapper`의 `<table>` 앞에 툴바 슬롯 하나만 끼워 넣었다 — 상속받은 `ignoreMutation`이 이미 "wrapper 안·content 밖 변경은 무시"를 처리해 줘서 별도 방어 코드가 필요 없었다.
- 그 슬롯에는 TipTap이 NodeView 밖에서 React UI를 마운트할 때 공식 제공하는 저수준 API `ReactRenderer`로 기존 `TableToolbar`(아이콘 버튼들)를 그대로 마운트했다 — `EditorContent`가 관리하는 React 트리에 포털로 얹히므로 별도 React 루트를 만들지 않는다.
- "커서가 이 표 안에 있는가"는 `editor.isActive("table")` 대신, 선택 범위가 이 표 노드의 `[pos, pos+nodeSize)` 안에 완전히 들어있는지로 직접 계산했다 — 문서에 표가 여러 개일 때 `isActive("table")`만으로는 "어떤" 표인지 구분할 수 없어서다(표가 하나뿐이던 이전 버전에서는 문제가 안 됐다). `editor`의 `selectionUpdate`/`transaction` 이벤트마다 다시 계산해, 값이 실제로 바뀔 때만 `ReactRenderer.updateProps`를 호출한다.
- 이 재설계로 다중 표 시나리오(문서에 표가 여러 개일 때 커서가 있는 표에만 컨트롤이 뜨는지)를 처음으로 테스트할 수 있게 됐다 — 이전 버전은 표가 문서 전체에 하나만 있다고 가정한 구조라 애초에 이 시나리오 자체가 성립하지 않았다.

**실측으로 발견한 라이브러리 한계**: prosemirror-tables의 `deleteRow`/`deleteColumn` 소스(`node_modules/prosemirror-tables/dist/index.cjs`)를 직접 확인한 결과, "마지막 한 행/열인지" 검사는 `if (dispatch)` 블록 안에만 있다. TipTap의 `editor.can()`은 dispatch 없이 커맨드를 호출해 "실행 가능한가"만 미리 묻는데, 이 구조 때문에 `can().deleteRow()`/`can().deleteColumn()`은 표 안에 있기만 하면 마지막 행/열이어도 항상 `true`를 반환한다 — 즉 버튼이 그 경계에서 비활성화되지 않는다. 대신 실제로 클릭하면(진짜 dispatch가 있는 호출) 라이브러리가 트랜잭션 자체를 디스패치하지 않아 조용히 아무 일도 일어나지 않는다(표가 깨지거나 빈 표가 되는 사고는 없음). 이 실제 동작을 추측이 아니라 테스트로 직접 확인한 뒤 그대로 문서화하고 회귀 테스트로 고정했다 — 있지도 않은 비활성화 동작을 구현했다고 잘못 보고하는 대신, 라이브러리가 실제로 하는 일을 그대로 반영했다.

## 파일 변경 내역
| 파일 | 변경 사항 |
|------|---------|
| `src/components/editor/RichTextEditor.tsx` | `TableControls`에 행/열 추가·삭제 버튼 6개 추가 → 정적 블록 → `BubbleMenu` → 문서 전체 `sticky` 아이콘 툴바 → `StickyTableView`(TipTap `TableView` 상속) + `ReactRenderer`로 표별 sticky 툴바, 3차례 재설계 |
| `src/components/editor/RichTextEditor.test.tsx` | 신규 테스트 9건(표 여러 개 시나리오 1건 포함) |
| `docs/product/prd.md` | P1-7a 체크리스트 완료 표시 |

## 커밋 내역
| SHA | 메시지 |
|-----|--------|
| `b1be07d` | feat: add table row/column insert-delete controls |
| `181a660` | docs: record P1-7a commit SHA in result.md |
| `29c92a8` | fix: turn TableControls into a floating BubbleMenu (1차 실사용 확인 후 수정) |
| `0f24a11` | docs: record BubbleMenu fix commit SHA in result.md |
| `4b26bd8` | redesign: sticky icon toolbar for table controls with useEditorState (2차 실사용 확인 후 UI/UX 재설계) |
| `3791754` | docs: record icon toolbar redesign commit SHA in result.md |
| `b807d43` | redesign: pin table toolbar to each table via a custom NodeView (3차 실사용 확인 후 재설계) |

## 자체 검토 (Self-Review)
### 긍정 사항
- TipTap이 이미 제공하는 표준 커맨드만 그대로 노출했다 — 직접 ProseMirror 트랜잭션을 재구현하지 않아 표 구조 관리(colspan/rowspan 등) 버그 위험이 없다.
- "표가 문서의 첫 노드일 때 기본 선택이 첫 셀 안으로 들어간다"는 사실을 실측으로 먼저 확인한 뒤 테스트에 활용해, 이전까지 이 프로젝트에서 회피됐던 "TipTap 컨텐츠에디터블 상호작용 테스트"의 범위를 실제로 넓혔다(`RichTextEditor.test.tsx`의 기존 주석 — "전체 리치 편집 기능 테스트는 범위 밖" — 을 표 조작에 한해 깼다).
- `can().deleteRow()`가 마지막 행에서도 `true`를 반환하는 라이브러리 동작을 추측하지 않고 소스 코드로 직접 확인한 뒤, 그 실제 동작에 맞춰 테스트와 문서를 정직하게 작성했다.
- "표 자체에 고정" 요구를 구현할 때, TipTap 표 확장의 세밀한 내부 동작(`TableView`, `ignoreMutation`, `updateColumns`)을 재구현하는 대신 정확히 필요한 만큼만(툴바 슬롯 하나) 상속으로 얹어 표 편집의 핵심 동작(셀 선택, 컬럼 너비 관리)을 건드리지 않았다 — Confluence류 grip UI를 처음부터 새로 만드는 대안보다 훨씬 위험이 적었다.
- "표가 여러 개일 때 커서가 있는 표에만 컨트롤이 뜨는가"라는, 이전 아키텍처(문서 전체에 표 하나만 있다고 가정)에서는 애초에 성립하지 않던 시나리오를 이번에 정식으로 테스트에 추가했다.

### 주의사항
- 이 UI 변경은 AX Auth(MS 계정) 로그인이 필요해 이 세션에서 실제 로그인 화면 뒤의 에디터 화면으로는 직접 로그인해 확인하지 못했다(이전 TagInput 작업과 동일한 제약) — 다만 dev 서버 로그로 사용자가 실제 계정으로 문서(pageId `212959235`)를 열고 저장까지 완료한 것을 확인했고, 그 시점 서버 로그에 이 변경과 관련된 에러는 없었다. 컴포넌트 테스트로 실제 DOM의 `<table>` 행/열 개수 변화와 다중 표 시나리오까지 확인했다 — 그럼에도 실제 화면에서 스크롤하며 "표에만 고정되는지" 육안으로 보는 것은 여전히 사용자 확인이 필요하다.
- 표가 매우 짧아 뷰포트 안에 완전히 들어가는 경우, sticky 상단 고정과 표 하단이 거의 동시에 지나가듯 보일 수 있다 — 실사용에서 불편하다는 피드백이 오면 최소 높이나 오프셋 조정으로 대응할 수 있는 여지를 남겨뒀다(이번엔 별도 대응 안 함).
- "마지막 행/열 삭제 시 버튼이 비활성화되지 않는다"는 프로덕션에서도 그대로 남는 동작이다(라이브러리 한계). 클릭해도 표가 깨지지는 않으므로 심각하지 않다고 판단해 그대로 뒀다.

### 우려사항
- 표 노드에 커스텀 NodeView(`StickyTableView`)를 도입한 것은 지금까지 세 차례 재설계 중 가장 구조적으로 깊은 변경이다 — 표 편집의 핵심 동작(셀 선택 드래그, 방향키로 셀 이동, 복사/붙여넣기)에 대한 회귀는 컴포넌트 테스트로 전부 커버되지 않는다(테스트는 버튼 클릭 기반 조작만 검증). 실제 화면에서 표를 자유롭게 편집해보며 이 부분도 함께 확인해 주시길 요청한다.
