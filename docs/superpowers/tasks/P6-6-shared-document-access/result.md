# P6-6: 공유 문서 접근 권한 확장 — 구현 결과 보고서

## 구현 내용
- `src/lib/editor/documents.ts` — `requireDocumentOwner`(엄격하게 소유자만, 삭제 전용으로
  의미를 좁힘)와 새 `requireDocumentAccess`(소유자 또는 `sharingMeta.sharedWith` 포함 계정)로
  나눴다. 두 함수는 `isDocumentOwner` private 헬퍼를 공유해 "작성자 이메일과 같은가" 판단
  로직이 중복되지 않는다.
- "조회·수정"에 해당하는 6개 호출부를 `requireDocumentAccess`로 바꿨다: 문서 열람
  (`/editor/[pageId]`, `page.tsx`), 저장(`PUT`), 게시 설정(`PATCH .../publish`), 이미지 업로드
  (`POST .../images`), 버전 히스토리 조회(`GET .../versions`), 태그 설정(`PUT .../tags`).
- `DELETE /api/editor/documents/{pageId}`는 그대로 `requireDocumentOwner`를 써서 소유자만
  삭제할 수 있게 유지했다 — `task.md`에 근거를 남겼다(prd.md가 명시한 건 "조회·수정"뿐이고
  "재공유는 소유자만"이라는 문구가 있어, 삭제도 상식적으로 소유자 전용으로 남기는 게
  맞다고 판단했다. 명확히 결정된 사항은 아니라 필요하면 사용자가 나중에 바꿀 수 있다).

## 파일 변경 내역
| 파일 | 변경 사항 |
|------|---------|
| `src/lib/editor/documents.ts`, `.test.ts` | `requireDocumentAccess` 신설, `requireDocumentOwner` 의미 좁힘 |
| `src/app/editor/[pageId]/page.tsx` | `requireDocumentAccess`로 교체 |
| `src/app/api/editor/documents/[pageId]/route.ts`(PUT만), `.test.ts` | `requireDocumentAccess`로 교체(DELETE는 그대로) |
| `src/app/api/editor/documents/[pageId]/publish/route.ts`, `.test.ts` | `requireDocumentAccess`로 교체 |
| `src/app/api/editor/documents/[pageId]/images/route.ts`, `.test.ts` | `requireDocumentAccess`로 교체 |
| `src/app/api/editor/documents/[pageId]/versions/route.ts`, `.test.ts` | `requireDocumentAccess`로 교체 |
| `src/app/api/editor/documents/[pageId]/tags/route.ts`, `.test.ts` | `requireDocumentAccess`로 교체 |
| `docs/product/prd.md` | 체크리스트 P6-6 완료 표시, Phase 6 본편 항목 전부 완료로 정리 |

## 커밋 내역
| SHA | 메시지 |
|-----|--------|
| (PR에서 확인) | feat: 공유받은 문서도 조회·수정 가능하도록 접근 권한 확장 (Phase 6, P6-6) |

## 자체 검토 (Self-Review)
### 긍정 사항
- 실제 Confluence 인스턴스에 소유자·임시 "공유받은 사람"·임시 "관계없는 제3자" 세 신원으로
  end-to-end 검증했다 — 공유 전에는 소유자만 통과, 공유 후에는 공유받은 사람도 통과하되
  관계없는 제3자는 계속 거부, 삭제 권한(`requireDocumentOwner`)은 공유받은 사람에게도 계속
  거부된다는 것을 모두 실제 호출로 확인했다.
- `requireDocumentOwner`/`requireDocumentAccess`를 별도 함수로 나눠, 삭제처럼 소유자
  전용으로 남아야 하는 호출부가 실수로 확장된 검사를 쓰게 될 여지를 없앴다(함수 이름 자체가
  의도를 드러냄).
- 16개 참조 중 실제 호출부는 7곳(`restore`는 별도의 소유권 검사 방식을 이미 쓰고 있어 대상이
  아님을 사전 조사로 확인)뿐이었고, 그중 6곳만 확장 대상이라는 걸 코드를 먼저 읽고 정확히
  선별한 뒤 진행했다.

### 주의사항
- P6-3(공유 버튼/팝업)이 아직 없어 실제 서비스에서는 이 확장이 당장 체감되지 않는다 — 공유를
  거는 진입점 자체가 없기 때문이다. P6-3이 들어오면 이 권한 확장이 그대로 유효하게 작동한다.
- `DocumentEditor.tsx`의 삭제 버튼은 뷰어가 소유자인지 여부와 무관하게 항상 보인다(이번
  범위 밖으로 명시 — `task.md` "범위 밖" 참고) — 실제로 공유받은 사람이 열람할 수 있게 되는
  시점(P6-3)에 함께 다뤄야 한다.

### 우려사항
- 삭제를 소유자 전용으로 남긴 판단은 상식적 기본값이지 사용자가 명시적으로 확정한 결정은
  아니다. 문제가 없다고 보지만, 사용자가 다른 의견이면 쉽게 바꿀 수 있다(`route.ts`의 DELETE
  한 줄만 `requireDocumentAccess`로 바꾸면 됨).
