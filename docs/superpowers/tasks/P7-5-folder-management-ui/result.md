# P7-5: 새 폴더 만들기·이름 변경·삭제 UI — 구현 결과 보고서

## 구현 내용
- **`FolderFormModal.tsx`(신규)**: 생성/이름변경을 같은 폼(이름 입력 하나)으로 처리하는 공용 컴포넌트. `mode`(`{ type: "create", parentId }` | `{ type: "rename", folderId, currentName }`)로 분기해 `POST /api/editor/folders` 또는 `PUT /api/editor/folders/{folderId}`를 호출한다. `AccountInfoModal.tsx`의 FormField+Input+useToast 패턴을 그대로 따른다. 부모가 이 컴포넌트를 `{folderFormState && <FolderFormModal ... />}`로 항상 새로 마운트하므로(닫힌 뒤에만 다른 모드로 열 수 있어 매번 null을 거침), `useEffect`로 입력값을 동기화할 필요 없이 `useState` 초기값만으로 "생성=빈 값, 이름변경=현재 이름"이 보장된다(처음엔 `useEffect`로 구현했다가 `react-hooks/set-state-in-effect` 린트 오류로 이 사실을 깨닫고 제거함).
- **`EditorSidebar.tsx`**:
  - 폴더 트리(P7-4) 위에 "새 폴더 만들기" 진입점을 추가했다 — **폴더가 하나도 없는 계정에서도 보인다**(그렇지 않으면 첫 폴더를 만들 방법 자체가 없었다).
  - `renderFolderNode`를 재구성했다 — 토글(펼침/접힘)과 액션 버튼(하위 폴더 추가/이름변경/삭제)은 서로 다른 `<button>`이라 하나의 `<div>`로 나란히 둔다(버튼 중첩은 유효한 HTML이 아님). 들여쓰기(`paddingLeft`)도 버튼에서 이 감싸는 div로 옮겼다.
  - 액션 버튼은 평소엔 `opacity-0`으로 숨겨져 있다가 행에 마우스를 올리거나(`group-hover`) 키보드 포커스가 들어오면(`group-focus-within`) 나타난다 — 사이드바 폭 조절 핸들의 "평소엔 거의 안 보이다가" 패턴과 같은 원칙, 폴더가 많을 때 시각적으로 번잡해지는 것을 막는다.
  - 삭제는 `window.confirm()` 대신 `Modal` 확인 절차를 거친다(`DocumentEditor.tsx`의 "문서 삭제" Modal과 동일한 패턴) — 안내 문구("...안에 있던 하위 폴더와 문서는 삭제되지 않고 상위 위치로 이동합니다")는 `deleteFolder`/`promoteDocumentsFromDeletedFolder`의 실제 동작(승격이지 삭제가 아님)을 정확히 전달한다.
  - 저장/삭제 성공·실패 모두 `Toast`로 안내한다. 성공 시 `router.refresh()`로 서버 컴포넌트(`layout.tsx`)가 최신 `folders`/`documents`를 다시 내려주게 한다 — `DeletedDocumentsModal.tsx`의 `onRestored` 선례와 동일한 패턴, 별도 클라이언트 캐시 무효화 계층을 새로 만들지 않았다.
  - 폴더 중첩 깊이 제한(5단계, P7-1에서 이미 서버가 검증)은 클라이언트에서 미리 막지 않는다 — 초과 시도 시 서버가 `ValidationError`를 던지고 그대로 Toast로 안내된다(이중 검증 로직 없음).

## 파일 변경 내역
| 파일 | 변경 사항 |
|------|---------|
| `src/components/editor/FolderFormModal.tsx` | 신규 — 생성/이름변경 공용 폼 |
| `src/components/editor/FolderFormModal.test.tsx` | 신규 — 6건 |
| `src/components/editor/EditorSidebar.tsx` | 새 폴더 진입점, 폴더 행 액션 버튼(추가/이름변경/삭제), 삭제 확인 Modal 추가 |
| `src/components/editor/EditorSidebar.test.tsx` | P7-4 들여쓰기 테스트를 새 DOM 구조에 맞게 갱신, "폴더 생성·이름변경·삭제(P7-5)" describe 블록 7건 추가 |
| `docs/product/prd.md` | P7-5 완료 표시, 진행률·Phase 7 권장 순서 갱신 |

## 커밋 내역
| SHA | 메시지 |
|-----|--------|
| `45e61b3` | feat: 새 폴더 만들기·이름 변경·삭제 UI 추가 (P7-5) |

## 자체 검토 (Self-Review)
### 긍정 사항
- 생성/이름변경을 별도 컴포넌트 둘로 만들지 않고 모드 하나로 합쳐, 폼 자체가 완전히 같은 모양(이름 입력 하나)이라는 사실을 그대로 코드 구조에 반영했다.
- 린트가 잡아준 `set-state-in-effect` 경고를 억제(`eslint-disable`)하지 않고, 애초에 그 `useEffect`가 불필요했다는 것(부모가 항상 새로 마운트하므로)을 확인해 근본적으로 제거했다 — 기존 EditorShell.tsx의 localStorage 동기화(외부 시스템과의 동기화라 effect가 실제로 필요한 경우)와 성격이 다르다는 것을 구분했다.
- 액션 버튼을 hover/focus 시에만 드러나게 해, 폴더가 없거나 적은 대다수 사용자 화면에는 아무 시각적 변화가 없다(P7-4의 회귀 안전성 원칙을 그대로 이어감).

### 주의사항
- 폴더 중첩 깊이 제한을 클라이언트에서 미리 막지 않기로 했다 — 5단계 근처에서 "하위 폴더 추가" 버튼을 눌렀다가 서버 거부를 Toast로 받는 경험이 사전에 비활성화하는 것보다 약간 거칠 수 있다. 서버 검증 하나만 신뢰한다는 원칙(이중 검증 방지)을 우선한 의도적 선택이다.

### 우려사항
- AX Auth 로그인 제약으로 실제 브라우저 확인은 하지 못했다(기존 UI 항목들과 동일한 제약) — 특히 hover 기반 액션 버튼 노출의 실제 발견 가능성(사용자가 마우스를 올려볼 생각을 하는지)은 자동화 테스트로 검증할 수 없는 부분이다.
