# P7-4: 사이드바 폴더 트리 UI — 구현 결과 보고서

## 구현 내용
- **`editor/layout.tsx`**: `listFolders(folder.accountFolderId)`를 기존 `Promise.all`(문서 목록·공유 문서 목록)에 함께 추가해 `EditorShell`에 `folders`로 전달한다.
- **`EditorShell.tsx`**: `EditorShellProps`에 `folders?: FolderNode[]`를 추가하고 `EditorSidebar`에 그대로 넘긴다.
- **`EditorSidebar.tsx`**:
  - `expandedFolders` 상태(`Record<folderId, boolean>`)를 `localStorage`(`sfood-editor-folder-tree-expanded`)에 저장한다 — `EditorShell.tsx`의 사이드바 폭/접힘 상태와 같은 `try/catch` + 마운트 후 `useEffect` 동기화 패턴(2-pass, hydration mismatch 없음). 저장된 값이 없는 폴더는 기본 펼침으로 취급한다.
  - `childrenByParent`(폴더를 `parentId` 기준으로 묶고 `order`로 정렬한 맵)와 `documentsByFolder`(필터링된 문서를 `folderId` 기준으로 묶은 맵)를 계산한다.
  - 기존 문서 링크 행 렌더링을 `renderDocumentRow(document, depth)`로 추출해 들여쓰기(`depth * 14px`)를 매개변수화했다 — 미분류 목록과 폴더 안 목록이 공유한다.
  - 재귀 함수 `renderFolderNode(folder, depth)`를 추가했다 — 펼침 토글 버튼(`ChevronIcon`+`FolderIcon`, `@sfood/ui`가 대응 아이콘을 제공하지 않아 기존 `StatusIcon` 스타일로 직접 그림) + 펼쳐졌을 때 하위 폴더·문서를 재귀 렌더링한다.
  - `unclassifiedDocuments = filteredDocuments.filter(folderId === null)`로 기존 페이지네이션("더 보기")을 이 목록에만 적용한다 — 폴더 안 문서는 이번 범위에서 페이지네이션하지 않는다.
  - **회귀 안전성의 핵심**: 폴더가 없는 계정은 `folders`가 항상 빈 배열이고, `unclassifiedDocuments`는 `filteredDocuments`와 완전히 같아진다(P7-3이 존재하는 폴더로만 `folderId` 배정을 검증하므로 폴더가 없으면 모든 문서의 `folderId`가 `null`) — 즉 기존 30건의 테스트가 코드 변경 없이 그대로 통과한다.

## 파일 변경 내역
| 파일 | 변경 사항 |
|------|---------|
| `src/app/editor/layout.tsx` | `listFolders` 조회 추가, `EditorShell`에 `folders` 전달 |
| `src/components/editor/EditorShell.tsx` | `folders` prop 추가·전달 |
| `src/components/editor/EditorSidebar.tsx` | 폴더 트리 렌더링(펼침/접힘, 재귀, 미분류 분리) 추가 |
| `src/components/editor/EditorSidebar.test.tsx` | "폴더 트리(P7-4)" describe 블록 5건 추가 |
| `docs/product/prd.md` | P7-4 완료 표시, 진행률 갱신, P2-6/P2-7 중복 발견 메모 추가 |

## 커밋 내역
| SHA | 메시지 |
|-----|--------|
| (아래 test.md 검증 통과 후 커밋 예정) | |

## 자체 검토 (Self-Review)
### 긍정 사항
- 폴더 없는 계정에서 완전한 회귀 안전성을 구조적으로 보장했다 — `unclassifiedDocuments`가 `folderId === null` 필터링으로 정의되어, 폴더가 없으면 수학적으로 `filteredDocuments`와 항상 같아진다(테스트가 아니라 데이터 모델의 불변식으로 보장).
- 기존 문서 행 렌더링을 별도 함수로 추출해 미분류 목록과 폴더 안 목록이 완전히 같은 마크업·스타일을 공유하게 했다 — 두 곳에 로직을 복붙하지 않았다.
- 페이지네이션 범위(미분류만), 빈 폴더 안내(P7-8), 키보드 트리 탐색(P7-10) 등 이번에 다루지 않는 부분을 task.md에 명시적으로 근거와 함께 남겨, 다음 항목 착수 시 "왜 지금은 안 했는지"를 다시 설명할 필요가 없게 했다.

### 주의사항
- 작업 도중 PRD에서 새로운 문제를 발견했다 — 다른 세션이 등록한 P2-6(인용구·구분선·밑줄·인라인 코드·제목3)이 이미 완료된 P2-7(인라인 코드)과 부분적으로 겹친다. 이번 작업(P7-4)과는 파일이 겹치지 않아 직접 손대지 않고 PRD에 메모만 남겼다 — 다음 작업 착수 전에 사용자 확인을 거쳐 정리해야 한다.

### 우려사항
- AX Auth 로그인 제약으로 실제 브라우저 확인은 하지 못했다(기존 항목들과 동일한 제약). 자동화 테스트(happy-dom)로 렌더링·펼침/접힘·들여쓰기·localStorage 저장을 확인했지만, 실제 시각적 결과(아이콘 정렬, 들여쓰기 간격의 실제 느낌 등)는 미확인이다.
