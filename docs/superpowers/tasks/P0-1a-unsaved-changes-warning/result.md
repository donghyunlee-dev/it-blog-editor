# P0-1a: 저장하지 않은 변경사항 이탈 경고 — 구현 결과 보고서

## 구현 내용

### 1. `UnsavedChangesContext.tsx`(신규) — 이탈 경고의 단일 진실 공급원
- `UnsavedChangesProvider`가 `isDirty` 상태와 `pendingHref`(확인 Modal이 열려 있는지 겸함)를 들고 있다.
- **브라우저 자체 이탈**(탭 닫기/새로고침/주소창 입력): `isDirty`인 동안만 `beforeunload` 리스너를 등록해 네이티브 대화상자를 띄운다.
- **앱 내부 이동**(`<Link>` 클릭): Next.js 16의 `<Link onNavigate>`(v15.3.0+ 공식 API, `node_modules/next/dist/docs/.../link.md` "Blocking navigation" 절)로 가로챈 뒤, `window.confirm()` 대신 `@sfood/ui`의 `Modal`로 확인받는다(CLAUDE.md 규칙 준수). 확인하면 `pendingHref`로 `router.push`.
- Provider가 없는 곳에서 `useUnsavedChanges()`를 쓰면 모두 no-op 기본값으로 동작한다(`useToast()`와 같은 패턴) — 기존에 Provider 없이 `DocumentEditor`를 단독 렌더링하던 테스트들이 깨지지 않는다.

### 2. `EditorShell.tsx` — Provider 장착
- `EditorSidebar`와 `{children}`(문서 편집 화면)을 함께 감싸는 유일한 지점이라 여기 하나에만 `UnsavedChangesProvider`를 둔다.

### 3. `DocumentEditor.tsx` — dirty 추적 + 뒤로가기 링크 가드
- 제목/본문/태그 각각의 onChange 핸들러를 감싸(`handleTitleChange`/`handleDocChange`/`handleTagsChange`) 값이 바뀔 때마다 `setDirty(true)`.
- 문서 저장(본문) 성공 직후 `setDirty(false)` — 태그 저장이 별도로 실패해도 본문은 이미 저장됐으므로 이탈 경고를 계속 띄우지 않는다.
- 삭제 성공 시에도 방어적으로 `setDirty(false)`.
- "문서함으로 돌아가기" `<Link>`에 `onNavigate={(e) => guardNavigate(e, "/editor")}` 추가.

### 4. `EditorSidebar.tsx` — 사이드바 링크 3곳 가드
- 로고(`/editor`), "새 문서"(`/editor/new`), 문서 목록 각 행(`/editor/{pageId}`) `<Link>`에 각각 `onNavigate={(e) => guardNavigate(e, href)}` 추가.
- 기존 컴포넌트 prop `onNavigate`(모바일 드로어를 닫는 `onClick` 콜백)와 Next `<Link>`의 내장 `onNavigate` prop이 이름이 겹쳐 혼동될 수 있어 주석으로 구분을 남겼다.

### 5. 테스트
- `UnsavedChangesContext.test.tsx`(신규, 3개): Provider 없을 때 no-op, `isDirty`에 따른 `beforeunload` 차단 여부, `guardNavigate`의 Modal 확인/취소 흐름.
- `DocumentEditor.test.tsx`(+2): 변경 후 뒤로가기 클릭 → Modal → 취소/확인 분기, 저장 성공 후에는 확인 없이 이동.
- `EditorSidebar.test.tsx`(+1): 편집 중 표시 상태에서 다른 문서 클릭 → Modal → 확인 시 `push`.
- `EditorShell.test.tsx`: `UnsavedChangesProvider`가 실제 `useRouter()`를 호출하게 되어 `next/navigation` 모킹을 추가(기존 3개 테스트는 로직 변경 없음).

