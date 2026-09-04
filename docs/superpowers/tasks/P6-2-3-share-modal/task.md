# P6-2/P6-3: 계정 검색 연동 + 공유 버튼/팝업 UI

## 배경
Phase 6(페이지 공유)에서 사용자 요청 대기로 미뤄뒀던 마지막 두 항목. 사용자가 명시적으로
착수를 요청해(2026-09-04) 진행한다. `docs/product/prd.md` 체크리스트 P6-2·P6-3을 하나의
작업으로 묶는다 — P6-2("공유 팝업이 P5-7의 검색 API를 재사용해 디바운스 검색")는 P6-3의
팝업 안에서만 의미가 있는 하위 조각이라, 두 항목을 분리해서 구현하면 P6-2 산출물(검색
컴포넌트)만 따로는 화면 어디에도 연결되지 않는 고아 코드가 된다(Phase 4의 P1-8·P1-9a~f
병합 완료 전례와 같은 이유로 병합).

이미 끝난 항목들이 그대로 재사용된다: P5-7의 `GET /api/editor/account/search`(계정 검색),
P6-1/P6-4의 `sharing.ts`(`shareDocument`/`unshareDocument`, 상대방 `sharedDocumentRefs`
동기화까지 이미 됨), P6-6의 `requireDocumentAccess`/`requireDocumentOwner`(공유받은 사람도
조회 가능, 재공유는 소유자만).

## 수용 기준 (Acceptance Criteria)
- [ ] 문서 편집 화면(`DocumentEditor.tsx`) 헤더에 "공유" 버튼이 있고, **문서 소유자에게만**
      보인다(재공유 방지 — prd.md "페이지 공유" 기능 설명).
- [ ] "공유" 버튼을 누르면 `Modal`이 열려 (a) 이름·이메일·팀 검색(디바운스, P5-7의 검색 API
      재사용)으로 대상을 찾아 추가할 수 있고, (b) 이미 공유된 대상 목록을 보여주고 각각
      제거할 수 있다.
- [ ] `POST /api/editor/documents/{pageId}/share`(추가), `DELETE /api/editor/documents/
      {pageId}/share/{email}`(제거) API를 추가한다. 둘 다 `requireDocumentOwner`로 소유자만
      호출할 수 있게 막는다(공유받은 사람은 재공유 불가).
- [ ] 자기 자신을 공유 대상으로 지정하면 400(`INVALID_REQUEST`)을 반환한다.
- [ ] 대상 이메일이 계정 폴더가 없는 이메일이면(검색 결과에는 원래 안 나오지만 방어적으로)
      404(`NOT_FOUND`)를 반환한다.
- [ ] 공유 추가/제거는 `sharing.ts`의 `shareDocument`/`unshareDocument`를 그대로 호출해,
      문서의 `sharingMeta.sharedWith`와 대상 계정 폴더의 `sharedDocumentRefs`가 함께
      갱신된다(P6-4가 이미 만들어둔 동작).
- [ ] 검색 결과에서 이미 공유된 대상과 자기 자신(소유자)은 제외하고 보여준다.
- [ ] 검색 API 실패, 공유 추가/제거 API 실패는 각각 `Toast`로 안내한다.

## 결정이 필요한 사항
없음 — 필요한 데이터 모델·API 계약·권한 규칙이 모두 이전 항목(P5-7, P6-1, P6-4, P6-6)에서
이미 정해져 있다.

## 범위 밖
- 공유받은 문서 목록 조회(사이드바 "공유받은 문서" 영역, `GET /api/editor/documents/shared`)
  — P6-5, 별도 항목.
- 읽기 전용 공유, 재공유(공유받은 사람이 다시 다른 사람에게 공유) — prd.md에 이미 범위
  밖으로 명시됨.
