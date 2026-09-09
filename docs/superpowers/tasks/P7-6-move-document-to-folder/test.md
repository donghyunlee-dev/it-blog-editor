# P7-6: 문서를 폴더로 이동하는 UI — 검증

## 자동화 테스트
- `npx vitest run src/components/editor/MoveDocumentModal.test.tsx` — 6개 전부 통과.
- `npx vitest run src/components/editor/EditorSidebar.test.tsx` — 48개 전부 통과(기존 41개 + 신규 P7-6 7개).
- `npm test` — 61개 파일, 601개 테스트 전부 통과.
- `npm run lint` — 0 errors, 2 warnings(`postcss.config.js`/`tailwind.config.js`의 `import/no-anonymous-default-export` — 이 작업과 무관한 기존 경고).
- `npm run build` — Turbopack 프로덕션 빌드 성공, TypeScript 통과, 19개 라우트 정상 생성(`/api/editor/documents/[pageId]/folder` 포함, P7-3에서 이미 존재).

## 문제 → 조치 → 재검증
1. **원인**: 처음 작성한 `flatFolderOptions`의 `useMemo` 의존성 배열에 `topLevelFolders`(그 자체가 `childrenByParent.get(null) ?? []`로 매 렌더 새로 계산되는 로컬 변수)를 넣어, `react-hooks/exhaustive-deps`가 "매 렌더 바뀔 수 있는 의존성" 경고를 냈다.
   **조치**: `topLevelFolders` 변수를 참조하는 대신 `useMemo` 안에서 직접 `childrenByParent.get(null) ?? []`를 계산해, 의존성을 `childrenByParent`(진짜 메모된 값) 하나로 좁혔다.
   **재검증**: `npm run lint` 재실행 → 이 파일 관련 경고 사라짐(위 2건만 남음).
2. **원인**: 새 P7-6 테스트에서 `screen.getByRole("combobox")`가 "여러 요소 매치"로 실패했다 — 사이드바가 항상 렌더링하는 정렬용 `<Select>`(문서 정렬)와 `MoveDocumentModal`의 대상 폴더 `<Select>`가 둘 다 `role="combobox"`였다.
   **조치**: `within(screen.getByRole("dialog"))`로 모달 내부로 쿼리 범위를 좁혔다(`@sfood/ui`의 `Modal`이 런타임에서 `role="dialog"`를 렌더링하는 것을 `node_modules/@sfood/ui/dist/index.js` 확인 후 적용).
   **재검증**: 해당 테스트 통과.
3. **원인**: 하위 폴더 옵션의 들여쓰기(전각 공백 "　", U+3000)를 `getByText(/^　하위$/)`로 검증했더니 "요소를 찾을 수 없음" 실패 — testing-library의 기본 텍스트 정규화(`trim()` + 공백 collapse)가 U+3000을 공백으로 취급해 지워버린다(정규화 후 실제 옵션 텍스트가 "하위"가 되어 앵커(`^`) 위치가 어긋남).
   **조치**: `getByText("　하위", { normalizer: (text) => text })`로 정규화를 끄고 원문 그대로 비교하도록 두 테스트 파일(`EditorSidebar.test.tsx`, `MoveDocumentModal.test.tsx`) 모두 수정했다.
   **재검증**: 두 테스트 모두 통과.
4. **원인**: 새로 추가한 P7-6 describe 블록의 두 번째 테스트("미분류로 되돌리면...")가 전체 스위트 실행 시에만 간헐적으로 실패했다(단독 실행 시엔 통과) — jsdom의 `localStorage`가 같은 테스트 파일 안 모든 describe 블록에서 공유되는데, 앞선 P7-4 describe 블록의 "접힘 상태 유지" 테스트가 `f1` 폴더를 접힌 상태로 남겨, 그 자식 문서(`DOC_IN_FOLDER`, `folderId: "f1"`)가 화면에 아예 렌더링되지 않았다.
   **조치**: P7-4 describe 블록이 이미 쓰던 것과 동일하게, P7-6 describe 블록의 `beforeEach`에도 `window.localStorage.clear()`를 추가했다.
   **재검증**: `npm test`(전체 스위트) 재실행 → 601개 전부 통과.

## 수동 검증
- AX Auth 로그인 제약으로 이 세션에서는 실제 브라우저로 열어 확인할 수 없었다(PRD의 기존 항목들과 동일한 한계). 자동화 테스트로만 검증했다.

## 새로운 결정 사항
없음.
