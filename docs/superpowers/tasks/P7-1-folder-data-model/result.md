# P7-1: 폴더 데이터 모델 확정 — 구현 결과 보고서

## 구현 내용
- `docs/product/data-spec.md`의 AccountFolder 테이블에 `folderIndex` property 행을
  추가했다 — Issue #65에서 결정된 B안(property 기반 가상 폴더 구조) 그대로.
- `src/lib/editor/folders.ts` 신설 — `FolderNode`(`id`/`name`/`parentId`/`order`) 타입과
  `listFolders`/`createFolder`/`deleteFolder` 세 도메인 함수를 `sharing.ts`의
  `getSharedDocumentRefs`/`upsertSharedDocumentRef`와 같은 패턴("계정 폴더 property
  하나를 통째로 읽고 쓰는 캐시")으로 구현했다.
  - `createFolder`: 이름 trim·빈 값 검증, `parentId` 존재 검증, 중첩 깊이(`MAX_FOLDER_DEPTH
    = 5`, Phase 7 핵심 결정) 검증, `order`는 같은 부모의 형제 개수로 자동 계산해 항상
    끝에 추가한다. `id`는 `documents.ts`의 `internalKey`, 이미지 업로드 파일명 충돌
    방지와 같은 이유로 `randomUUID()`를 재사용한다.
  - `deleteFolder`: 노드 하나만 단순 제거한다 — 자식 승격 정책은 P7-2 몫으로 명시적으로
    남겼다(문서가 아직 `folderId`를 가질 방법이 없어 지금은 안전).
- API 라우트·문서 쪽 `folderId` 배정은 이번 범위에 포함하지 않았다(각각 P7-2·P7-3).

## 파일 변경 내역
| 파일 | 변경 사항 |
|------|---------|
| `src/lib/editor/folders.ts`, `.test.ts` | 신규 |
| `docs/product/data-spec.md` | `folderIndex` property 문서화 |
| `docs/superpowers/tasks/P7-1-folder-data-model/{task,plan,result,test}.md` | 신규 |
| `docs/product/prd.md` | P7-1 완료 표시 |

## 커밋 내역
| SHA | 메시지 |
|-----|--------|
| (PR에서 확인) | feat: 폴더 데이터 모델 확정 (P7-1) |

## 자체 검토 (Self-Review)
### 긍정 사항
- "정확히 5단계(경계값)" 테스트를 작성하는 과정에서 `computeDepth` 헬퍼의 실제
  off-by-one 버그(최상위 폴더를 항상 깊이 2로 잘못 계산해, 경계값에서 정상적으로
  허용돼야 할 5단계 생성을 거부하던 문제)를 발견해 그 자리에서 고쳤다 — 이 테스트가
  없었다면 "5단계를 넘으면 막히지만, 정확히 5단계는 못 만드는" 눈에 띄지 않는 버그가
  그대로 남았을 것이다.
- 실제 Confluence 인스턴스로 최상위→하위→3~5단계 생성, 없는 부모 거부, 6단계 거부,
  전체 삭제까지 end-to-end 검증했고 검증 전 상태(빈 배열)로 정확히 복구했다.
- `sharing.ts`의 기존 패턴을 그대로 재사용해 `client.ts`에 새 함수를 추가하지 않았다 —
  `getPageProperty`/`upsertPageProperty`만으로 충분했다.

### 주의사항
- `deleteFolder`가 자식 폴더를 신경 쓰지 않는 것은 의도적이다 — 지금 시점에는 폴더
  트리 자체가 다른 무엇에도 참조되지 않아(P7-2/P7-3 이전) 안전하지만, P7-2가 자식 승격
  정책을 구현하기 전까지는 "자식이 있는 폴더를 삭제하면 그 자식들이 고아가 된다"는
  것을 UI에 노출해서는 안 된다(현재는 UI 자체가 없어 문제 없음).
- 같은 부모 아래 폴더 이름 중복 허용 여부는 이번에 다루지 않았다(P7-2 수용 기준) —
  지금은 같은 이름의 형제 폴더가 여러 개 생겨도 데이터 모델 자체는 깨지지 않는다.

### 우려사항
- 없음.
