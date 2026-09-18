# P19-6: 이력 복원 — 구현 계획

## Global Constraints
- 새 쓰기 경로를 직접 만들지 않는다 — 변환된 TipTap JSON을 기존
  `PUT /api/editor/documents/{pageId}`(→ `updateDocument`)로 보내, 낙관적 동시성 검사·
  버전 코멘트(P19-4)·`sourceDocument` 갱신을 그대로 재사용한다.
- `generateJSON`은 브라우저 `DOMParser`가 필요해 변환은 클라이언트에서만 수행한다.
- 확인 없는 즉시 실행 금지 — `Modal`로 확인받는다(CLAUDE.md UI 규칙).

## Files
- Modify: `src/lib/editor/documents.ts` — `getVersionContent(pageId, versionNumber)` 추가
  (현재/과거 버전 판단은 `getVersionDiff`와 같은 로직 재사용).
- Create: `src/app/api/editor/documents/[pageId]/versions/[version]/content/route.ts` — GET,
  `requireDocumentAccess` 후 `getVersionContent` 반환(읽기 전용).
- Modify: `src/components/editor/RichTextEditor.tsx` — 복원 변환기가 재사용할 커스텀 확장
  (`AttachmentImage`/`Panel`/`DocumentLink`/`TableWithToolbar`/`CodeBlockWithLanguagePicker`/
  `LinkWithOpenHint`)을 `export`.
- Create: `src/lib/editor/storage-to-tiptap.ts` — Confluence 매크로(`ac:image`,
  `ac:structured-macro`) 전처리 + `generateJSON` 래퍼(`storageHtmlToTiptapDoc`).
- Create: `src/lib/editor/storage-to-tiptap.test.tsx` — `.tsx`(happy-dom 환경, `DOMParser`
  필요) 라운드트립 테스트.
- Modify: `src/app/editor/history/[pageId]/page.tsx` — `getDocumentDetail`로 현재 제목·버전도
  함께 조회해 `VersionHistoryPage`에 전달.
- Modify: `src/components/editor/VersionHistoryPage.tsx` — "복원" 버튼(현재 버전 제외) +
  확인 Modal + 복원 흐름(내용 조회 → 변환 → 기존 저장 API 호출 → 성공 시 `/editor/{pageId}`로
  이동).
- Modify: `src/lib/editor/documents.test.ts`, `src/components/editor/VersionHistoryPage.test.tsx`
  — 신규 테스트.

## Steps
- [x] **Step 1**: `getVersionContent` + API 라우트 작성.
- [x] **Step 2**: 필요한 커스텀 확장 `export`, `storage-to-tiptap.ts` 작성(매크로 전처리 +
      `generateJSON`).
- [x] **Step 3**: 합성 데이터로 라운드트립 테스트 작성·통과 확인.
- [x] **Step 4**: 실제 Confluence 인스턴스의 진짜 HTML로 별도 검증 — 실제 문서에만 있는
      추가 속성(`ri:version-at-save`, `ac:schema-version`, `ac:macro-id`) 때문에 패널/이미지
      인식이 실패하는 버그 발견, 정규식 수정 후 재검증. 발견된 형태 그대로 회귀 테스트 추가.
- [x] **Step 5**: `VersionHistoryPage.tsx`에 복원 UI(Modal, 버튼, 흐름) 추가, `page.tsx`에서
      현재 제목·버전 전달.
- [x] **Step 6**: 관련 테스트 작성/보강, `npx vitest run <바뀐 파일들>`.
- [x] **Step 7**: `npx eslint`, `npm run build`.
