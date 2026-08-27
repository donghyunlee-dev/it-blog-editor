# P0-3: 동시 편집 시 sourceDocument 버전 미검증(원고 유실 가능)

## 배경
2026-08-27 [프로덕션 준비도 감사](https://claude.ai/code/artifact/87302c07-68d6-42ed-8712-9345547cb659)에서 P0로 지적된 항목. `updateDocument`(`src/lib/editor/documents.ts:209-233`)는 Confluence 페이지 **본문** 저장에는 낙관적 동시성 제어(요청한 `expectedVersion`이 최신 버전과 다르면 `ConflictError`)를 적용하지만, 곧이어 실행하는 `sourceDocument` **속성**(편집 원본 TipTap JSON) 저장에는 같은 검사가 없다.

`upsertPageProperty`(`src/lib/confluence/client.ts:248-278`)는 매번 "그 순간의 현재 속성 버전"을 새로 읽어 `+1`로 쓸 뿐, 클라이언트가 애초에 어떤 버전을 전제로 저장을 시작했는지는 전혀 확인하지 않는다. 그래서 다음과 같은 좁지만 실제로 가능한 경합 창이 있다:

1. 사용자 A가 문서를 열어(`sourceDocument` 버전 3) 편집 후 저장 요청을 보낸다. 본문 버전 검사는 통과하고 페이지 본문 쓰기(`updatePage`)도 성공한다.
2. 그런데 A의 **속성 쓰기**(`upsertPageProperty`) 자체가 네트워크 지연 등으로 느리게 실행되는 사이, 사용자 B가 그 사이에 문서를 열어 편집하고 저장을 완료한다(본문 버전 검사·속성 쓰기 모두 정상적으로 성공, 속성이 버전 4가 됨).
3. A의 지연된 속성 쓰기가 뒤늦게 실행되면, 그 시점의 "현재" 속성 버전(4)을 기준으로 다시 `+1`(버전 5)로 A의 **오래된** 내용을 덮어쓴다 — B가 방금 저장한 최신 원고가 조용히 사라진다.

## 수용 기준 (Acceptance Criteria)
- [ ] `updateDocument`는 저장을 시작하는 시점에 페이지 버전뿐 아니라 `sourceDocument` 속성의 현재 버전도 함께 확인해 둔다.
- [ ] 속성을 실제로 쓰는 시점에 그 속성의 버전이 저장 시작 시점에 확인해 둔 값과 다르면(즉 그 사이 다른 요청이 먼저 썼다면) 조용히 덮어쓰지 않고 `ConflictError`(409)를 던진다 — 페이지 본문 버전 불일치와 동일한 사용자 경험(토스트로 안내, 최신 내용을 다시 불러온 뒤 저장하도록 유도).
- [ ] 기존에 `upsertPageProperty`를 호출하는 다른 곳(`createDocument`의 `authorMeta`/`sourceDocument` 최초 생성, `publish.ts`의 `publishMetadata`)은 이 버전 검사가 선택적(opt-in)이라 영향받지 않는다 — 매번 검사를 강제하면 그 호출부들의 기존 동작(항상 최신으로 덮어쓰기)이 바뀌어 버린다.
- [ ] 기존 `documents.test.ts`의 `updateDocument` 테스트가 깨지지 않는다(필요하면 새 `getPageProperty` 모킹을 추가해 갱신한다).

## 결정이 필요한 사항
없음.

## 범위 밖
- 페이지 본문 쓰기와 속성 쓰기를 하나의 원자적 트랜잭션으로 묶는 것 — Confluence Cloud REST API가 여러 리소스에 걸친 트랜잭션을 지원하지 않아 근본적으로 불가능하다. 이 작업은 "조용한 데이터 유실"을 "감지 가능한 오류"로 바꾸는 것까지만 다룬다(아래 "알려진 한계" 참고).
- `createDocument`(신규 생성)의 동시 생성 경합 — 신규 생성은 애초에 경쟁할 "이전 값"이 없어 범위 밖이다.
