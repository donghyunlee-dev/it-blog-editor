# P6-5: 공유받은 문서 목록 조회

## 배경
Phase 6(페이지 공유)의 마지막 항목. `docs/product/prd.md` 체크리스트 P6-5,
`docs/product/api-spec.md`의 `GET /api/editor/documents/shared`에 이미 상세 스펙이 합의돼
있다. P6-1~P6-4/P6-6/P6-7이 만들어둔 도메인 계층(`sharing.ts`의 `getSharedDocumentRefs`,
`account-index.ts`의 `getAccountsByEmails`)과 `documents.ts`의 기존 목록 조회 로직
(`fetchDocumentEntry`)을 그대로 재사용해, 내 계정 폴더의 `sharedDocumentRefs`를 근거로
공유받은 문서 목록을 조회하고 사이드바에 "내 문서"와 분리해 보여준다.

## 수용 기준 (Acceptance Criteria)
- [ ] `GET /api/editor/documents/shared`가 로그인한 사용자의 `sharedDocumentRefs`를 근거로
      공유받은 문서 목록(`pageId`, `title`, `ownerEmail`, `ownerName`, `updatedAt`,
      `isPublished`, `tags`)을 반환한다. 제목·게시 여부·태그·최종 수정일은 캐시된 참조가
      아니라 현재 문서 상태를 다시 조회해 최신 값으로 반환한다.
- [ ] 공유받은 문서가 없으면 빈 배열을 반환한다.
- [ ] 참조는 있지만 실제 문서가 더 이상 존재하지 않는 경우(소유자가 완전히 삭제한 뒤 등,
      드리프트)는 조용히 목록에서 제외한다 — 전체 조회가 실패하지 않는다.
- [ ] 사이드바 "새 문서" 버튼과 검색/태그 필터 사이에 "공유받은 문서" 영역을 추가한다 —
      공유받은 문서가 없으면 영역 자체를 렌더링하지 않는다(빈 상태 문구도 없음).
- [ ] 각 항목은 제목(게시 상태 아이콘 포함, 기존 문서 행과 같은 스타일)과 공유자 표시
      (`formatAccountLabel`)를 보여주고, 클릭하면 `/editor/{pageId}`로 이동해 공유받은
      사람도 조회·수정할 수 있다(P6-6에서 이미 구현됨).

## 결정이 필요한 사항
없음 — api-spec.md에 이미 합의된 스펙을 그대로 구현한다.

## 범위 밖
- 공유받은 문서를 "내 문서" 목록과 같은 검색/태그 필터에 포함시키는 것 — prd.md가 "내
  문서와 섞이지 않는다"고 명시했다.
- 공유 해제(이 목록에서 직접 "공유 해제"하는 액션) — 공유 관리는 소유자만 하는 것으로 이미
  결정됨(P6-2/P6-3), 공유받은 사람 쪽 화면에 별도 액션을 추가하지 않는다.
