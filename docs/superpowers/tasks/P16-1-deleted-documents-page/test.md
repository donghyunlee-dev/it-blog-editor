# P16-1: 삭제된 문서 전용 페이지 — 검증

## 자동화 테스트
- `npx vitest run src/lib/editor/documents.test.ts` — 63개 전부 통과(2개 신규/갱신 —
  삭제 시점 스냅샷 기록, 기본값 보정).
- `npx vitest run src/lib/editor/deleted-documents.test.ts` — 14개 전부 통과(3개 신규 —
  folderName 해석, 옛 항목 보정).
- `npx vitest run src/app/api/editor/documents/deleted/route.test.ts` — 2개 전부 통과
  (응답 타입에 새 필드 반영).
- `npx vitest run src/components/editor/DeletedDocumentsPage.test.tsx` — 7개 전부 통과
  (신규 파일 — 빈 상태, 상세 정보 표시, 검색 필터, 검색 결과 없음, 복구 성공/실패).
- `npx vitest run src/components/editor/EditorSidebar.test.tsx` — 75개 전부 통과(1개
  갱신 — "삭제된 문서" 트리거가 Link로 바뀐 것 반영).
- `npx eslint <바뀐 파일 전부>` — 0 errors.
- `npm run build` — Turbopack 프로덕션 빌드 성공, TypeScript 통과, `/editor/trash` 라우트
  포함 20개 라우트 정상 생성.
- **`npm test`(전체) — 63개 파일, 696개 테스트 전부 통과.** 문서 삭제 경로(`deleteDocument`)
  자체를 건드리는 변경(모든 문서 삭제 시 실행되는 공통 로직)이라, 다른 화면에 부작용이
  없는지 확인하기 위해 전체 스위트를 추가로 돌렸다.

## 수동/시각 검증
AX Auth 로그인 제약으로 이 세션에서는 실제 `/editor` 화면을 열어볼 수 없다(기존 항목들과
동일한 한계). 다음은 사용자 캡처로 확인이 필요하다:
- 문서를 실제로 삭제한 뒤 "삭제된 문서"를 눌러 `/editor/trash`로 이동하고, 게시 상태·태그·
  원래 폴더가 실제로 정확히 보이는지.
- 검색 입력으로 필터링이 매끄러운지, 복구 버튼이 실제로 사이드바 문서 목록에 즉시 반영
  되는지.
- 페이지 폭(`max-w-[830px]`)이 다른 `/editor/*` 화면과 시각적으로 잘 맞는지.

## 문제 → 조치 → 재검증
- `deleteDocument` 첫 번째 기존 테스트("작성자 계정 폴더의 deletedDocuments 속성에...")가
  `tags.getTags`를 스텁하지 않은 채 실행돼, 실제 `listLabels`(환경변수 미설정)로 떨어지며
  실패했다 → 조치: 해당 테스트에 `vi.spyOn(tags, "getTags")`와
  `publishMetadata`/`folderId` property 스텁을 추가하고, 기대값에 `tags`/`isPublished`/
  `folderId`를 포함시킴. 기본값 보정을 확인하는 테스트를 별도로 추가 → 재검증: 통과.
- `npm run build`의 TypeScript 단계에서
  `src/app/api/editor/documents/deleted/route.test.ts`가 `listDeletedDocuments`의 새
  반환 타입(`DeletedDocumentSummary`)과 맞지 않는 목(mock) 데이터를 쓰고 있어 실패 →
  조치: 목 데이터에 `tags`/`isPublished`/`folderId`/`folderName`을 채움 → 재검증:
  `npm run build` 재실행, TypeScript 통과.

## 새로운 결정 사항
없음 — task.md에서 이미 정리한 대로, 사용자가 페이지 레이아웃과 목적을 직접 지정했고
상세 정보 항목은 기존 `DocumentSummary`가 이미 보여주는 종류를 그대로 따랐다.
