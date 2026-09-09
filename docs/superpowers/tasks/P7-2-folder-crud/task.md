# P7-2: 폴더 CRUD 도메인 함수·API

## 배경
- P7-1이 폴더 트리 데이터 모델과 `createFolder`/`listFolders`/`deleteFolder`(단순 제거)를
  갖췄다. 이 항목은 그 위에 이름변경을 추가하고, 삭제를 "하위 항목을 함께 지우지 않고
  상위로 승격"하는 정책으로 강화하며, API 라우트로 노출한다.
- PRD 원문 수용 기준은 "폴더 삭제 후에도 그 안에 있던 문서 수가 변하지 않음을 테스트로
  고정"까지 포함한다. 그런데 **문서가 폴더에 속하는 메커니즘(`folderId` property) 자체는
  아직 없다** — 그건 P7-3("문서-폴더 배정 API")의 몫으로 PRD에 명시돼 있다. 이 항목에서
  존재하지도 않는 문서 쪽 스키마를 앞당겨 만들면 P7-3과 책임이 겹친다. 그래서 이번
  `deleteFolder`의 승격 정책은 **폴더 트리(하위 폴더)에만** 적용하고, "문서도 승격된다"는
  보장은 P7-3이 문서에 `folderId`를 추가하면서 같은 승격 로직을 그대로 재사용하는 방식으로
  완성하기로 범위를 조정한다(아래 "범위 밖" 참고, `task.md`에 근거를 남긴다 — GitHub Issue
  없이 직접 정함, 순수 작업 순서/책임 분담 문제라 P1-6a와 같은 판단 기준).

## 수용 기준 (Acceptance Criteria)
- [ ] `renameFolder(accountFolderId, folderId, name)` — 대상 폴더가 없으면 `NotFoundError`,
      이름이 비어 있으면 `ValidationError`. 이름을 바꾼다.
- [ ] `createFolder`/`renameFolder` 둘 다 **같은 부모 아래 형제 폴더와 이름이 겹치면
      `ValidationError`**를 던진다(정책: 중복 이름 비허용 — 사용자가 사이드바에서 같은
      이름의 폴더 두 개를 구분할 방법이 없어서 혼란을 준다는 판단, GitHub Issue 없이 직접
      정함. `renameFolder`는 자기 자신은 비교 대상에서 제외한다).
- [ ] `deleteFolder(accountFolderId, folderId)` — 삭제하려는 폴더의 **직속 하위 폴더**는
      함께 삭제되지 않고, 삭제된 폴더의 `parentId`로 승격된다(최상위 폴더를 삭제하면 그
      하위 폴더들은 `parentId: null`, 즉 논리적 "미분류" 루트가 된다 — 별도의 실제
      "미분류" 폴더 노드를 만들지 않는다. `parentId: null`이 이미 그 의미다). 하위 폴더가
      여러 단계 있어도(손자 폴더 등) 한 단계씩 승격되는 게 아니라 **직속 자식만** 옮기면
      나머지는 그 자식을 따라 자동으로 유지된다(트리 구조상 자연히 성립 — 손자 폴더의
      `parentId`는 안 바뀐다).
  - 대상 폴더가 없으면 `NotFoundError`(P7-1과 동일).
- [ ] 위 세 함수 모두 실제 Confluence 쓰기는 `upsertPageProperty` 하나로 끝난다(원자적).
- [ ] API 라우트:
  - `GET /api/editor/folders` — 내 폴더 목록 조회. 개인 폴더가 없으면 빈 배열.
  - `POST /api/editor/folders` — 폴더 생성(`{ name, parentId }`). 개인 폴더가 없으면
    `NotFoundError`(문서 생성 라우트와 동일한 관례).
  - `PUT /api/editor/folders/{folderId}` — 이름변경(`{ name }`).
  - `DELETE /api/editor/folders/{folderId}` — 삭제(하위 폴더 승격 포함).
  - 네 라우트 모두 `requireSessionEmail` + `findPersonalFolder`로 내 계정 폴더를 찾는다
    (다른 사람의 폴더는 애초에 대상이 될 수 없다 — 공유 개념이 없는 개인 소유 리소스).

## 결정이 필요한 사항
없음 — 이름 중복 비허용, 삭제 시 직속 자식만 승격은 순수 구현 디테일 판단으로 GitHub
Issue 없이 직접 정한다(위 "배경"의 범위 조정도 마찬가지).

## 범위 밖
- **문서의 폴더 소속(`folderId`) 자체와, 그로 인한 "문서도 승격된다"는 보장은 P7-3의
  몫이다.** P7-3이 문서 property에 `folderId`를 추가할 때, 이 항목의 `deleteFolder`가
  하위 폴더에 적용하는 것과 같은 "삭제된 폴더의 parentId로 승격" 정책을 문서에도 적용해
  PRD P7-2 수용 기준의 "문서 수 불변"을 그 시점에 완성해야 한다 — P7-3 착수 시 이 결정을
  다시 언급해 잊지 않게 한다.
- 폴더 이동(다른 부모 아래로 옮기기)은 P7-6(문서를 폴더로 이동하는 UI)과 짝을 이루는
  별도 항목이 아니다 — 실은 PRD 어디에도 "폴더 자체를 다른 폴더 밑으로 옮기는" 기능이
  명시돼 있지 않다(P7-6은 "문서를 폴더로" 이동이지 "폴더를 폴더로" 이동이 아님). 필요해지면
  별도로 요청받아 다룬다.
- 사이드바 UI(P7-4/P7-5/P7-6)는 이번 범위가 아니다 — 도메인 함수와 API 라우트까지만.
