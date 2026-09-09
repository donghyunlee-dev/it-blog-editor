# P7-2: 폴더 CRUD 도메인 함수·API — 구현 결과 보고서

## 구현 내용
- `src/lib/editor/folders.ts`에 `renameFolder`를 추가하고, `createFolder`/`renameFolder`
  둘 다 같은 부모 아래 형제와 이름이 겹치면 `ValidationError`를 던지는
  `assertNoSiblingWithSameName`을 공유한다(`renameFolder`는 자기 자신을 비교에서 제외).
- `deleteFolder`를 확장했다 — 삭제 대상의 **직속** 하위 폴더를 삭제 대상의 `parentId`로
  재배정한 뒤 대상 자체를 제거하는 것을 한 번의 `upsertPageProperty`로 반영한다. 손자
  폴더 이하는 건드리지 않아도 트리 구조상 자동으로 유지된다.
- API 라우트 신설:
  - `GET/POST /api/editor/folders` — 목록 조회/생성. `documents/route.ts`와 동일한 관례
    (개인 폴더 없으면 GET은 빈 배열, POST는 `NotFoundError`).
  - `PUT/DELETE /api/editor/folders/{folderId}` — 이름변경/삭제. 네 라우트 모두
    `findPersonalFolder`로 호출자 본인의 계정 폴더만 대상으로 삼는다(공유 개념 없음).
- `docs/product/api-spec.md`에 네 엔드포인트를 문서화했다.
- **범위 조정(사전에 문서화)**: PRD 원문의 "폴더 삭제 후에도 그 안에 있던 문서 수가
  변하지 않음" 보장 중 문서 쪽은 P7-3으로 미뤘다 — 문서가 폴더에 속하는 메커니즘
  (`folderId` property) 자체가 아직 없어, 지금 만들면 P7-3과 책임이 겹친다.
  `task.md`에 근거를 남겼고, `deleteFolder`의 JSDoc에도 P7-3이 이 함수의 승격 로직을
  재사용해야 한다는 것을 명시했다.

## 파일 변경 내역
| 파일 | 변경 사항 |
|------|---------|
| `src/lib/editor/folders.ts`, `.test.ts` | `renameFolder`, 이름 중복 검증, `deleteFolder` 승격 로직 |
| `src/app/api/editor/folders/route.ts`, `.test.ts` | 신규(GET/POST) |
| `src/app/api/editor/folders/[folderId]/route.ts`, `.test.ts` | 신규(PUT/DELETE) |
| `docs/product/api-spec.md` | 네 엔드포인트 문서화 |
| `docs/superpowers/tasks/P7-2-folder-crud/{task,plan,result,test}.md` | 신규 |
| `docs/product/prd.md` | P7-2 완료 표시 |

## 커밋 내역
| SHA | 메시지 |
|-----|--------|
| (PR에서 확인) | feat: 폴더 CRUD 도메인 함수·API 추가 (P7-2) |

## 자체 검토 (Self-Review)
### 긍정 사항
- 실제 Confluence 인스턴스로 생성→이름 중복 거부→이름변경→이름변경 중복 거부→최상위
  삭제 시 직속 자식 승격→전체 정리까지 end-to-end 검증했고, 정확히 빈 배열로 복구했다.
- P7-1에서 확립한 "계정 폴더 property 하나를 통째로 읽고 쓰는" 패턴을 그대로 유지해
  `client.ts`에 새 함수를 추가하지 않았다.
- 문서-폴더 연동을 이번에 앞당겨 만들지 않기로 한 판단을 `task.md`에 미리 근거와 함께
  남겨, P7-3 착수 시 "왜 안 만들었는지" 다시 조사할 필요가 없게 했다.

### 주의사항
- P7-3이 문서에 `folderId`를 추가할 때, 이 항목의 `deleteFolder`가 하위 폴더에 적용하는
  것과 같은 "삭제된 폴더의 parentId로 승격" 정책을 문서에도 반드시 적용해야
  PRD P7-2 수용 기준의 "문서 수 불변"이 완성된다 — `task.md`의 "범위 밖"에 명시해뒀다.
- 이름 중복 비허용 정책은 GitHub Issue 없이 직접 정한 값 판단이다(P1-6a와 같은 근거) —
  실사용 피드백으로 나중에 "대소문자만 다른 이름"까지 막아야 한다는 요구가 나올 수 있다.

### 우려사항
- 없음.
