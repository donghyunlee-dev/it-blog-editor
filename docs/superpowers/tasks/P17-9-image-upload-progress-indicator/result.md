# P17-9: 이미지 업로드 진행 상태 표시 — 결과

## 커밋
- `94e263d` feat: 이미지 업로드 중 진행 상태(스피너 자리표시자) 표시 (P17-9)

## 변경 파일
- `src/components/editor/RichTextEditor.tsx`
  - `AttachmentImage`에 `uploadId`/`uploading`(둘 다 `rendered: false`) attrs를 추가하고
    `addNodeView()`로 `ImageView`를 연결했다. `ImageView`는 `uploading`이 true면
    `@sfood/ui`의 `Spinner` + "{파일명} 업로드 중…" 문구를, 아니면 기존과 동일한 `<img>`를
    렌더링한다.
  - `insertUploadedImage`(업로드 완료 후에만 노드를 삽입)를 제거하고
    `insertUploadPlaceholder`/`findUploadPlaceholder`/`resolveUploadPlaceholder`/
    `removeUploadPlaceholder` 4개 함수로 대체했다 — 업로드 시작과 동시에 자리표시자를
    심고, 완료 시점에 `uploadId`로 현재 문서를 다시 스캔해 해당 노드를 찾아 갱신/삭제한다
    (transaction mapping으로 위치를 추적하지 않아, 그 사이 다른 편집이 있어도 안전하고,
    사용자가 업로드 중 자리표시자를 직접 지워도 조용히 무시된다).
  - `handleDrop`/`handlePaste`/`createImageSlashItem.run()` 세 경로 모두 "업로드 완료 후
    삽입"에서 "자리표시자 즉시 삽입 → 성공 시 해소 / 실패 시 제거"로 바꿨다.
  - `ImageBubbleMenu`의 `isImageActive` 판정에 `!uploading` 조건을 추가해, 업로드 중인
    자리표시자에는 alt 텍스트 편집 버블이 뜨지 않게 했다.
  - `<img>`가 이제 TipTap의 `renderHTML`이 아니라 React NodeView(JSX)로 렌더링되면서
    `@next/next/no-img-element` 린트 경고가 새로 나타나(Confluence 첨부 URL은 사전에
    알 수 없는 임의 호스트라 next/image 대상이 될 수 없음), 이유를 남기고
    `eslint-disable-next-line`으로 억제했다.
- `src/components/editor/RichTextEditor.test.tsx`
  - `docWithImages()` 헬퍼가 image(block-group) 노드를 paragraph(inline만 허용) 안에
    중첩해 스키마를 위반하던 기존 버그를 발견해 수정했다(image를 doc의 최상위 블록으로).
  - 업로드 진행 상태 표시(성공 경로: 자리표시자 → 실제 이미지, 실패 경로: 자리표시자 →
    에러 토스트)를 검증하는 새 describe 블록을 추가했다.
- `docs/product/prd.md` — Phase 17에 P17-9 항목 추가 및 완료 표시(사용자가 원래
  Phase 17 목록에 없던 항목을 추가 요청한 경위 기록).

## 자체 검토
- **긍정**: 업로드 시작~완료 사이의 무반응 구간을 "가장 보편적인" 패턴(로컬 자리표시자 →
  결과로 치환)으로 메웠고, `@sfood/ui`의 `Spinner`를 그대로 재사용해 디자인 시스템
  우선순위 규칙을 지켰다. `uploadId` 기반 재탐색 방식이 transaction mapping보다 훨씬
  단순하면서도 동시 편집·자리표시자 삭제 같은 예외 상황에 자연스럽게 안전하다.
- **주의사항**: `uploading`/`uploadId`는 `rendered: false`라 HTML 파싱/직렬화나
  Confluence storage 변환에 노출되지 않는다 — 다만 업로드가 끝나기 전에 사용자가 저장을
  누르는 극단적인 경우, `tiptap-to-storage.ts`의 image 케이스는 `filename`/`src`가 아직
  비어 있으므로 빈 문자열(`""`)을 반환해 그 이미지는 조용히 저장에서 빠진다(에러는 아니지만
  이미지가 안 보이게 됨) — task.md "범위 밖"에 남긴 기존 한계와 같은 종류의 엣지 케이스라
  이번 범위에서 추가로 막지 않았다.
- **우려사항**: 없음 — 기존 이미지 업로드 성공/실패 경로, alt 텍스트 편집, 이미지 개수
  상한 테스트 모두 회귀 없이 통과했다(테스트로 확인).

## 산출물
- `docs/superpowers/tasks/P17-9-image-upload-progress-indicator/{task,plan,result,test}.md`
- `src/components/editor/RichTextEditor.tsx`, `RichTextEditor.test.tsx`
- `docs/product/prd.md`
