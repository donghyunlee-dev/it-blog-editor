# P19-6: 이력 복원 — 구현 결과

## 구현 내용
- `src/lib/editor/documents.ts`: `getVersionContent(pageId, versionNumber)` 추가 —
  `getVersionDiff`와 같은 현재/과거 버전 판단 로직으로 특정 버전의 storage HTML을 반환.
- 신규 API: `GET /api/editor/documents/{pageId}/versions/{version}/content` — 읽기 전용.
- `RichTextEditor.tsx`의 커스텀 확장(`AttachmentImage`/`Panel`/`DocumentLink`/
  `TableWithToolbar`/`CodeBlockWithLanguagePicker`/`LinkWithOpenHint`)을 `export`해
  복원 변환기가 재사용하도록 함 — 에디터와 다른 스키마로 파싱되는 걸 막는다.
- `src/lib/editor/storage-to-tiptap.ts` 신규:
  - `preprocessConfluenceStorageHtml`: `<ac:image>`/`<ac:structured-macro>` 매크로를
    각 확장의 `parseHTML`이 인식하는 평범한 HTML(`<img>`, `<div data-panel-type>`)로
    치환. 실제 Confluence가 붙이는 추가 속성(`ri:version-at-save`,
    `ac:schema-version`, `ac:macro-id`)도 관대하게 처리한다(아래 "발견된 문제" 참고).
  - `storageHtmlToTiptapDoc`: 전처리 후 `@tiptap/core`의 `generateJSON` 호출.
- `VersionHistoryPage.tsx`: 현재 버전이 아닌 각 행에 "복원" 버튼 추가. 클릭 시 확인
  `Modal`(비파괴적 저장·문서 링크 카드 한계 안내 포함) → 확인하면 (1) 내용 API 조회
  (2) `storageHtmlToTiptapDoc`로 변환 (3) 기존 `PUT /api/editor/documents/{pageId}`로
  저장(현재 제목·버전 그대로, `page.tsx`가 `getDocumentDetail`로 함께 내려줌) (4) 성공
  시 `Toast` + `/editor/{pageId}`로 이동.

## 파일 변경 내역
| 파일 | 변경 사항 |
|------|---------|
| `src/lib/editor/documents.ts` | `getVersionContent` 추가 |
| `src/app/api/editor/documents/[pageId]/versions/[version]/content/route.ts` | 신규 |
| `src/components/editor/RichTextEditor.tsx` | 커스텀 확장 6개 `export` |
| `src/lib/editor/storage-to-tiptap.ts` | 신규 — 역변환 인프라 |
| `src/lib/editor/storage-to-tiptap.test.tsx` | 신규 — 라운드트립 + 실제 문서 회귀 테스트 |
| `src/app/editor/history/[pageId]/page.tsx` | `getDocumentDetail`로 현재 제목·버전 전달 |
| `src/components/editor/VersionHistoryPage.tsx` | 복원 버튼·Modal·흐름 추가 |
| `src/lib/editor/documents.test.ts`, `src/components/editor/VersionHistoryPage.test.tsx` | 신규 테스트 |

## 커밋 내역
| SHA | 메시지 |
|-----|--------|
| `507fad8` | feat: 문서 이력에서 특정 버전으로 복원(되돌리기) (P19-6) |

## 자체 검토 (Self-Review)
### 긍정 사항
- 합성(라운드트립) 테스트만으로 끝내지 않고 실제 Confluence 인스턴스의 진짜 문서
  (233439235)로 변환 결과를 직접 확인하다가, 합성 테스트로는 절대 못 잡았을 버그
  (실제 Confluence가 덧붙이는 추가 속성 때문에 패널·이미지 인식 실패)를 발견해 고쳤다
  — 이 버그를 그대로 뒀다면 실사용 중 강조 박스·이미지가 있는 문서를 복원할 때마다
  조용히 내용이 깨졌을 것이다.
- 새 쓰기 API를 만들지 않고 기존 저장 경로를 재사용해, 낙관적 동시성 검사·버전 코멘트
  (P19-4) 등 이미 검증된 로직을 다시 구현하는 위험을 피했다.
- 조사 단계에서 "제목도 복원되나?"를 검증 없이 넘기지 않고 실제 API로 재확인해,
  불가능한 걸 task.md에 반영하고 범위를 정정했다.

### 주의사항
- 이미지 크기 조절(P18-2, `width`/`height`)은 애초에 storage HTML에 저장되지 않는
  속성이라(`tiptap-to-storage.ts`의 image 직렬화 확인 — width/height를 아예 내보내지
  않음), 복원된 이미지·문서 링크 카드는 항상 기본 크기로 돌아온다. 이건 복원이
  새로 만든 손실이 아니라 storage 형식 자체가 원래도 이 정보를 안 담고 있었다는
  뜻이다(평소엔 `sourceDocument`가 항상 최신값을 담고 있어 이 손실이 보이지
  않았을 뿐). 사용자에게 별도로 알리지는 않았다 — "문서 링크 카드는 텍스트로만"
  안내와 비교하면 훨씬 사소한 차이(카드/이미지 자체는 정상 복원되고 크기만
  기본값)라고 판단했다.
- `storage-to-tiptap.ts`가 `RichTextEditor.tsx`(에디터 전체 구현)를 import해, 이력
  페이지의 클라이언트 번들에 에디터 관련 코드가 함께 포함된다. 이력 페이지는 트래픽이
  낮은 화면이라 지금은 문제 삼지 않았다.

### 우려사항
- 없음.
