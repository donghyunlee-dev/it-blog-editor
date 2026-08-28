# P0-8: 게시 여부를 폴더 이동이 아니라 property만으로 관리하도록 단순화한다 — 구현 결과 보고서

## 구현 내용
계정 폴더 하위의 "초안"/"게시" 서브폴더 구조를 완전히 제거하고, 게시 여부를 restriction(제한)과 `publishMetadata.isPublished` property만으로 관리하도록 바꿨다.

- `folder.ts`: `PersonalFolder`를 `{accountFolderId, spaceKey}`로 줄였다. `findPersonalFolder`/`createPersonalFolder`는 이제 계정 폴더 하나만 찾거나 만든다 — 서브폴더 자동 생성·자가 복구 로직이 전부 사라졌다.
- `documents.ts`: `createDocument`가 계정 폴더 바로 하위에 문서를 만든다(여전히 `hidePageFromOthers`로 시작은 항상 비공개). `listDocuments(accountFolderId)`로 시그니처를 하나로 줄이고, 문서마다 `getTags`/`sourceDocument`와 함께 `publishMetadata`도 병렬로 읽어 `isPublished`를 판단한다(더 이상 폴더 위치로 판단하지 않는다).
- `publish.ts`: `setPublishState`에서 작성자 폴더 조회(`getAuthorFolderOrThrow`)와 `movePage` 호출을 완전히 제거했다. 게시 시 `revealPageToSpace` → 메타데이터 기록, 게시취소 시 `hidePageFromOthers` → 메타데이터 기록 순서로 단순화했다 — restriction 적용/해제가 멱등 연산이라는 점에 기대어, 예전의 "위치가 진실" 재시도-안전 로직을 대체했다.
- `deleted-documents.ts`: `restoreDocument`가 `movePage(pageId, folder.accountFolderId)`로 바뀌고(서브폴더 선택 로직 자체가 사라짐), 복구 후 `publishMetadata.isPublished`가 `true`였다면 명시적으로 `false`로 되돌리는 단계를 추가했다 — 이걸 안 하면 restriction은 비공개인데 표시는 "게시됨"인 자기모순 상태가 된다(폴더 이동이 이 재설정을 "공짜로" 해주던 것을 이제는 명시적으로 해줘야 한다).
- `tag-suggestions.ts`/`layout.tsx`/`documents/route.ts`/`folder/route.ts`: `listDocuments`/`createDocument` 호출부와 `/api/editor/folder` 응답을 새 시그니처·스키마에 맞춰 정리했다(응답에서 `draftFolderId`/`publishedFolderId` 제거 — 소비하는 프런트엔드 코드가 없음을 확인했다).

## 파일 변경 내역
| 파일 | 변경 사항 |
|------|---------|
| `src/lib/editor/folder.ts`, `folder.test.ts` | 서브폴더 로직 전체 제거, `PersonalFolder` 축소 |
| `src/lib/editor/documents.ts`, `documents.test.ts` | `CreateDocumentInput.accountFolderId`, `listDocuments(accountFolderId)`, `publishMetadata` 기반 `isPublished` 판단 |
| `src/lib/editor/publish.ts`, `publish.test.ts` | `movePage`/작성자 폴더 조회 제거, restriction 토글 순서만 남김 |
| `src/lib/editor/deleted-documents.ts`, `deleted-documents.test.ts` | 계정 폴더로 이동 + `publishMetadata.isPublished` 재설정 |
| `src/lib/editor/tag-suggestions.ts`, `tag-suggestions.test.ts` | `listDocuments` 호출 시그니처 갱신 |
| `src/app/editor/layout.tsx` | 위와 동일 |
| `src/app/api/editor/documents/route.ts` | `createDocument` 호출 시 `accountFolderId` 전달 |
| `src/app/api/editor/folder/route.ts` | 응답에서 `draftFolderId`/`publishedFolderId` 제거 |
| `docs/product/prd.md` | "초안-게시 생명주기" 기능 설명 갱신, Phase 1 관련 항목에 대체 메모 추가, P0-8 체크리스트 신규 완료 표시, P1-10에 재현 경로 소멸 메모 |
| `docs/product/architecture.md`, `docs/product/data-spec.md` | DraftFolder/PublishedFolder 엔티티·서술 제거, 새 메커니즘 반영 |
| `docs/product/api-spec.md` | `/api/editor/folder` 응답 스키마 갱신 |

## 커밋 내역
| SHA | 메시지 |
|-----|--------|
| (커밋 전) | |

## 자체 검토 (Self-Review)
### 긍정 사항
- 이미 완료 표시됐던 Phase 1 기능을 되돌리는 부담이 있었지만, "초안-게시 생명주기"라는 기능의 **사용자 관점 동작**(초안은 비공개, 게시하면 공개, 문서함에 상태 뱃지로 함께 보임)은 전혀 바뀌지 않았다 — 내부 구현(폴더 이동 여부)만 바뀌었다는 것을 테스트로 확인했다.
- 구현 도중 "복구 시 publishMetadata를 재설정해야 한다"는, 애초 분석에는 없던 요구사항을 스스로 발견해 수용 기준에 반영했다 — 폴더 이동이 암묵적으로 해주던 일을 놓칠 뻔했다.
- `setPublishState`가 극적으로 단순해졌다(작성자 폴더 조회·이동 대상 판단이 통째로 사라짐) — 코드 자체가 감사 대상 축소.

### 주의사항
- `listDocuments()`가 이제 문서마다 `publishMetadata`도 추가로 읽는다(태그·sourceDocument와 합쳐 문서당 3개 property 병렬 조회) — 계정 하나의 문서 수 범위 내 비용이라 지금 규모에서는 무리 없다고 판단했지만, 계정당 문서 수가 매우 커지면 재검토가 필요할 수 있다.
- 이미 실사용 중 만들어진 계정의 "초안"/"게시" 서브페이지(예: `donghyun.lee@s-food.com` 계정)는 코드가 더 이상 참조하지 않을 뿐 그대로 남아있다 — 능동적으로 정리하지 않았다(실사용 데이터 사실상 없음 판단).
- P1-10(복원 시 계정 폴더 밖으로 이동하는 버그)의 재현 경로가 이번 리팩터로 사라진 것으로 보이지만, 원래 버그의 정확한 원인을 소급 확인하지는 못했다 — PRD에 그 한계를 명시해뒀다.

### 우려사항
- 없음.
