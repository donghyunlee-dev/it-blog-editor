# P6-7: 동시 편집 충돌 감지 + 마지막 수정자 표시 — 구현 결과 보고서

## 구현 내용
- `src/lib/editor/errors.ts` — `ConflictError`에 선택적 `details?: Record<string, unknown>`
  필드를 추가했다. 기존 호출부(`folder.ts`의 중복 폴더 생성 등)는 생략해도 그대로 동작한다.
- `src/lib/api-response.ts` — 409 응답 본문에 `error` 옆에 `details`를 그대로 병합해
  `{ error: {...}, lastEditedBy: {...} }` 형태로 내려준다.
- `src/lib/editor/documents.ts`:
  - `getDocumentDetail`이 `sharing.ts`의 `getSharingMeta`를 함께 읽어 `DocumentDetail.
    lastEditedBy`를 채운다.
  - `updateDocument`가 `editor: { email, name }`을 새로 받는다. 저장이 완전히 끝나면
    `updateLastEditedBy`로 `sharingMeta.lastEditedBy`를 갱신하고, 그 값을 응답에 포함한다.
  - 두 곳의 기존 ConflictError(page version 불일치, sourceDocument property version 불일치)
    모두 현재 `sharingMeta.lastEditedBy`를 조회해 메시지에 "마지막으로 저장한 사람: 이름
    (이메일)"을 덧붙이고, `details.lastEditedBy`로도 함께 실어 보낸다.
- `src/app/api/editor/documents/[pageId]/route.ts` — 저장자의 `accountMeta.name`을
  `findPersonalFolder`+`getAccountMeta`로 조회해 `updateDocument`에 `editor`로 전달한다
  (계정 폴더가 없는 방어적 상황에서는 이름 없이 이메일만 사용).
- `src/components/editor/DocumentEditor.tsx` — `initialLastEditedBy` prop과 로컬 상태를
  추가해, 수동 저장·자동 저장 성공 시 응답의 `lastEditedBy`로 즉시 갱신한다. 하단 풋터의
  "최종 수정" 옆에 있으면만 "마지막 수정자: 이름(이메일)"을 붙여 보여준다
  (`formatAccountLabel` 재사용).
- `src/app/editor/[pageId]/page.tsx` — `getDocumentDetail`이 돌려주는 `lastEditedBy`를
  `initialLastEditedBy`로 그대로 전달.

## 파일 변경 내역
| 파일 | 변경 사항 |
|------|---------|
| `src/lib/editor/errors.ts` | `ConflictError.details` 추가 |
| `src/lib/api-response.ts` | 409 응답에 `details` 병합 |
| `src/lib/editor/documents.ts`, `.test.ts` | `getDocumentDetail`/`updateDocument`에 `lastEditedBy` 배선 |
| `src/app/api/editor/documents/[pageId]/route.ts`, `.test.ts` | 저장자 이름 조회 + `editor` 전달 |
| `src/components/editor/DocumentEditor.tsx`, `.test.tsx` | 마지막 수정자 상태·풋터 표시 |
| `src/app/editor/[pageId]/page.tsx` | `initialLastEditedBy` 전달 |
| `docs/product/prd.md`, `docs/product/api-spec.md` | 체크리스트 완료 표시, 응답 예시 갱신 |

## 커밋 내역
| SHA | 메시지 |
|-----|--------|
| (PR에서 확인) | feat: wire up conflict last-editor display (Phase 6, P6-7) |

## 자체 검토 (Self-Review)
### 긍정 사항
- 실제 Confluence 인스턴스에 임시 문서를 만들어 최초 저장 전(lastEditedBy 없음) →
  수정 저장(반영됨) → 낡은 버전으로 재저장(ConflictError 메시지·details 모두 마지막 수정자
  포함) 순서로 end-to-end 검증했다.
- 브라우저에서 풋터가 "최종 수정: 2026.09.04 · 마지막 수정자: 김철수(other@s-food.com)"로
  올바르게 렌더링되는 것을 DOM 텍스트로 확인했다(미리보기 페이지의 스크롤 특성상 스크린샷
  대신 `getBoundingClientRect`/텍스트 조회로 확인 — 실제 앱은 `EditorShell`의
  `overflow-y-auto` 안에서 정상적으로 스크롤된다).
- 기존 `ConflictError` 사용처(개인 폴더 중복 생성 등)가 `details`를 생략해도 동일하게
  동작함을 `api-response.test.ts`의 기존 테스트로 재확인했다(하위 호환 유지).

### 주의사항
- 마지막 수정자는 `updateDocument`(수정 저장)에서만 채워진다 — `createDocument`(최초 생성)
  직후에는 아직 `sharingMeta` 자체가 없어 풋터에 표시되지 않는다(의도된 동작, 풋터 조건문에
  주석으로 남겨둠).
- P6-6(공유 문서 접근 권한 확장)이 아직 없어 현재는 문서 소유자만 저장할 수 있다 — 이번
  기능은 그 제약과 무관하게 동작하도록 만들어, P6-6이 나중에 들어와도 재배선이 필요 없다.

### 우려사항
- 없음.
