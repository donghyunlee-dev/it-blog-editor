# P7-7: 문서 편집 화면 브레드크럼 — 검증

## 자동화 테스트
- `npx vitest run src/lib/editor/folders.test.ts` — 23개 전부 통과(`buildFolderPath` 4개 포함).
- `npx vitest run src/lib/editor/documents.test.ts` — `getDocumentDetail`의 `folderId` 반환 포함 전부 통과.
- `npx vitest run src/components/editor/DocumentEditor.test.tsx` — 38개 전부 통과(브레드크럼 4개 포함).
- `npx vitest run src/components/editor/EditorSidebar.test.tsx` — 51개 전부 통과(P7-7 도착 처리 3개 포함).
- `npx vitest run src/components/editor/EditorShell.test.tsx src/app/api/editor/documents/[pageId]/share/route.test.ts` — 기존 테스트 전부 통과(타입 변경에 따른 모킹/리터럴 갱신 확인).
- `npm test` — 61개 파일, 613개 테스트 전부 통과.
- `npm run lint` — 0 errors, 2 warnings(`postcss.config.js`/`tailwind.config.js`의 기존 경고, 이 작업과 무관).
- `npm run build` — Turbopack 프로덕션 빌드 성공, TypeScript 통과, 19개 라우트 정상 생성.

## 문제 → 조치 → 재검증
1. **원인**: `EditorSidebar.tsx`에 추가한 `?folder=` 도착 처리 effect가 `router`(useRouter() 반환값)를 의존성 배열에 포함했는데, `EditorSidebar.test.tsx`의 `next/navigation` 모킹이 `useRouter: () => ({ push, replace, refresh })`처럼 **호출마다 새 객체**를 반환하고 있었다. 실제 Next.js는 `useRouter()`를 `useMemo`로 감싸 항상 같은 참조를 주는데(`node_modules/next/dist/client/components/navigation.js`), 테스트 모킹만 이 계약을 어기고 있었던 것 — 렌더마다 `router` 참조가 바뀌어 effect가 매번 재실행되고, 그 안의 `setExpandedFolders` 호출이 새 객체를 만들어 매번 리렌더를 유발해 무한 루프가 됐다(`npx vitest run EditorSidebar.test.tsx`가 120초 타임아웃으로 백그라운드로 넘어감).
   **조치**: 실제 Next 소스를 확인해 프로덕션 코드(`EditorSidebar.tsx`)의 의존성 배열 자체는 정상이라고 판단하고, 대신 테스트 모킹을 고쳤다 — `push`/`replace`/`refresh`를 감싸는 `router` 객체를 `vi.hoisted`로 한 번만 생성해, `useRouter()`가 매 호출 항상 같은 참조를 돌려주도록 했다.
   **재검증**: `npx vitest run EditorSidebar.test.tsx` 재실행 → 51개 전부 15초 내 통과(타임아웃 없음).
2. **원인**: `?folder=ghost`(트리에 없는 폴더 id)로 도착 처리를 검증하는 테스트에서 "'하위' 폴더 버튼이 안 보인다"를 기대했는데 실패했다 — 기본값(로컬스토리지에 저장된 값이 없으면) 자체가 이미 "전부 펼침"이라, 이 테스트가 검증하려던 조건(오래된 링크를 조용히 무시)과 무관하게 애초에 항상 보이는 상태였다.
   **조치**: 어서션을 "폴더가 안 보인다"에서 "`router.replace`가 호출되지 않았다"(대상을 못 찾아 조기 반환했다는 것의 직접적인 증거)로 바꿨다. 별도 테스트에서는 두 폴더를 모두 접어둔 상태(localStorage에 `{f1:false, f2:false}` 저장)로 시작해, 도착 처리가 실제로 다시 펼치는지(펼침 이전엔 안 보이던 "하위" 버튼이 도착 후 보이는지)를 검증하도록 보강했다.
   **재검증**: 두 테스트 모두 통과.
3. **원인**: 새 `DocumentDetail.folderId` 필드를 추가하면서, `documents.test.ts`의 `getDocumentDetail` 테스트 하나(`toEqual`로 객체 전체를 비교)와 `share/route.test.ts`의 `getDocumentDetail` 모킹 리터럴이 이 필드 없이 그대로 남아 타입/값 불일치로 실패했다.
   **조치**: 두 곳 모두 `folderId: null`을 추가했다.
   **재검증**: 해당 테스트 파일 재실행 → 통과.
4. **원인**: `EditorShell.test.tsx`가 `next/navigation`을 `useRouter`/`usePathname`만 있는 전체 대역으로 교체하고 있었는데, `EditorSidebar.tsx`가 새로 `useSearchParams`를 호출하게 되면서 "mock에 useSearchParams export가 없다"는 에러로 전부 실패했다.
   **조치**: 그 모킹에 `useSearchParams: () => null`을 추가했다(라우터 컨텍스트 없는 실제 동작과 동일 — `usePathname`처럼 null을 반환할 뿐 던지지 않는다).
   **재검증**: `EditorShell.test.tsx` 12개 전부 통과.
5. **원인**: 실수로 세션 워크트리 특유의 무관한 변경(`.claude/launch.json`의 스테이지된 삭제, 이 작업 시작 전부터 있던 것)을 첫 커밋(`b414797`)에 함께 커밋해버렸다.
   **조치**: `git checkout origin/main -- .claude/launch.json`으로 파일을 복원해 새 커밋(`f2d5f79`)으로 되돌렸다 — 이미 만든 커밋을 다시 쓰지 않고(CLAUDE.md 규칙) 새 커밋으로 바로잡았다.
   **재검증**: `git diff origin/main -- .claude/launch.json`이 빈 출력 — 이 브랜치가 그 파일에 순수하게 아무 변경도 남기지 않았음을 확인했다.

## 수동 검증
- AX Auth 로그인 제약으로 이 세션에서는 실제 브라우저로 확인할 수 없었다(PRD의 기존 항목들과 동일한 한계). 자동화 테스트로만 검증했다.

## 새로운 결정 사항
없음.
