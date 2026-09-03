# P5-1: 계정 데이터 모델 확장 — 구현 결과 보고서

## 구현 내용
- 계정 폴더(`AccountFolder`)의 `accountMeta` content property를 읽고 쓰는 도메인 함수를 `src/lib/editor/account.ts`에 새로 만들었다.
  - `getAccountMeta`: property가 없으면(하위 호환 — 이 기능 도입 이전에 생성된 계정) 기본값(`{ name: "", team: "", accessEnabled: true }`)을 반환한다. Confluence에 쓰기는 하지 않는다(읽기 전용 보정).
  - `needsOnboarding`: 이름·팀 중 하나라도 비어 있으면(공백만 있는 경우 포함) true.
  - `saveAccountMeta`: 이름·팀을 저장한다. `accessEnabled`는 기존 값을 그대로 보존해 이 함수로는 바꿀 수 없게 했다(관리자 전용 스크립트 P5-6의 몫). `onboardedAt`은 기존 값이 없을 때만 채운다(최초 온보딩 완료 시점 1회 기록, 이후 재수정에도 유지).
  - `initializeAccountMeta`: 계정 폴더 생성 직후 기본값을 명시적으로 기록한다.
- `folder.ts`의 `createPersonalFolder`가 계정 폴더 생성 직후 `initializeAccountMeta`를 호출하도록 연결해, 신규 계정은 처음부터 `accountMeta`를 갖는다.

## 파일 변경 내역
| 파일 | 변경 사항 |
|------|---------|
| `src/lib/editor/account.ts` | 신규 — `AccountMeta` 타입, `getAccountMeta`/`needsOnboarding`/`saveAccountMeta`/`initializeAccountMeta` |
| `src/lib/editor/account.test.ts` | 신규 — 위 4개 함수에 대한 유닛 테스트 9건 |
| `src/lib/editor/folder.ts` | `createPersonalFolder`가 `initializeAccountMeta`를 호출하도록 수정 |
| `src/lib/editor/folder.test.ts` | `createPersonalFolder` 테스트가 `accountMeta` 초기화 호출까지 검증하도록 보강(`getPageProperty`/`upsertPageProperty` mock 추가) |
| `docs/superpowers/tasks/P5-1-account-data-model/{task,plan,result,test}.md` | 이 작업의 4파일 |
| `docs/product/prd.md` | 체크리스트 P5-1 완료 표시(이 커밋 직후 갱신) |

## 커밋 내역
| SHA | 메시지 |
|-----|--------|
| (PR에서 확인) | feat: add account data model with onboarding-ready defaults (Phase 5, P5-1) |

## 자체 검토 (Self-Review)
### 긍정 사항
- 기존 `deleted-documents.ts`/`publish.ts`가 이미 쓰던 "property 없으면 기본값" 하위 호환 패턴을 그대로 재사용해, 이 기능 도입 이전에 만들어진 계정 폴더도 코드 변경 없이 자연스럽게 동작한다(data-spec.md 마이그레이션 정책과 일치).
- `accessEnabled`를 `saveAccountMeta`(사용자 스스로 호출하는 API)로는 바꿀 수 없게 타입·구현 양쪽에서 막아, 이후 항목(P5-4 계정 정보 수정 팝업)이 실수로 이 값을 노출해도 실제로 바뀌지 않는다 — 접속 권한은 오직 관리자 스크립트(P5-6)만 다룬다는 설계를 코드 수준에서 강제한다.

### 주의사항
- `saveAccountMeta`가 매번 `getAccountMeta`로 기존 값을 먼저 읽고 다시 쓴다(낙관적 동시성 검사 없음) — 계정 정보 수정은 본인만 하는 동작이라 동시 수정 충돌 가능성이 사실상 없다고 보고 P0-3 같은 버전 검사는 넣지 않았다. 페이지 공유(Phase 6)와는 무관한 판단이다.

### 우려사항
- 없음.
