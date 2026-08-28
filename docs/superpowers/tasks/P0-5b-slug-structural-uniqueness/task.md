# P0-5b: slug 조회를 구조적으로 해결한다

## 배경
2026-08-27 [프로덕션 준비도 감사](https://claude.ai/code/artifact/87302c07-68d6-42ed-8712-9345547cb659)에서 지적된 항목. `findPublishedPageBySlug`(P0-5a에서 TTL 캐시로 즉시 완화한 상태)는 근본적으로 Space 전체 페이지를 스캔하며 페이지마다 `getPageProperty`를 또 호출하는(N+1) 구조라, 문서 수가 늘어날수록 게시 요청이 느려진다.

[Issue #3](https://github.com/sfood-pioneer-1st/sfood-it-editor/issues/3)에서 논의가 여러 차례 오갔다(전체 스레드는 이슈 참고):
1. 처음 제안: "CQL로 진행하고 안되면 계정마다 index 페이지". 착수 전 조사 결과 **CQL로 content property를 검색하려면 Forge 앱을 만들어 사이트에 설치해야 한다**(REST API + 서비스 계정만으로는 불가능) — 이 사실을 공유했다.
2. 후속 논의에서 "계정별 index"가 실제로 space 전체 slug 중복을 어떻게 해결하는지 확인이 필요하다는 지적이 나왔고, 대화를 이슈 코멘트 대신 채팅으로 옮겨 계속했다.
3. 최종적으로 사용자가 **완전히 다른 방향**을 제안했다: "slug 자체에 고유값을 붙여서 애초에 중복이라는 개념을 없애자." 그리고 이걸 P0-7(문서 제목 충돌 방지, 아래 참고)과 묶어서 진행하자고 결정했다.

## 최종 결정과 근거
Confluence 페이지 title은 이제(P0-7) 문서 생성 시 발급된 전역 유일 `randomUUID()`다. 게시 시 이 값을 그대로 재사용해 `publicSlug = "${사용자가-입력한-slug}-${내부고유키}"`를 계산해 저장한다. 내부고유키가 이미 전역 유일이 보장되므로 `publicSlug`는 다른 어떤 문서의 것과도 절대 같을 수 없다 — **Space 전체를 스캔해 중복을 검사할 필요가 구조적으로 사라진다.**

이 결정은 대화로 직접 확정됐다(GitHub Issue #3에는 조사 결과와 중간 설계안까지만 남기고, 최종 결정은 채팅에서 이뤄졌다 — 사용자 요청으로 "이슈 그만 달고 여기서 대화하자"). Issue #3은 이 결정으로 닫는다.

## 수용 기준 (Acceptance Criteria)
- [ ] 게시 시 `publishMetadata.viewers[viewerId]`에 사용자가 입력한 `slug`와 함께, 서버가 계산한 `publicSlug`(`slug-내부고유키` 형식)가 저장된다.
- [ ] 서로 다른 두 문서가 같은 `slug`(사용자가 입력한 값)로 게시를 시도해도 **막지 않는다** — `publicSlug`가 자동으로 달라지므로 애초에 충돌이라는 개념이 없다.
- [ ] `findPublishedPageBySlug`/`buildSlugIndex`/`invalidateSlugIndexCache`/`__resetSlugIndexCacheForTests`(P0-5a의 TTL 캐시 전체)와 이제 쓰이지 않는 `listAllSpacePages`를 코드에서 제거한다.
- [ ] 게시 시 필수 입력값(slug/metaDescription) 검증은 그대로 유지한다.
- [ ] 게시 설정 화면(`PublishForm.tsx`)에 실제 공개 경로(`publicSlug`)를 읽기 전용으로 안내한다(사용자가 입력한 slug 그대로가 최종 URL이 아니라는 것을 알 수 있게).

## 결정이 필요한 사항
없음(위 "최종 결정과 근거" 참고 — 이슈가 아니라 대화로 확정됐다).

## 범위 밖
- Tech Blog 등 실제 Viewer 프로젝트가 `publicSlug`를 파싱해 pageId를 뽑아 조회하도록 바꾸는 작업 — 이 저장소 밖의 별개 프로젝트이고, 이번 변경으로 공개 URL 형식이 바뀌므로(`slug` → `slug-내부고유키`) 별도로 반영이 필요하다는 점만 문서(api-spec.md/data-spec.md)로 남긴다.
- 기존에 이미 게시된 문서의 slug 마이그레이션 — 실사용 게시 문서가 없다고 판단했다(P0-4a/P0-7과 동일한 판단 근거).
