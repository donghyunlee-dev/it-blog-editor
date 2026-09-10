# P7-8: 빈 폴더 상태 UI — 결과

## 커밋
- `9248e91` feat: 빈 폴더에 안내 문구 표시 (P7-8)

## 변경 파일
- `src/components/editor/EditorSidebar.tsx`:
  - `folderIdsWithDocuments`(원본 `documents` prop 기준으로, 폴더가 배정된 문서들의 `folderId` 집합) 추가 — 검색/태그 필터가 적용된 `filteredDocuments`/`documentsByFolder`와 별개로, "이 폴더가 실제로 문서를 가진 적 있는지"만 순수하게 판단하는 용도다.
  - `renderFolderNode`에서 `isReallyEmpty = childFolders.length === 0 && !folderIdsWithDocuments.has(folder.id)`를 계산하고, `isExpanded && isReallyEmpty`일 때 기존 자식 `<ul>`과 나란히 `EmptyState`(제목 "이 폴더에는 아직 문서가 없습니다.")를 깊이에 맞춰 들여쓴 `<div>` 안에 렌더링한다.
- `src/components/editor/EditorSidebar.test.tsx` — 신규 describe 블록 `"EditorSidebar 빈 폴더 안내(P7-8)"`(5개 테스트): 진짜 빈 폴더/하위 폴더만 있는 폴더/문서 있는 폴더/검색으로 문서만 가려진 폴더/접힌 빈 폴더.

## 자체 검토
- **긍정**: 새 컴포넌트·새 API 없이 기존 `EmptyState`와 P7-4가 이미 만든 `documents`/`childrenByParent` 구조를 조합만 해서 끝났다. "필터로 가려짐"과 "진짜 비어 있음"을 구분하는 로직 덕분에, 검색 중에도 실제 내용이 있는 폴더에 잘못된 안내가 뜨지 않는다(테스트로 고정).
- **주의사항**: `EmptyState`(`@sfood/ui`)는 `py-12`(48px 상하 패딩)로 최상위 빈 상태를 염두에 두고 만들어진 컴포넌트라, 깊이 들여쓰기된 트리 안에서는 다소 넉넉한 여백으로 보일 수 있다 — 원문 수용 기준이 "기존 EmptyState 패턴 재사용"을 명시해 커스텀 축소 버전을 만들지 않고 그대로 썼다.
- **우려사항**: AX Auth 로그인 제약으로 이 세션에서는 실제 브라우저로 시각적 확인(패딩·여백이 실제로 어색하지 않은지)을 하지 못했다(PRD의 기존 항목들과 동일한 한계). 자동화 테스트로만 검증했다.

## 산출물
- `docs/superpowers/tasks/P7-8-empty-folder-state/{task,plan,result,test}.md`
