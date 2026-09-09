# P7-1: 폴더 데이터 모델 확정

## 배경
- Phase 7(문서 폴더 구조)의 첫 항목. 폴더를 실제 Confluence 페이지로 만들지 property 기반
  가상 구조로 만들지는 이후 모든 항목의 구현 방식을 가르는 되돌리기 어려운 결정이라
  추측하지 않고 [Issue #65](https://github.com/sfood-pioneer-1st/sfood-it-editor/issues/65)로
  등록했고, 2026-09-09 "B안으로 결정" 코멘트로 확정됐다.
- **B안(property 기반 가상 폴더 구조)**: 계정 폴더의 content property에 폴더 트리
  (`{id, name, parentId, order}[]`)를 저장한다. 문서의 실제 Confluence 페이지 위치는
  지금처럼 계정 폴더 바로 아래 그대로 두고, 어느 폴더에 속하는지는 문서 쪽 property의
  `folderId` 하나로만 판단한다(실제 이동은 없다 — P0-8이 이미 검증한 "위치가 아니라
  property로 상태를 판단한다" 원칙과 일관).
- 이 항목의 역할은 **데이터 모델 자체를 확정하고 최소한의 동작(생성/조회/삭제)으로
  검증하는 것**이다 — 폴더 이름변경, 삭제 시 자식 승격 정책, 중복 이름 처리, API 라우트,
  문서-폴더 실제 배정(`folderId` 기록)은 각각 P7-2·P7-3의 몫이다(PRD 체크리스트 참고).
  이 항목에서 문서 쪽 property는 전혀 건드리지 않는다 — 폴더 트리 자체만 다룬다.
- 참고: `src/lib/editor/sharing.ts`의 `getSharedDocumentRefs`/`upsertSharedDocumentRef`가
  계정 폴더에 배열 하나를 통째로 읽고 쓰는 것과 정확히 같은 패턴이라 그대로 재사용한다.

## 수용 기준 (Acceptance Criteria)
- [ ] `docs/product/data-spec.md`의 AccountFolder 테이블에 `folderIndex` property 행이
      추가돼 있다 — 타입·제약조건·설명이 B안 그대로 반영됨.
- [ ] `src/lib/editor/folders.ts`에 `FolderNode` 타입(`id`/`name`/`parentId`/`order`)이
      정의돼 있다.
- [ ] `listFolders(accountFolderId)`가 폴더 목록을 조회한다 — property가 없으면(첫 사용)
      빈 배열을 반환한다(하위 호환 기본값 패턴).
- [ ] `createFolder(accountFolderId, { name, parentId })`가 새 폴더를 만든다 —
      - `id`는 `randomUUID()`로 발급한다(이 프로젝트가 이미 `documents.ts`의 `internalKey`,
        이번 세션의 이미지 파일명 충돌 방지에 쓰는 것과 같은 선례).
      - `name`이 빈 문자열이면 `ValidationError`.
      - `parentId`가 주어졌는데 그 id의 폴더가 현재 목록에 없으면 `ValidationError`.
      - 중첩 깊이가 5단계를 넘으면(핵심 결정) `ValidationError` — 새 폴더를 최상위(0단계)로
        만들 때 1, 그 아래에 만들 때 2, ... 로 세어 6이 되는 순간 거부한다.
      - `order`는 같은 `parentId`를 가진 기존 형제 개수로 정해 항상 끝에 추가되게 한다.
- [ ] `deleteFolder(accountFolderId, folderId)`가 그 폴더 노드 하나만 목록에서 제거한다.
      존재하지 않는 id를 넘기면 `NotFoundError`.
- [ ] 위 세 함수 모두 실제 Confluence 쓰기는 `upsertPageProperty`/`getPageProperty` 하나로만
      끝난다(원자적) — `sharing.ts`와 동일한 보장 수준.

## 결정이 필요한 사항
없음 — Issue #65에서 이미 결정됐다.

## 범위 밖
- 폴더 이름변경, 삭제 시 자식 폴더·문서를 상위로 승격시키는 정책은 P7-2의 몫이다. 이번
  `deleteFolder`는 하위 항목을 신경 쓰지 않는 단순 제거만 한다 — 아직 문서·다른 폴더가
  `parentId`로 이 폴더를 참조할 방법 자체가 없으므로(P7-3 이전) 지금 시점에는 안전하다.
- API 라우트(`/api/editor/folders` 등)는 P7-2의 몫이다. 이 항목은 도메인 계층까지만 다룬다.
- 문서에 `folderId`를 기록하는 것(P7-3)은 이 항목에서 전혀 건드리지 않는다.
- 같은 부모 아래 폴더 이름 중복을 막는 것은 P7-2의 명시적 수용 기준이다 — 이번엔 다루지
  않는다(여러 폴더가 같은 이름을 가져도 이 데이터 모델 자체는 깨지지 않는다).