## 파일 변경 내역
| 파일 | 변경 사항 |
|------|---------|
| `src/components/editor/UnsavedChangesContext.tsx` | 신규 |
| `src/components/editor/UnsavedChangesContext.test.tsx` | 신규 |
| `src/components/editor/EditorShell.tsx` | `UnsavedChangesProvider`로 감싸기 |
| `src/components/editor/EditorShell.test.tsx` | `next/navigation` 모킹 추가 |
| `src/components/editor/DocumentEditor.tsx` | dirty 추적, 뒤로가기 링크 가드, 저장/삭제 성공 시 dirty 해제 |
| `src/components/editor/DocumentEditor.test.tsx` | `next/link` 대역 추가, 테스트 2개 추가 |
| `src/components/editor/EditorSidebar.tsx` | 사이드바 링크 3곳 가드 |
| `src/components/editor/EditorSidebar.test.tsx` | `next/navigation`/`next/link` 모킹 추가, 테스트 1개 추가 |

## 자체 검토 (Self-Review)

### 긍정 사항
- Next.js 16 공식 문서(`<Link onNavigate>` + Context)를 그대로 따라 프레임워크가 권장하는 방식으로 구현했다 — 임의의 history 조작 같은 깨지기 쉬운 우회가 없다.
- `window.confirm()`을 쓰지 않아 CLAUDE.md 규칙을 지켰다.
- Provider 없는 기존 테스트가 전혀 깨지지 않았다(no-op 기본값 설계 덕분).
- 저장 성공 → dirty 해제 흐름을 실제 fetch 응답 기반으로 테스트해, "저장했는데도 계속 경고가 뜨는" 회귀를 자동으로 잡아낸다.

### 주의사항
- **Next.js `<Link>`의 실제 클릭 핸들러는 `AppRouterContext`가 있어야만 `onNavigate`를 호출한다**(`node_modules/next/dist/client/app-dir/link.js`의 `linkClicked`, `if (!router) return`). RTL 테스트에는 이 내부 컨텍스트가 없어 실제 `<Link>`를 그대로 쓰면 `onNavigate`가 절대 호출되지 않는다 — 처음 테스트를 작성했을 때 이 때문에 실패했다. `next/link`를 "onClick 먼저, 그다음 onNavigate(막히면 중단)"라는 Link의 계약만 재현하는 가벼운 대역으로 바꿔 끼워 해결했다(`DocumentEditor.test.tsx`, `EditorSidebar.test.tsx`). 실제 프로덕션에서는 App Router가 이 컨텍스트를 항상 제공하므로 문제없이 동작한다.
- 이 대역은 Link의 실제 SPA 전환(화면이 실제로 바뀌는 것)까지는 재현하지 않는다 — 테스트가 검증하는 것은 "이동이 막혔는지/`router.push`가 올바른 인자로 불렸는지"이지 실제 페이지 전환 자체가 아니다. 이는 이미 프로젝트의 다른 테스트들(`DocumentEditor.test.tsx`의 기존 라우팅 테스트들)도 같은 방식(`push`/`refresh` 모킹)으로 검증해온 것과 일관된 선택이다.

### 우려사항
- **브라우저 뒤로가기/앞으로가기 버튼**으로 앱 내부의 다른 문서로 이동하는 경우는 이번 구현이 다루지 않는다(`task.md`의 "범위 밖" 절에 명시). 실사용에서 자주 문제가 되면 별도 항목으로 재논의가 필요하다.
- 이 환경의 브라우저 프리뷰가 로컬 dev 서버에 연결되지 않아(원인 미상 — `navigate`가 반복적으로 거부됨) 실제 브라우저로 클릭해 확인하는 수동 검증은 수행하지 못했다. 대신 RTL의 `userEvent`로 타이핑·클릭 등 실제 사용자 조작을 그대로 재현하는 자동화 테스트로 대체했다(`test.md` 참고) — 완전히 동등하지는 않으므로, 이 기능을 실제로 배포한 뒤 한 번은 사람이 직접 눌러 확인하는 것을 권장한다.
