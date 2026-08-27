# P0-1a: 저장하지 않은 변경사항 이탈 경고

## 배경
2026-08-27 [프로덕션 준비도 감사](https://claude.ai/code/artifact/87302c07-68d6-42ed-8712-9345547cb659)에서 P0로 지적된 항목. `DocumentEditor`는 "저장" 버튼 클릭으로만 저장되고(`src/components/editor/DocumentEditor.tsx:231-296`), 탭을 닫거나 다른 화면으로 이동해도 경고가 없어 작성 중이던 내용이 조용히 사라진다.

관련 PRD 항목: [docs/product/prd.md](../../../docs/product/prd.md) Phase 4, P0-1a.

## 수용 기준 (Acceptance Criteria)
- [ ] 저장하지 않은 변경사항(제목/본문/태그 중 하나라도 수정)이 있는 상태에서 탭을 닫거나 새로고침하거나 주소창에 새 URL을 입력하면 브라우저 기본 이탈 확인 대화상자가 뜬다(`beforeunload`).
- [ ] 저장하지 않은 변경사항이 있는 상태에서 앱 내부 링크(사이드바의 문서 행/"새 문서"/로고, 편집 화면의 "문서함으로 돌아가기")를 클릭하면 `window.confirm()`이 아니라 `Modal`로 확인을 받는다 — "계속 편집"을 누르면 이동하지 않고, "변경사항 버리고 이동"을 누르면 원래 가려던 곳으로 이동한다.
- [ ] 변경사항이 없는 상태에서는 어떤 경고도 없이 평소처럼 이동한다.
- [ ] 저장(또는 삭제)이 성공하면 그 시점부터 다시 "저장하지 않은 변경사항 없음" 상태로 취급한다.
- [ ] 기존 테스트(`DocumentEditor.test.tsx` 등, Provider 없이 `DocumentEditor`만 단독 렌더링)가 깨지지 않는다 — Provider가 없는 컨텍스트에서는 이탈 경고 기능이 조용히 비활성화(no-op)되고 기존 동작 그대로 navigate된다.

## 결정이 필요한 사항
없음 — `_pending-decisions.md`에서 자동 저장(P0-1b)과는 분리된 항목으로, 이탈 "경고"만 다룬다.

## 범위 밖
- **브라우저 뒤로가기/앞으로가기 버튼(popstate)으로 앱 내부의 다른 라우트로 이동하는 경우**는 이번 항목에서 다루지 않는다. Next.js 16 App Router는 `<Link onNavigate>`(v15.3.0에 추가, `node_modules/next/dist/docs/01-app/03-api-reference/02-components/link.md` "Blocking navigation" 절)로 `<Link>` 기반 SPA 네비게이션은 안전하게 가로챌 수 있지만, 브라우저 back/forward 버튼이 촉발하는 popstate 전환을 가로막는 공식 지원 API는 없다. `history.pushState`를 임의로 조작해 흉내 내는 방법은 깨지기 쉽고(이중 확인창, 정방향 이동 불가 등) 오히려 새로운 버그를 만들 위험이 커서 이번 범위에서 제외한다. 실사용에서 문제가 되면 별도 항목으로 재논의한다.
- 자동 저장(로컬/서버) 도입 — [Issue #1](https://github.com/sfood-pioneer-1st/sfood-it-editor/issues/1)에서 별도로 결정하는 P0-1b의 범위다.
