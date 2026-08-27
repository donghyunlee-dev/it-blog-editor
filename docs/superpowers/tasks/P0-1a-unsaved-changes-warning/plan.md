# P0-1a: 저장하지 않은 변경사항 이탈 경고 — 구현 계획

## Global Constraints
- `window.confirm()`을 쓰지 않는다 — 앱 내부 이동은 `@sfood/ui`의 `Modal`로 확인받는다(CLAUDE.md 규칙). 진짜 브라우저 이탈(탭 닫기/새로고침/외부 URL)만 `beforeunload`의 네이티브 대화상자를 쓴다(브라우저가 강제하는 부분이라 커스터마이즈 불가).
- Provider가 없는 상태에서 `DocumentEditor`를 단독 렌더링하는 기존 테스트가 깨지면 안 된다 — `useToast()`와 동일하게 기본값(no-op)을 가진 Context로 만든다(`createContext(default)`, `null` + throw 금지).
- `EditorShell`이 이미 `EditorSidebar`와 `{children}`(문서 편집 화면)을 함께 감싸는 유일한 지점이므로, Provider는 여기 하나만 추가한다 — `layout.tsx`나 `app/layout.tsx`는 건드리지 않는다.

## Files
- Create: `src/components/editor/UnsavedChangesContext.tsx`
- Create: `src/components/editor/UnsavedChangesContext.test.tsx`
- Modify: `src/components/editor/EditorShell.tsx` (Provider로 감싸기)
- Modify: `src/components/editor/DocumentEditor.tsx` (dirty 추적 + 뒤로가기 링크 가드)
- Modify: `src/components/editor/EditorSidebar.tsx` (사이드바 링크 3곳 가드)
- Modify: `src/components/editor/DocumentEditor.test.tsx` (Provider로 감싼 통합 테스트 2개 추가)
- Modify: `src/components/editor/EditorSidebar.test.tsx` (가드 동작 테스트 1개 추가)

## Steps

- [ ] **Step 1**: `UnsavedChangesContext.tsx` 작성.
  - `UnsavedChangesContextValue { isDirty: boolean; setDirty(v: boolean): void; guardNavigate(event: {preventDefault(): void}, href: string): void }`
  - 기본값(Provider 없을 때): `{ isDirty: false, setDirty: () => {}, guardNavigate: () => {} }` — guardNavigate가 아무것도 안 하면 `preventDefault()`가 안 불려서 Link가 평소처럼 이동한다.
  - `UnsavedChangesProvider`: `isDirty` state, `pendingHref` state(모달이 열려있는지 겸함). `guardNavigate`는 `isDirty`일 때만 `event.preventDefault()` + `setPendingHref(href)`. `useRouter()`로 확인 시 `router.push(pendingHref)`.
  - `isDirty`가 true인 동안만 `beforeunload` 리스너를 등록(`event.preventDefault(); event.returnValue = ""`) — `useEffect(() => { if (!isDirty) return; ... }, [isDirty])`.
  - 확인 Modal은 Provider가 직접 렌더링한다(`@sfood/ui`의 `Modal`+`Button`) — 저장 확인 모달(`DocumentEditor.tsx`의 삭제 확인)과 같은 톤: "계속 편집"(secondary)/"변경사항 버리고 이동"(danger).
  - `useUnsavedChanges()` 훅으로 export.
- [ ] **Step 2**: `UnsavedChangesContext.test.tsx` 작성 — Provider 없이 `useUnsavedChanges()`를 쓰는 컴포넌트가 no-op으로 동작하는지, `isDirty` 상태에서 `beforeunload` 이벤트의 `defaultPrevented`가 true가 되는지(jsdom에서 `window.dispatchEvent(new Event('beforeunload', {cancelable: true}))`로 검증), `guardNavigate` 호출 시 Modal이 뜨고 확인/취소가 올바르게 동작하는지 검증.
- [ ] **Step 3**: `npm test -- UnsavedChangesContext.test.tsx`로 통과 확인.
- [ ] **Step 4**: `EditorShell.tsx`의 반환 JSX 전체(현재 `<div className="flex h-screen ...">`)를 `<UnsavedChangesProvider>`로 감싼다.
- [ ] **Step 5**: `DocumentEditor.tsx` 수정.
  - `useUnsavedChanges()`로 `{ isDirty, setDirty, guardNavigate }`를 가져온다(단, `isDirty` 자체는 이 컴포넌트에서 안 쓸 수도 있음 — 필요하면 사용).
  - `setTitle`/`onChange`(RichTextEditor)/`setTags`(TagInput) 호출부를 감싸 값이 바뀔 때마다 `setDirty(true)`도 함께 호출한다.
  - `handleSave` 성공 경로(본문 저장 성공 직후, 태그 저장 결과와 무관하게)에서 `setDirty(false)`를 호출한다.
  - `handleDelete` 성공 경로에서도 `setDirty(false)`를 호출한다(방어적으로).
  - "문서함으로 돌아가기" `<Link href="/editor">`에 `onNavigate={(event) => guardNavigate(event, "/editor")}`를 추가한다(Next.js `<Link>`의 내장 `onNavigate` prop, `next/link` v15.3.0+).
- [ ] **Step 6**: `DocumentEditor.test.tsx`에 테스트 2개 추가(둘 다 `<UnsavedChangesProvider>`로 감싸서 렌더링).
  1. 제목을 수정한 뒤 "문서함으로 돌아가기"를 클릭하면 확인 모달이 뜨고, "계속 편집"을 누르면 `push`가 호출되지 않으며, 다시 클릭 후 "변경사항 버리고 이동"을 누르면 `push("/editor")`가 호출된다.
  2. 저장이 성공한 뒤에는 "문서함으로 돌아가기"를 클릭해도 확인 모달 없이 곧바로 이동한다(dirty가 리셋됐음을 검증).
- [ ] **Step 7**: `npm test -- DocumentEditor.test.tsx`로 기존 테스트(Provider 없이 렌더링하는 기존 케이스들 포함)와 신규 테스트 모두 통과 확인.
- [ ] **Step 8**: `EditorSidebar.tsx`의 로고/"새 문서"/문서 행 `<Link>` 3곳에 각각 `onNavigate={(event) => guardNavigate(event, href)}`를 추가한다(`const { guardNavigate } = useUnsavedChanges();`). 기존에 있는 컴포넌트 prop `onNavigate`(모바일 드로어 닫기 콜백, `onClick`에 연결됨)와 이름이 겹치니 혼동하지 않도록 주석을 남긴다.
- [ ] **Step 9**: `EditorSidebar.test.tsx`에 테스트 1개 추가 — `<UnsavedChangesProvider>`로 감싸고 내부에 "dirty를 true로 만드는" 헬퍼 컴포넌트를 함께 렌더링한 뒤, 문서 행 클릭 시 확인 모달이 뜨는지 검증.
- [ ] **Step 10**: `npm test -- EditorSidebar.test.tsx`로 통과 확인.
- [ ] **Step 11**: `npm test`(전체) + `npm run lint` + `npm run build`로 회귀 없는지 최종 확인, 브라우저로 수동 검증(제목 수정 후 사이드바 다른 문서 클릭 → 모달, 저장 후 이동 → 모달 없음, 탭 닫기 시도 → 네이티브 경고).
