# P9-1: 패널 노드 데이터 모델 확장 + Confluence storage 직렬화 — 구현 계획

## Global Constraints
- 기존 3종 색상 테마(`panelType`: info/warning/note)와 `globals.css`의 `.panel-*` 클래스는 그대로 둔다 — 이번 항목은 아이콘만 추가한다.
- `icon` attrs는 문자열(이모지 1개)만 허용한다 — 노션의 `icon.type === "external"/"file"`(이미지 URL) 형태는 다루지 않는다(사용자 확인, 큐레이션된 이모지만 지원).
- `tiptap-to-storage.ts`는 여전히 단방향(TipTap JSON → Confluence storage) 직렬화만 한다 — 역방향 파서를 새로 만들지 않는다.
- 기존 문서 호환: `icon` attrs가 없는 저장된 문서를 열었을 때 에러 없이 `panelType` 기준 기본 아이콘으로 보이게 한다(마이그레이션 스크립트 없이 `addAttributes`의 `default` 계산 또는 렌더링 시점 폴백으로 처리).

## Files
- Modify: `src/components/editor/RichTextEditor.tsx` (`Panel` 노드 정의, `renderHTML`/`parseHTML`)
- Modify: `src/components/editor/RichTextEditor.test.tsx`
- Modify: `src/components/editor/SlashCommandExtension.ts` (정보/경고/노트 3개 항목의 `insertContent` attrs에 기본 아이콘 추가)
- Modify: `src/components/editor/SlashCommandExtension.test.ts`
- Modify: `src/lib/editor/tiptap-to-storage.ts` (`panel` case에 `ac:parameter` 추가)
- Modify: `src/lib/editor/tiptap-to-storage.test.ts`

## Steps
- [ ] **Step 1**: `RichTextEditor.tsx`의 `Panel` 노드 `addAttributes`에 `icon: { default: null }`을 추가한다. `panelType`별 기본 아이콘 맵(`{ info: "ℹ️", warning: "⚠️", note: "📝" }`)을 상수로 뽑아, `renderHTML`이 `node.attrs.icon ?? DEFAULT_PANEL_ICON[node.attrs.panelType] ?? DEFAULT_PANEL_ICON.info`로 폴백 계산해 아이콘 텍스트 노드(`span.panel-icon`)를 콘텐츠 앞에 렌더링하도록 배열을 `["div", {...}, ["span", {class:"panel-icon"}, icon], ["div", {class:"panel-content"}, 0]]` 형태로 바꾼다(`.panel`이 이미 `display:flex`라 아이콘+본문이 나란히 배치됨). `parseHTML`도 `data-panel-icon` 속성을 함께 읽도록 갱신한다.
- [ ] **Step 2**: 노션 콜아웃 스키마와의 매핑을 `Panel` 노드 정의 바로 위에 주석으로 남긴다 — `panelType`(info/warning/note) ~ 노션 `callout.color`, `icon`(이모지 문자열) ~ 노션 `callout.icon.emoji`. 실제 변환 함수는 만들지 않는다(향후 가져오기/내보내기 기능이 이 주석을 근거로 재사용).
- [ ] **Step 3**: `SlashCommandExtension.ts`의 정보/경고/노트 3개 항목이 `insertContent`에 `attrs: { panelType: "info", icon: "ℹ️" }` 형태로 기본 아이콘을 함께 넘기도록 고친다(슬래시로 새로 삽입한 패널은 attrs가 항상 명시적으로 채워짐 — 폴백은 과거 문서 전용).
- [ ] **Step 4**: `tiptap-to-storage.ts`의 `panel` case에서 `icon` attrs(없으면 `panelType` 기준 기본값 재계산 — Step 1과 같은 폴백 로직 공유)를 `escapeHtml`로 이스케이프해 `<ac:parameter ac:name="icon">{icon}</ac:parameter>`로 `ac:rich-text-body` 앞에 추가한다.
- [ ] **Step 5**: `RichTextEditor.test.tsx` — 아이콘 attrs 없는 기존 패널이 기본 아이콘으로 렌더링되는지, 아이콘을 명시한 패널이 그 아이콘으로 렌더링되는지 검증(3종 타입 각각).
- [ ] **Step 6**: `SlashCommandExtension.test.ts` — 정보/경고/노트 3개 항목의 `insertContent` 호출 attrs에 기본 아이콘이 포함되는지 검증(기존 `panelType` 혼동 방지 테스트 패턴 재사용).
- [ ] **Step 7**: `tiptap-to-storage.test.ts` — 아이콘 있는/없는 패널 모두 `ac:parameter`가 이스케이프되어 포함되는지, 기존 XSS 이스케이프 테스트가 아이콘 파라미터에도 동일하게 적용되는지 검증.
- [ ] **Step 8**: `npx vitest run RichTextEditor.test.tsx SlashCommandExtension.test.ts tiptap-to-storage.test.ts`, `npx eslint src/components/editor/RichTextEditor.tsx src/components/editor/SlashCommandExtension.ts src/lib/editor/tiptap-to-storage.ts`, `npm run build`로 확인한다.

각 Step은 `npx vitest run RichTextEditor.test.tsx SlashCommandExtension.test.ts tiptap-to-storage.test.ts`로 검증 가능한 단위로 쪼갠다.
