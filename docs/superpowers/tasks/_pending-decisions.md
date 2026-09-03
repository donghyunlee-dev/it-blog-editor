# 결정 대기 항목 (GitHub Issue로 등록됨)

> 2026-08-27 프로덕션 준비도 감사 이후 PRD Phase 4를 세분화하는 과정에서 나온 결정 사항이다.
> 2026-08-27 `gh issue create`로 아래 6건을 등록했다. 답이 정해지면 해당 이슈를 닫고, 착수하는
> `docs/superpowers/tasks/{ID}-.../task.md`에 이슈 링크와 최종 결정을 옮겨 적은 뒤 이 표의
> 상태를 "반영됨"으로 갱신한다.

| PRD 항목 | 이슈 | 결정 사항 | 상태 |
|---|---|---|---|
| P0-1b | [#1](https://github.com/sfood-pioneer-1st/sfood-it-editor/issues/1) | 자동 저장 도입 여부·방식·주기 | 반영됨 — 변경분만/1분 주기/localStorage 백업. `docs/superpowers/tasks/P0-1b-autosave/` |
| P0-4a | [#2](https://github.com/sfood-pioneer-1st/sfood-it-editor/issues/2) | 이미지 업로드 최대 파일 크기 | 반영됨 — 10MB. `docs/superpowers/tasks/P0-4a-image-upload-size-limit/` |
| P0-5b | [#3](https://github.com/sfood-pioneer-1st/sfood-it-editor/issues/3) | slug 조회 구조적 해결 방식(CQL/인덱스) | 반영됨 — 최종적으로 채팅에서 결정: slug 뒤에 P0-7의 내부 고유키(`randomUUID()`, Confluence page title)를 붙여 구조적으로 충돌 불가능하게 함. P0-5a(TTL 캐시) 전체 제거 포함. `docs/superpowers/tasks/P0-5b-slug-structural-uniqueness/` |
| P1-4a | [#4](https://github.com/sfood-pioneer-1st/sfood-it-editor/issues/4) | 구조화 로깅 도구/전송 대상 | 반영됨 — Slack만 유지, 별도 도구 없이 `src/lib/logger.ts`(JSON 한 줄 로그)로 구현. `docs/superpowers/tasks/P1-4a-structured-logging/` |
| P1-5 | [#5](https://github.com/sfood-pioneer-1st/sfood-it-editor/issues/5) | 레이트리밋 구현 방식과 임계값 | 반영됨 — 단일 인메모리 방식, 사용자당 분당 30회. `docs/superpowers/tasks/P1-5-rate-limiting/` |
| P2-3 | [#6](https://github.com/sfood-pioneer-1st/sfood-it-editor/issues/6) | AWS 배포 방식 및 시크릿 매니저 종류 | 대기 |
| P1-1a(본문 검색) | [#7](https://github.com/sfood-pioneer-1st/sfood-it-editor/issues/7) | 본문 검색 지원 여부·방식(N+1 비용 트레이드오프) | 대기 |
