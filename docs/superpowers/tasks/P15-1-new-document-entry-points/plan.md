# P15-1: 새 문서 생성 진입점 개편 — 구현 계획

## Global Constraints
- 접근성 역할(`role="menu"`/`role="menuitem"`, `aria-haspopup`, `aria-expanded`)은 문서
  옵션 메뉴(P14)와 동일한 패턴을 폴더 메뉴에도 적용한다.
- 팝업은 `<nav>` 바깥(형제 위치)에 `position: fixed`로 그린다(P14-3 재발 방지) —
  `createPortal`은 쓰지 않는다.
- 문서/폴더 두 메뉴는 상태 모양을 공통 타입(`MenuTarget`)으로 묶어 `openMenu` 하나로
  관리한다 — open/닫기(바깥 클릭·Escape·스크롤) 로직 중복을 피한다.
- 기존 폴더 생성/이름변경/삭제 API·모달(`FolderFormModal`, `handleDeleteFolder`)은
  그대로 재사용한다 — 트리거 위치만 바뀐다.

## Files
- Modify: `src/components/editor/EditorSidebar.tsx`
- Modify: `src/components/editor/DocumentEditor.tsx` (create 모드에 folderId 전달)
- Modify: `src/app/editor/new/page.tsx` (searchParams.folder 읽기, folderPath 조회)
- Modify: `src/components/editor/EditorSidebar.test.tsx`
- Modify: `src/components/editor/DocumentEditor.test.tsx` (필요 시)
- Modify: `docs/product/design.md`, `docs/product/prd.md`

## Steps
- [x] **Step 1**: `openDocumentMenu` state를 `openMenu: { target: MenuTarget; anchorRect;
      triggerEl } | null`로 일반화한다. `MenuTarget = { kind: "document"; document } |
      { kind: "folder"; folder }`. 문서 트리거·팝업 렌더 쪽을 새 상태 모양에 맞게 고친다.
- [x] **Step 2**: 폴더 행의 액션 버튼 영역을 "+"(새 문서)와 "..."(옵션) 두 개로 바꾼다.
      "+"는 `Link href={"/editor/new?folder=" + folder.id}`(guardNavigate 포함)로,
      "..."는 `openMenu`를 `{ kind: "folder", folder }`로 세팅하는 트리거로 바꾼다.
- [x] **Step 3**: `buildFolderMenuItems(folder)` 함수를 추가한다 — "하위 폴더 추가"
      (`setFolderFormState({type:"create", parentId: folder.id})`), "이름 변경"
      (`setFolderFormState({type:"rename", ...})`), "삭제"(danger, `setDeleteFolderTarget`).
      `buildDocumentMenuItems`/`buildFolderMenuItems`를 감싸는 `buildMenuItems(target)`으로
      팝업 렌더 쪽에서 kind 분기해 호출한다.
- [x] **Step 4**: 사이드바 상단의 독립 "새 문서" `<div className="border-b ...">` 블록을
      제거하고, `<nav>` 안 콘텐츠 맨 끝(더 보기 버튼 다음)으로 옮긴다. `onNavigate`/
      `guardNavigate("/editor/new")`는 기존 그대로.
- [x] **Step 5**: `/editor/new/page.tsx`에 `searchParams: Promise<{ folder?: string }>`를
      받아 `folder` 쿼리를 읽고, 있으면 `findPersonalFolder` + `listFolders` +
      `buildFolderPath`로 `folderPath`를 조회해 `DocumentEditor`에 전달한다(패턴은
      `/editor/[pageId]/page.tsx`의 P7-7 로직과 동일).
- [x] **Step 6**: `DocumentEditor`에 `initialFolderId?: string | null` prop을 추가하고,
      `mode === "create"`의 POST body에 `folderId: initialFolderId ?? null`을 포함시킨다.
- [x] **Step 7**: `EditorSidebar.test.tsx`의 P7-5 폴더 액션 테스트(하위 폴더 추가/이름
      변경/삭제 직접 버튼 클릭)를 "폴더 옵션" 트리거 → menuitem 2단계 클릭으로 갱신한다
      (P14-2가 문서 쪽에서 했던 것과 동일한 패턴). "새 문서" 링크 위치 테스트(폴더 섹션
      "위"에 있다는 기존 단언)를 "맨 아래에 있다"로 갱신한다. 폴더 "+"가 새 문서로
      이동하는 테스트, 폴더 옵션 메뉴가 열리는 테스트를 추가한다.
- [x] **Step 8**: `npx vitest run EditorSidebar.test.tsx DocumentEditor.test.tsx`,
      `npx eslint <바뀐 파일>`, `npm run build`. 여러 파일에 걸친 변경이라 회귀 위험 판단
      후 필요하면 `npm test` 전체도 돌린다.
