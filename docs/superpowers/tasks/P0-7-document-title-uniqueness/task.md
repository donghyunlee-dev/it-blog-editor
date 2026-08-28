# P0-7: Confluence 페이지 title 충돌로 인한 문서 생성 실패를 막는다

## 배경
2026-08-28, P0-5b(slug 조회 구조 개선) 작업 중 사용자가 제기한 질문("Confluence는 페이지 제목이 키인데, 계정별로 동일한 제목을 입력하면 어떻게 되는가?")에서 발견된, 기존 감사 리포트에는 없던 새로운 P0급 버그다.

Confluence(Cloud/Server 공통)는 **Space 전체에서 페이지 title이 유일해야 한다** — 부모가 다르더라도(서로 다른 계정 폴더 하위라도) 예외가 없다. 이 프로젝트는 `createDocument`(`documents.ts`)가 사용자가 입력한 제목을 그대로 Confluence page의 `title`로 저장해왔는데, 서로 다른 계정이 흔한 제목("회의록", "TODO", "1주차 회고" 등)으로 문서를 만들면 두 번째 시도는 Confluence가 `400 BadRequestException: A page with this title already exists`로 거부한다.

이 오류는 `ConfluenceApiError`로만 던져지고 `documents.ts`/`api-response.ts` 어디에도 이 케이스를 위한 분류가 없어, `toErrorResponse`의 "분류되지 않은 오류" 경로를 그대로 타 사용자에게는 **"일시적인 오류로 요청을 처리하지 못했습니다. 잠시 후 다시 시도해주세요"**라는 잘못된 안내가 뜬다(다시 시도해도 항상 같은 이유로 실패한다 — 일시적 오류가 아니라 영구적 충돌이라서). 게다가 이 경로는 Slack에 "이상 감지" 알림까지 보내는데, 이건 실제로는 흔히 일어날 수 있는 정상적인 사용자 행동이라 잘못된 알림이다.

**실제 증거**: 2026-08-28, P0-5b 작업 중 실제 Confluence 인스턴스(`donghyun.lee@s-food.com` 계정)를 조회하다가 우연히 pageId `212959235`("CODEX 명령어 요약1")를 발견했다 — `authorMeta`/`sourceDocument`/`publishMetadata`가 모두 있어 이 앱이 만든 진짜 문서인데, `parentId`가 계정 폴더가 아니라 Space 홈페이지였다. 이는 이번 항목과는 별개의 복원(P1-2b) 관련 버그로 보여 [PRD의 P1-10](../../../product/prd.md)으로 별도 기록했다.

관련 논의: 이 항목은 애초에 P0-5b(slug 구조 개선)를 이야기하다가 파생됐고, 사용자가 "이 결정을 slug까지 묶어서 진행해달라"고 명시적으로 요청해 하나의 설계로 함께 구현했다 — 자세한 내용은 [P0-5b-slug-structural-uniqueness/task.md](../P0-5b-slug-structural-uniqueness/task.md) 참고.

## 수용 기준 (Acceptance Criteria)
- [ ] 서로 다른 계정이 완전히 같은 제목으로 각자 문서를 생성해도 실패하지 않는다.
- [ ] Confluence page의 실제 `title`은 문서 생성 시 발급된 내부 고유키(`randomUUID()`)이고, 이후 문서를 수정해도 절대 바뀌지 않는다.
- [ ] 사용자가 입력/수정한 실제 제목은 `sourceDocument` content property에 저장되고, 문서 목록(`listDocuments`)·문서 상세(`getDocumentDetail`)·삭제된 문서 목록(복구용 레지스트리) 모두 이 값을 표시 제목으로 쓴다(Confluence page title을 직접 노출하지 않는다).
- [ ] 기존 API 요청/응답 스키마(`title` 필드명·위치)는 바뀌지 않는다 — 내부 저장 방식만 바뀐다.
- [ ] `sourceDocument.title`이 없는(과거 방식으로 만들어진) 문서를 조회하면 Confluence page title로 대체해 보여준다(하위 호환).

## 결정이 필요한 사항
없음 — 사용자가 대화로 직접 결정했다: "confluence는 db의 역할이야. 페이지를 열어서 보는 건 db를 열어서 보는 것과 같이 관리자만 가능하면 돼. 제목은 일정 패턴의 겹치지 않는 걸로 만들어서 읽지 못하게 하고, 별도로 제목을 저장해서 view에서 꺼낼 수 있게 구조를 잡자."(2026-08-28) 이 대화에서 나온 두 가지를 그대로 구현 결정으로 채택했다:
- 내부 고유키는 `randomUUID()`(표준 UUID v4) — Confluence page title로 쓰기에 충분히 짧고 사람이 못 읽어도 상관없는 값.
- Confluence 네이티브 화면에서 이 문서들을 직접 열어보는 사람은 관리자뿐이라고 가정한다(사용자 확인) — 그래서 Confluence title이 사람이 못 읽는 값이 되어도 문제가 없다는 전제가 성립한다.

## 범위 밖
- 이미 Confluence 네이티브 UI에 익숙한 사용자가 이 프로젝트의 문서를 Confluence에서 직접 찾아보는 워크플로우 — 사용자 확인대로 "관리자만" 직접 열어본다는 전제라 다루지 않는다.
- `sourceDocument.title`이 없는 레거시 문서의 일괄 마이그레이션(백필) — 실사용 데이터가 사실상 없다고 판단했고(P0-4a 때와 동일한 판단), 개별 문서는 한 번 수정 저장하면 자동으로 채워진다.
- P1-10(복원 시 문서가 계정 폴더 밖으로 이동하는 별도 버그) — 이번 작업 중 우연히 발견했지만 원인이 다른 별개의 버그라 판단해 범위에서 제외하고 PRD에 별도 항목으로만 기록했다.
