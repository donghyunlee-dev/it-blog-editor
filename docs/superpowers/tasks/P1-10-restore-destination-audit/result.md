# P1-10: 삭제된 문서 복구 시 Space 최상위로 이동하던 사례 후속 조치 — 구현 결과 보고서

## 구현 내용
- **현재(P0-8 이후) 구조 확인**: `restoreDocument`(`src/lib/editor/deleted-documents.ts`)는 `movePage(pageId, folder.accountFolderId)`만 호출하고, `folder.accountFolderId`는 `findPersonalFolder`/`createPersonalFolder`(`src/lib/editor/folder.ts`)가 항상 `accountFolder.id`(실제로 생성/조회된 계정 폴더 페이지의 id)로만 채운다 — `space.homepageId`가 이 값으로 흘러들 수 있는 코드 경로가 없다. 서브폴더 선택 로직 자체가 P0-8에서 사라져 "잘못된 서브폴더를 고르는" 종류의 버그가 들어설 자리가 구조적으로 없다.
- **P0-8 이전 코드 소급 조사**: `git show 469c3bb^1`(P0-8 병합 커밋의 부모, 즉 P0-8 이전 최종 상태)의 `deleted-documents.ts`/`folder.ts`를 확인했다. 당시 `restoreDocument`는 `movePage(pageId, folder.draftFolderId)`를 호출했고, `draftFolderId`는 `findPersonalFolder`가 `findChildPageByTitle(accountFolder.id, "초안")`로 조회하거나(없으면 자가 복구로 새로 생성) 채웠다 — 이 경로에서도 `space.homepageId`가 `draftFolderId`로 잘못 흘러드는 코드는 찾지 못했다.
- **결론(추측으로 메우지 않음)**: 원래 버그의 정확한 트리거를 P0-8 직전 코드에서도 특정하지 못했다. pageId `212959235`가 만들어진 시점은 이 복구 기능(P1-2b, 2026-08-28 이전 어느 시점)보다 더 이전이거나, 코드가 아닌 다른 경로(예: 개발 중 수동 조작)로 만들어졌을 가능성이 있으나 이는 검증되지 않은 추정이라 결론에 포함하지 않는다. 확실한 것은 (1) 지금 코드는 구조적으로 이 버그를 재현할 수 없고, (2) 이미 이를 검증하는 회귀 테스트가 있다는 것이다.
- **기존 테스트 재확인**: `deleted-documents.test.ts`의 "레지스트리에 있으면 계정 폴더로 이동시키고..." 테스트가 이미 `moveSpy`를 `("doc-1", "account-1")`로 정확히 호출했는지 검증하고 있어, 이 자체가 P1-10 회귀(Space 홈페이지로의 이동)를 구조적으로 막고 있음을 확인했다 — 새 테스트를 중복 추가하는 대신, 그 사실을 주석으로 명시해 향후 이 테스트를 읽는 사람이 왜 이 assertion이 중요한지 알 수 있게 했다.

## 파일 변경 내역
| 파일 | 변경 사항 |
|------|---------|
| `src/lib/editor/deleted-documents.test.ts` | 기존 테스트에 P1-10 회귀 방지 의도를 설명하는 주석 추가(assertion 자체는 변경 없음) |
| `docs/product/prd.md` | P1-10 체크리스트 갱신(감사 완료, 실제 인스턴스 정리는 사용자 승인 대기로 명시) |

## 커밋 내역
| SHA | 메시지 |
|-----|--------|
| (커밋 예정) | docs: 삭제 문서 복구 목적지 감사 및 회귀 방지 문서화 (P1-10) |

## 자체 검토 (Self-Review)
### 긍정 사항
- 추측으로 "아마 이래서 그랬을 것"이라고 결론짓지 않고, 실제로 P0-8 이전 코드까지 열어 확인한 뒤 "특정하지 못했다"고 정직하게 남겼다.
- 이미 존재하던 테스트가 이 회귀를 막고 있다는 사실을 발견해, 불필요한 중복 테스트를 추가하지 않고 의도만 명확히 했다.

### 주의사항
- pageId `212959235`(Space 최상위에 실제로 남아있는 문서) 자체의 정리는 이번 작업에 포함하지 않았다 — 실제 Confluence 인스턴스에 쓰기 작업이 필요해 사용자 승인을 별도로 받아야 한다(`task.md`의 "결정이 필요한 사항" 참고).

### 우려사항
없음 — 이번 변경은 주석 추가와 문서화뿐이며 런타임 동작은 전혀 바뀌지 않았다.
