# P19-6: 이력 복원 — 검증 기록

## 자동화 테스트
| 커맨드 | 결과 |
|---|---|
| `npx vitest run src/lib/editor/documents.test.ts src/components/editor/VersionHistoryPage.test.tsx src/lib/editor/storage-to-tiptap.test.tsx src/components/editor/RichTextEditor.test.tsx` | 통과 (160 tests) |
| `npx eslint <바뀐 파일들>` | 통과(경고/오류 없음) |
| `npm run build` | 통과 — 라우트 목록에 `ƒ /api/editor/documents/[pageId]/versions/[version]/content` 확인됨 |

## 수동 검증
1. **합성 라운드트립**: `tiptap-to-storage.ts`로 만든 storage HTML을
   `storageHtmlToTiptapDoc`로 되돌려 문단·제목·목록·인용구·구분선·서식(굵게/링크)·코드
   블록·표·이미지·패널·문서 링크(텍스트 폴백)까지 노드 타입별로 확인 —
   `storage-to-tiptap.test.tsx` 참고.
2. **실제 문서로 재검증(2026-09-18)**: 실제 Confluence 인스턴스의 버전 57개짜리 실제
   문서(`233439235`, 표·코드블록·강조박스 3종·이미지 여러 장·링크·문서 링크 카드 포함)의
   진짜 storage HTML을 가져와 `storageHtmlToTiptapDoc`로 변환해봤다.
   - **1차 시도에서 버그 발견**: 강조 박스(패널) 3개가 전부 일반 문단으로 깨지고,
     이미지도 인식되지 않았다. 원인은 실제 Confluence가 `<ac:image>`의
     `<ri:attachment>`에 `ri:version-at-save="1"`을, `<ac:structured-macro>`에
     `ac:schema-version="1" ac:macro-id="..."`를 추가로 붙이는데(이 앱은 절대 만들지
     않는 속성), 전처리 정규식이 그 형태를 가정하지 못해서였다.
   - **조치**: 정규식을 태그 끝까지 관대하게(`[^>]*`) 고쳤다.
   - **재검증**: 같은 실제 문서로 다시 변환 — 강조 박스 3개(`panelType: info/warning/note`,
     아이콘까지)와 이미지 4장(`filename`, `/api/editor/documents/233439235/images/...`
     경로로 정상 복원, 한글 파일명도 `encodeURIComponent`로 정상 인코딩) 모두 정확히
     복원됨을 확인했다. 표·헤딩·목록·인용구·링크(속성 포함)·코드 블록(내용은 보존,
     언어만 유실 — 알려진 한계)·문서 링크 카드(텍스트 폴백, 알려진 한계)도 전부 기대한
     대로였다.
3. **실제 API로 확인한 사실**: 편집 원본(`sourceDocument` property)에 `?version=N`을
   붙여 조회해도 항상 현재 값만 돌아옴을 확인 — property는 과거 버전을 보관하지 않는다
   (제목을 복원 대상에서 뺀 근거).

## 발견된 문제와 조치
- **원인**: 실제 Confluence가 `ac:image`/`ac:structured-macro`에 이 앱이 만들지 않는
  추가 속성을 붙이는데, storage HTML 전처리 정규식이 "속성 없이 바로 닫힌다"고
  가정해 실제 문서를 인식하지 못했다.
- **조치**: `storage-to-tiptap.ts`의 세 정규식을 `[^>]*`로 태그 끝까지 관대하게 고쳤다.
- **재검증 결과**: 위 "수동 검증" 2번 — 실제 문서로 패널·이미지 정상 복원 확인, 발견된
  형태 그대로 회귀 테스트(`storage-to-tiptap.test.tsx`) 추가해 자동화에도 반영.

## 검증 중 새로 발견한 결정 사항
없음 — "제목 복원 불가"·"이미지 크기 유실"은 새로운 제품 결정이 필요한 사안이 아니라
기존 데이터 모델의 사실 확인이라 별도 GitHub Issue 없이 `task.md`/`result.md`에 근거와
함께 기록했다.

## 최종 판정
- [x] 수용 기준(`task.md`)을 모두 만족함 — PRD 갱신 가능
