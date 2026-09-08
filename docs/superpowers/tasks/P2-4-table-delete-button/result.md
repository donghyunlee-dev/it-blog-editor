# P2-4: 표 삭제 버튼 추가 — 구현 결과 보고서

## 구현 내용
- `TableToolbar`(표 자체 상단에 고정되는 sticky 아이콘 툴바)에 "표 삭제" 버튼을 추가했다. 기존 셀 병합/분할 그룹과는 되돌릴 수 있는 정도가 다른 파괴적 동작이라 별도 구분선 뒤에 뒀고, 아이콘은 행/열 삭제와 같은 `TrashIcon`을 재사용했다(기존 주석의 "삭제는 방향성이 의미 없어 범용 휴지통 아이콘 하나를 재사용한다" 선례를 그대로 확장).
- `useEditorState` selector에 `canDeleteTable: currentEditor.can().deleteTable()`을 추가해 다른 버튼과 동일한 방식으로 활성/비활성을 반영한다.
- 버튼을 클릭해도 즉시 삭제하지 않고 `@sfood/ui`의 `Modal`로 확인을 받는다(CLAUDE.md 규칙, `DocumentEditor.tsx`의 "문서 삭제" Modal과 동일한 패턴 — 취소=`variant="secondary"`, 삭제 확인=`variant="danger"`). 확인을 누르면 `editor.chain().focus().deleteTable().run()`을 실행한다.
- `TableToolbar`는 `StickyTableView`가 `ReactRenderer`로 마운트하는 진짜 React 컴포넌트라 `useState`로 로컬 모달 상태를 그대로 관리할 수 있었다 — 별도 상위 상태 관리나 컨텍스트가 필요 없었다.

## 파일 변경 내역
| 파일 | 변경 사항 |
|------|---------|
| `src/components/editor/RichTextEditor.tsx` | `Modal` import 추가, `TableToolbar`에 `canDeleteTable` 상태·`confirmDeleteOpen` 로컬 state·"표 삭제" 버튼·확인 Modal 추가 |
| `src/components/editor/RichTextEditor.test.tsx` | "RichTextEditor 표 삭제(P2-4)" describe 블록 4건 추가(확인 Modal 노출, 취소 시 유지, 확인 시 삭제+onChange 반영, 다중 표 중 커서 있는 표만 삭제) |
| `docs/product/prd.md` | "P2 — 다듬기"에 P2-4 체크리스트 항목 추가·완료 표시 |

## 커밋 내역
| SHA | 메시지 |
|-----|--------|
| (커밋 예정 — 아래 test.md 검증 통과 후 커밋) | |

## 자체 검토 (Self-Review)
### 긍정 사항
- 기존 P1-7a/`DocumentEditor.tsx`의 확립된 패턴(아이콘 재사용, `TableToolbarButton`, "문서 삭제" Modal 구조)을 그대로 따라 새로운 UI 관용구를 만들지 않았다.
- `deleteTable()`은 표 안 어디서든 항상 가능한 커맨드라(행/열 삭제처럼 "마지막 하나 남았을 때" 같은 경계 조건이 없음) `canDeleteTable`이 사실상 항상 `true`이지만, 다른 버튼들과 동일한 방식(`can()` 기반 활성/비활성)으로 통일해 코드 일관성을 유지했다.
- 다중 표 시나리오(문서에 표가 여러 개일 때 커서가 있는 표만 삭제됨)까지 회귀 테스트로 고정했다 — P1-7a가 세운 "표마다 독립된 NodeView" 설계가 삭제에도 그대로 적용됨을 확인.

### 주의사항
- `TrashIcon`이 이제 행 삭제·열 삭제·표 삭제 세 곳에서 재사용된다 — 시각적으로 구분은 "어느 그룹(위치)에 있는가"와 툴팁 텍스트뿐이므로, 향후 표 삭제 전용 아이콘이 필요하다는 피드백이 나올 수 있다(현재는 기존 선례를 따름).

### 우려사항
- AX Auth 로그인 제약으로 이 세션에서 실제 화면(브라우저)으로 "표 삭제 버튼 클릭 → Modal → 실제 삭제"까지 육안 확인은 하지 못했다 — P1-7a/b/c 등 기존 항목들과 동일한 제약이다. 자동화 테스트(happy-dom 기반)로 Modal 노출·취소·삭제·`onChange` 반영·다중 표 시나리오를 모두 검증했다. 실제 화면에서의 최종 확인은 여전히 요청 중이다.
