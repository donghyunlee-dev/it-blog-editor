# P2-2: 문서-코드 드리프트 잔여 항목 정리

## 배경
- 2026-08-27 [프로덕션 준비도 감사](https://claude.ai/code/artifact/87302c07-68d6-42ed-8712-9345547cb659) 이후 여러 차례 발견된 "문서와 실제 코드가 어긋난 지점" 정리 작업의 마지막 잔여 항목이다(`docs/product/prd.md`의 "P2 — 다듬기" 체크리스트, P2-2). 체크리스트 항목 원문이 지목하는 지점은 두 곳이다.
  1. `EditorSidebar.tsx`의 `extractPageIdFromPathname`이 여전히 `/editor/{pageId}/publish` 형태의 경로를 같은 문서의 하위 화면으로 취급해 pageId를 추출하는 코드(정규식에 `(?:\/publish)?`)와 그 설명 주석을 갖고 있다.
  2. `design.md` 쪽 서술도 실제 구현과 맞는지 확인·정리한다.
- **코드 확인 결과**: `/editor/{pageId}/publish`라는 페이지 라우트는 존재하지 않는다 — `find src/app/editor -type d`로 실제 디렉터리를 확인한 결과 `/editor/[pageId]`, `/editor/new`, `/editor/accounts`뿐이고, 게시 설정은 2026-08-26에 별도 페이지에서 `DocumentEditor.tsx` 내부 `Modal`(`publishModalOpen` 상태)로 이미 흡수됐다(`prd.md` 138번째 줄 등 여러 곳에 이 히스토리가 이미 기록돼 있음 — 살아있는 문서 쪽은 이미 정확하다). Modal은 URL을 바꾸지 않으므로 게시 설정이 열려 있어도 브라우저 경로는 그냥 `/editor/{pageId}`다. 즉 `extractPageIdFromPathname`이 다루는 `/publish` 접미사 경로는 **어떤 상황에서도 실제로 발생할 수 없는 죽은 코드**다(`router.push`/`Link href`로 그런 경로를 만드는 곳이 전무함을 grep으로 확인).
- **design.md 확인 결과**: `design.md` 전체를 검색했으나 `/publish` 경로나 이 함수를 잘못 설명하는 서술은 없었다 — 이쪽은 이미 정확해 변경이 필요 없다(허위로 "정리했다"고 표시하지 않기 위해 확인 과정 자체를 `result.md`에 남긴다).

## 수용 기준 (Acceptance Criteria)
- [ ] `extractPageIdFromPathname`이 더 이상 `/publish` 접미사를 특별 취급하지 않는다 — 순수하게 `/editor/{pageId}` 형태만 인식한다.
- [ ] 함수의 JSDoc 주석에서 `/publish`를 하위 화면으로 취급한다는, 더 이상 사실이 아닌 서술을 제거한다.
- [ ] `EditorSidebar.test.tsx`의 관련 테스트가 새 동작(`/publish` 접미사가 붙으면 더 이상 pageId로 인식되지 않음 — 애초에 그런 URL이 존재하지 않으므로 사이드바 강조 표시에 실질적 영향 없음)에 맞게 갱신된다.
- [ ] 기존 정상 경로(`/editor/{pageId}`, `/editor/new`, `/editor`, `null`)에 대한 동작은 전혀 바뀌지 않는다.
- [ ] `design.md`를 다시 확인해 이 항목과 관련해 실제로 고칠 서술이 있는지 검증하고, 없다면 "확인했지만 변경 불필요"임을 `result.md`에 명시한다(조용히 건너뛰지 않는다).

## 결정이 필요한 사항
없음 — 이미 존재하지 않는 라우트를 다루는 죽은 코드를 제거하는 단순 정리 작업이다.

## 범위 밖
- 이 항목 밖의 다른 문서-코드 드리프트(예: 다른 컴포넌트의 스타일 서술 등)는 이번 감사 이후 각 항목이 완료될 때마다 이미 그때그때 바로잡아 왔다 — 이번 P2-2는 체크리스트가 명시적으로 지목한 이 마지막 잔여 지점만 다룬다.
