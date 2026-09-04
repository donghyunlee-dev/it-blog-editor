# P6-6: 공유 문서 접근 권한 확장

## 배경
Phase 6(페이지 공유)의 마지막 남은 항목. `docs/product/prd.md` 체크리스트 P6-6, "페이지 공유"
기능 설명(prd.md): "공유받은 사람도 소유자와 동일하게 그 문서를 조회·편집할 수 있다(별도
읽기 전용 공유는 이번 범위 밖, **재공유는 소유자만 가능**)." P6-2·P6-3(계정 검색·공유 팝업)
이 아직 사용자 요청 대기 중이라 실제로 문서를 공유하는 진입점(UI)은 없지만, P6-1/P6-4가
만든 `sharing.ts`의 `sharedWith`를 실제 문서 접근 검사에 반영해두면 P6-3이 나중에 들어와도
재작업이 필요 없다.

## 수용 기준 (Acceptance Criteria)
- [ ] `src/lib/editor/documents.ts`에 `requireDocumentAccess(pageId, email)`을 신설한다 —
      문서 소유자이거나 `sharingMeta.sharedWith`에 포함된 이메일이면 통과, 둘 다 아니면
      기존과 동일하게 `UnauthorizedError`(401)를 던진다.
- [ ] "조회·수정"에 해당하는 기존 호출부를 `requireDocumentOwner` → `requireDocumentAccess`로
      바꾼다: `/editor/[pageId]` 문서 열람(`page.tsx`), `PUT /api/editor/documents/{pageId}`
      (저장), `PATCH .../publish`(게시 설정), `POST .../images`(이미지 업로드),
      `GET .../versions`(버전 히스토리 조회), `PUT .../tags`(태그 설정).
- [ ] `DELETE /api/editor/documents/{pageId}`(삭제)는 그대로 `requireDocumentOwner`를 써서
      소유자만 삭제할 수 있도록 유지한다 — prd.md의 "재공유는 소유자만 가능"과 같은 맥락으로,
      공유받은 사람이 남의 문서를 휴지통으로 보낼 수는 없어야 한다는 판단이다(아래 "결정이
      필요한 사항" 참고 — 명시적으로 합의된 내용은 아니라 상식적인 기본값으로 정했다).
- [ ] 공유받은 계정이 위 6개 지점에서 조회·수정에 성공하고, 공유되지 않은 제3자는 여전히
      401(`UnauthorizedError`)로 막히는 것을 자동화 테스트로 확인한다.
- [ ] 공유받은 계정도 `DELETE`는 여전히 401로 막힌다는 것을 자동화 테스트로 확인한다.

## 결정이 필요한 사항
- **삭제(DELETE)까지 공유 대상에게 허용할지**는 prd.md에 명시적으로 정해져 있지 않다(재공유는
  소유자만이라는 문구만 있음). 대부분의 협업 도구(Google Docs 등)가 "편집 가능"과 "삭제 가능"
  을 구분해서 삭제는 소유자에게만 남겨두는 것이 일반적이고, PRD의 P6-6 수용 기준 문구도
  "조회·수정"만 명시해 "삭제"는 포함하지 않는다 — 이 상식적인 기본값(소유자만 삭제 가능)으로
  진행한다. 사용자가 다른 결정을 원하면 이후 별도 항목으로 다룰 수 있다. GitHub Issue는
  등록하지 않았다 — 값이 아니라 상식적 기본값으로 판단 가능한 구현 세부사항이라 판단했다.

## 범위 밖
- `POST/DELETE /api/editor/documents/{pageId}/share` API 라우트, 공유 버튼/팝업 UI — P6-3
  범위(사용자 요청 시 착수).
- DocumentEditor.tsx UI에서 공유받은(비소유자) 사용자에게 삭제 버튼을 숨기는 것 — 공유 진입점
  자체가 아직 없어(P6-3 미착수) 실제로 공유된 문서가 생길 수 없다. P6-3에서 공유 UI와 함께
  다룬다.
