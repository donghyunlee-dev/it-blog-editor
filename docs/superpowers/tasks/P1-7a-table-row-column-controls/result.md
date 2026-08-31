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

**실측으로 발견한 라이브러리 한계**: prosemirror-tables의 `deleteRow`/`deleteColumn` 소스(`node_modules/prosemirror-tables/dist/index.cjs`)를 직접 확인한 결과, "마지막 한 행/열인지" 검사는 `if (dispatch)` 블록 안에만 있다. TipTap의 `editor.can()`은 dispatch 없이 커맨드를 호출해 "실행 가능한가"만 미리 묻는데, 이 구조 때문에 `can().deleteRow()`/`can().deleteColumn()`은 표 안에 있기만 하면 마지막 행/열이어도 항상 `true`를 반환한다 — 즉 버튼이 그 경계에서 비활성화되지 않는다. 대신 실제로 클릭하면(진짜 dispatch가 있는 호출) 라이브러리가 트랜잭션 자체를 디스패치하지 않아 조용히 아무 일도 일어나지 않는다(표가 깨지거나 빈 표가 되는 사고는 없음). 이 실제 동작을 추측이 아니라 테스트로 직접 확인한 뒤 그대로 문서화하고 회귀 테스트로 고정했다 — 있지도 않은 비활성화 동작을 구현했다고 잘못 보고하는 대신, 라이브러리가 실제로 하는 일을 그대로 반영했다.

## 파일 변경 내역
| 파일 | 변경 사항 |
|------|---------|
| `src/components/editor/RichTextEditor.tsx` | `TableControls`에 행/열 추가·삭제 버튼 6개 추가 |
| `src/components/editor/RichTextEditor.test.tsx` | 신규 테스트 8건 |
| `docs/product/prd.md` | P1-7a 체크리스트 완료 표시 |

## 커밋 내역
| SHA | 메시지 |
|-----|--------|
| (result.md 작성 후 커밋 예정) | |

## 자체 검토 (Self-Review)
### 긍정 사항
- TipTap이 이미 제공하는 표준 커맨드만 그대로 노출했다 — 직접 ProseMirror 트랜잭션을 재구현하지 않아 표 구조 관리(colspan/rowspan 등) 버그 위험이 없다.
- "표가 문서의 첫 노드일 때 기본 선택이 첫 셀 안으로 들어간다"는 사실을 실측으로 먼저 확인한 뒤 테스트에 활용해, 이전까지 이 프로젝트에서 회피됐던 "TipTap 컨텐츠에디터블 상호작용 테스트"의 범위를 실제로 넓혔다(`RichTextEditor.test.tsx`의 기존 주석 — "전체 리치 편집 기능 테스트는 범위 밖" — 을 표 조작에 한해 깼다).
- `can().deleteRow()`가 마지막 행에서도 `true`를 반환하는 라이브러리 동작을 추측하지 않고 소스 코드로 직접 확인한 뒤, 그 실제 동작에 맞춰 테스트와 문서를 정직하게 작성했다.

### 주의사항
- 이 UI 변경은 AX Auth(MS 계정) 로그인이 필요해 이 세션에서 실제 로그인 화면 뒤의 에디터 화면으로는 확인하지 못했다(이전 TagInput 작업과 동일한 제약). 대신 `RichTextEditor`를 실제 TipTap/ProseMirror 확장 구성 그대로 렌더링하는 컴포넌트 테스트로 실제 DOM의 `<table>` 행/열 개수 변화까지 확인했다 — 로그인된 실제 화면에서의 육안 확인은 사용자에게 요청한다.
- "마지막 행/열 삭제 시 버튼이 비활성화되지 않는다"는 프로덕션에서도 그대로 남는 동작이다(라이브러리 한계). 클릭해도 표가 깨지지는 않으므로 심각하지 않다고 판단해 그대로 뒀다 — 필요해지면 별도로 `rect.top===0 && rect.bottom===rect.map.height` 같은 직접 계산을 추가해 비활성화할 수 있지만, 이번 범위(PRD의 "행/열 추가·삭제 컨트롤을 추가한다")를 넘는 별도 UX 개선이라 하지 않았다.

### 우려사항
- 없음.
