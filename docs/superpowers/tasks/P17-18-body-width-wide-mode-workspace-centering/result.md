# P17-18: 본문 폭 확대 + Wide mode + 워크스페이스 중앙 정렬 — 구현 결과 보고서

## 구현 내용
- `DocumentEditor.tsx`: 본문 최대 폭을 830px→920px로 올리고, 헤더에 "넓게 보기"
  토글을 추가해 켜면 1200px까지 확장한다(문서 전체 토글, localStorage에 선택
  유지). 위치는 `wideMode` state + `WIDE_MODE_STORAGE_KEY`.
- `EditorShell.tsx`: 사이드바+본문+TOC 전체를 감싼 `workspaceRef` 컨테이너에
  `max-w-[1800px] mx-auto`를 씌워 워크스페이스 자체를 페이지 가운데로 보냈다.
  이 변경이 깨뜨리는 두 곳을 함께 고쳤다: 사이드바 폭 조절 드래그(워크스페이스
  왼쪽 끝 오프셋을 `clientX`에서 빼도록 수정), 접힌 사이드바를 펴는 버튼(`fixed`→
  `absolute`, 워크스페이스 기준으로 재배치).
- `VersionHistoryPage.tsx`/`DeletedDocumentsPage.tsx`: 같은 이유로 830px→920px로
  맞춰, 편집 화면과 오갈 때 폭이 갑자기 달라 보이지 않게 했다.

## 파일 변경 내역
| 파일 | 변경 사항 |
|------|---------|
| `src/components/editor/DocumentEditor.tsx` | 본문 폭 920/1200px 상수, `wideMode` state+localStorage 동기화, 헤더 토글 버튼, `WideModeIcon` 추가 |
| `src/components/editor/DocumentEditor.test.tsx` | 830px 단언을 920px로 갱신, Wide mode describe 블록(4개 테스트) 추가 |
| `src/components/editor/EditorShell.tsx` | `workspaceRef` + `max-w-[1800px] mx-auto` 래퍼 추가, 드래그 계산·접힘 버튼 포지셔닝 수정 |
| `src/components/editor/EditorShell.test.tsx` | 워크스페이스 오프셋 반영 드래그 회귀 테스트 추가 |
| `src/components/editor/VersionHistoryPage.tsx` | `max-w-[830px]` → `max-w-[920px]` |
| `src/components/editor/DeletedDocumentsPage.tsx` | `max-w-[830px]` → `max-w-[920px]` |
| `docs/product/prd.md` | P17-18 항목 추가 및 완료 표시 |

## 커밋 내역
| SHA | 메시지 |
|-----|--------|
| (커밋 예정 — 아래 산출물 참고) | feat: 본문 폭 확대 + Wide mode + 워크스페이스 중앙 정렬 (P17-18) |

## 자체 검토 (Self-Review)
### 긍정 사항
- 구조 변경(워크스페이스 중앙 정렬)이 기존 코드의 암묵적 가정("사이드바가 항상
  화면 왼쪽 끝")을 깬다는 것을 코드 주석에서 먼저 찾아내고(`handleMouseMove`,
  접힘 버튼), 방치하지 않고 두 곳 모두 함께 고쳤다 — 실제 브라우저에서 2200px
  뷰포트로 드래그를 재현해 오프셋(200px)이 정확히 반영됨을 확인했다.
- 이미 830px로 값을 맞춰 두고 있던 다른 화면(문서 이력, 삭제된 문서)까지 함께
  920px로 올려, 이번 변경이 새로운 폭 불일치를 만들지 않게 했다.
- 값 결정을 추측하지 않고 GitHub Issue #161로 먼저 확인한 뒤 구현했다.

### 주의사항
- 워크스페이스 전체 최대폭(1800px)은 GitHub Issue에서 직접 결정된 값이 아니라
  구현 중 직접 정한 값이다(사이드바 최대폭 440px + Wide mode 본문 1200px + TOC
  240px + 거터를 넉넉히 담는 값으로 계산) — WIDTH_STEP과 같은 선례를 따라 별도
  이슈 없이 정했다. 실제 사용 중 이 값이 너무 좁거나 넓게 느껴지면 조정이 필요할
  수 있다.
- 이 세션은 AX Auth 로그인 게이트 뒤의 실제 화면을 열 수 없어(P17-13 이후 반복된
  제약), `EditorShell` + `DocumentEditor`를 독립 라우트에서 직접 마운트해 검증했다.

### 우려사항
- 없음 — 관련 테스트(EditorShell 19개, DocumentEditor 46개, VersionHistoryPage/
  DeletedDocumentsPage 17개, TableOfContents 21개, EditorSidebar 78개 = 181개)
  모두 통과해 회귀 위험이 낮다.
