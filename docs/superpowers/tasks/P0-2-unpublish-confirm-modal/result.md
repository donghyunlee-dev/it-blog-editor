# P0-2: 게시취소 확인 모달 — 구현 결과 보고서

## 구현 내용
- `PublishForm.tsx`의 `handlePublishedChange`를 분기했다: `next === false && isPublished === true`(이미 게시된 문서를 끄려는 시도)면 `setUnpublishConfirmOpen(true)`만 하고 즉시 반환한다 — `setIsPublished`/`persist`를 호출하지 않으므로 `Switch`는 확인 전까지 계속 켜진 상태로 보인다.
- `confirmUnpublish()`가 확인 후에 실제로 `setIsPublished(false)` + `persist(...)`를 실행한다. `cancelUnpublish()`는 Modal만 닫는다.
- 게시 시작(끄기가 아니라 켜기)과 뷰어별 노출 토글, slug/메타 설명 blur 저장은 기존 그대로 즉시 저장된다 — 확인 대상이 아니다.
- 확인 `Modal`(제목 "게시 취소", "취소"(secondary)/"게시 취소"(danger) 버튼)을 `PublishForm` 안에 추가했다. `PublishForm`은 이미 `DocumentEditor.tsx`의 게시 설정 `Modal` 안에서 렌더링되므로 이는 중첩된 두 번째 Modal이다 — `@sfood/ui`의 `Modal` 구현(`node_modules/@sfood/ui/dist/index.js`)을 직접 읽어 포털을 쓰지 않고 `fixed inset-0`로 그린다는 것과, `position: fixed`가 `relative` 조상(바깥 Modal의 다이얼로그 박스)에 갇히지 않아 뷰포트 전체를 정상적으로 덮는다는 것을 확인한 뒤 진행했다.

## 파일 변경 내역
| 파일 | 변경 사항 |
|------|---------|
| `src/components/editor/PublishForm.tsx` | 게시취소 확인 분기 + 확인 Modal 추가 |
| `src/components/editor/PublishForm.test.tsx` | 신규 테스트 3개, 기존 "저장 실패" 테스트에 확인 클릭 단계 추가 |

## 자체 검토 (Self-Review)

### 긍정 사항
- TDD로 진행했다 — 테스트 3개를 먼저 추가해 실패(red)를 확인한 뒤 구현했다.
- 기존 "저장 실패" 테스트가 이미 "게시된 문서의 게시함 스위치를 끄는" 시나리오였는데, 내 변경으로 이 테스트가 자동으로 실패해 회귀를 즉시 잡아냈다 — 확인 클릭 단계를 추가해 고쳤다.
- 게시 시작은 확인 절차 없이 그대로 즉시 저장됨을 별도 테스트로 명시적으로 확인해뒀다(범위를 잘못 넓히지 않았다는 증거).

### 주의사항
- `@sfood/ui`의 `Modal`은 열려 있는 동안 `document`에 `keydown`(Escape) 리스너를 각자 등록한다. 두 Modal이 동시에 열려 있는 상태(게시 설정 Modal + 게시취소 확인 Modal)에서 Esc를 누르면 둘 다 닫힐 수 있다 — 라이브러리 내부 동작이라 이 프로젝트에서 고칠 수 없고, 최악의 경우도 "문서 편집 화면으로 돌아감"(데이터 손실이나 의도치 않은 게시취소 아님)이라 P0-2의 범위에서 막을 필요는 없다고 판단했다.

### 우려사항
- 없음.
