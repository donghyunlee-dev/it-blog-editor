# Architecture: SFOOD IT Editor

## 개요
- 사내 직원이 WYSIWYG 에디터로 문서를 작성해 Confluence에 보관하고, 원할 때 Tech Blog 등 외부 뷰어에 게시하는 사내 전용 문서 작성·게시 도구다.
- 실행 환경은 웹 브라우저, 예상 사용자 규모는 조직·다수(10명+)다. 배포는 AWS 클라우드, 별도 스테이징 환경 없이 단일 환경으로 운영한다.
- 자체 데이터베이스는 두지 않고 Confluence Cloud를 유일한 저장소로 사용한다. 로그인은 사내 SSO 대행 서비스(AX Auth)와 연동하고, 운영 이상 감지는 Slack Webhook으로 알린다.
- 개발은 Claude(AI)와 개발자가 함께 진행하며, GitHub로 버전 관리하고 GitHub Actions로 lint/build를 검증한다. 사내 대외비 데이터를 다루므로 접근 통제(초안 비공개)가 설계 초기부터 반영된다.

## 시스템 구성도

```
[브라우저]
   │
   ▼
[SFOOD IT Editor] (Next.js 16, App Router, AWS 배포)
   ├─ 인증: next-auth(Auth.js) v5 ── AX Auth(사내 SSO 대행 서비스) 연동
   ├─ 도메인 계층: src/lib/editor/*.ts (documents / folder / publish / images / markdown)
   ├─ 저수준 연동 계층: src/lib/confluence/client.ts (Confluence REST v2 우선, 일부 v1)
   └─ 알림: src/lib/notifications/slack.ts ── Slack Incoming Webhook
         │
         ▼
[Confluence Cloud] (유일한 데이터 저장소, 서비스 계정 Basic Auth)
   └─ {계정(이메일)} 폴더 (제한 없음, Space 공개) — 계정별로 생성
         └─ 문서 페이지들 (초안=서비스 계정 전용 제한 / 게시=제한 없음 — restriction으로만 구분,
                          2026-08-28부터 "초안"/"게시" 서브폴더로 이동시키지 않는다. P0-8 참고)

[Tech Blog Viewer] (별도 프로젝트, 이 서비스 범위 밖)
   └─ 자체 Confluence 자격증명으로 "게시" 문서를 직접 읽고, 댓글을 직접 쓴다(트리 탐색이 아니라 라벨/API 기반 조회)
```

- 이 서비스는 항상 하나의 공용 Confluence 서비스 계정으로만 Confluence를 호출한다. 로그인한 직원의 실제 신원은 Confluence 계정과 무관하며, content property(`authorMeta.actualAuthorEmail`)로만 구분한다.
- Tech Blog Viewer는 별도 리포지토리이며, 이 서비스와 API로 직접 통신하지 않는다. 둘 다 같은 Confluence Space를 저장소로 공유하되, 각자 자신의 서비스 계정으로 접근한다.

## 기술 스택 제안
- **프레임워크**: Next.js 16(App Router) + React 19 + TypeScript — 이미 채택되어 구현 중. 서버 컴포넌트(`src/app/editor/**/page.tsx`)로 데이터 조회, 클라이언트 컴포넌트(`src/components/editor/*.tsx`, `"use client"`)로 상호작용을 분리한다.
- **에디터 엔진**: TipTap(ProseMirror 기반) — WYSIWYG 편집, 슬래시 삽입 메뉴(`@tiptap/suggestion`), 텍스트 선택 시 뜨는 버블 툴바(`BubbleMenu`), 표 병합 등을 공식 익스텐션으로 지원해 직접 구현할 부분이 적다. 문서 원본은 TipTap JSON(ProseMirror 트리)으로 저장하고, Confluence storage format으로의 변환은 자체 변환기(`tiptap-to-storage`)를 새로 작성한다.
- **UI 컴포넌트/스타일**: 사내 디자인 시스템 `@sfood/ui` + Tailwind CSS(이번에 신규 도입). 화면을 직접 마크업하지 않고 `@sfood/ui`의 컴포넌트·템플릿을 우선 사용한다. 상세는 [design.md](./design.md) 참고. `@sfood/ui@0.1.2`는 React 19와 호환되지 않는 버그(번들에 인라인된 jsx-runtime이 React 19에서 이름이 바뀐 내부 API를 읽어 import 시점에 크래시)가 있어 `patch-package`로 임시 패치를 적용 중이다 — 패치 내용·제거 조건은 [`patches/README.md`](../../patches/README.md) 참고.
- **인증**: next-auth(Auth.js) v5, Credentials 프로바이더로 AX Auth와 연동. 세션에는 이메일만 저장하고, 그 외 개인정보는 다루지 않는다.
- **데이터 저장소**: 별도 DB 없음. Confluence Cloud REST API가 저장소 역할을 겸한다 — 서버 운영 부담과 데이터 이중화 문제를 줄이는 대신, Confluence API 제약(GDPR상 이메일 기반 계정 조회 불가, v1/v2 API 기능 차이 등)을 그대로 감당해야 한다는 트레이드오프가 있다.
- **배포**: AWS Lambda([Issue #6](https://github.com/sfood-pioneer-1st/sfood-it-editor/issues/6)에서 2026-08-30 확정, P2-3). 컨테이너(ECS)/Amplify 등 다른 서버리스 옵션은 기각됐다. Next.js를 Lambda에 올리는 구체적인 어댑터(OpenNext 등)·빌드 출력 모드·IaC 구성은 이 결정과 별개의 문제로 실제 배포 착수 시점에 정한다(범위 밖, `docs/superpowers/tasks/P2-3-lambda-secrets/task.md` 참고).
- **CI**: GitHub Actions로 lint/build 검증(이미 구성됨, `ci: add lint/build GitHub Actions workflow`).

## 데이터 및 인증

**데이터 저장**
Confluence Cloud가 유일한 저장소다. 문서 관련 데이터는 페이지 본문이 아니라 content property와 라벨에 나누어 저장한다.

| 데이터 | 저장 위치 |
|---|---|
| 문서 본문 원본(TipTap JSON) | content property `sourceDocument` |
| 작성자 식별 | content property `authorMeta.actualAuthorEmail` |
| 게시 여부·slug·메타 설명(뷰어별) | content property `publishMetadata` |
| 태그 | Confluence 네이티브 페이지 라벨(label) |
| 댓글 작성자 식별 | 댓글 content에 딸린 content property `commenterMeta` (Viewer 프로젝트가 사용) |
| 계정 정보(이름·팀·접속 허용 여부) | 계정 폴더 content property `accountMeta` (2026-09-03 추가) |
| 전체 계정 목록(검색용) | Space 최상단 "계정 관리" 페이지의 content property `accountIndex` (2026-09-03 추가) |
| 공유 대상·마지막 수정자 | 문서 content property `sharingMeta` (2026-09-03 추가) |
| 공유받은 문서 참조(빠른 목록 조회용) | 공유 대상 계정 폴더의 content property `sharedDocumentRefs` (2026-09-03 추가, P1-2b의 `deletedDocuments`와 같은 패턴) |

세부 스키마는 `data-spec.md`에 정리한다.

**인증**
- AX Auth(사내 SSO 대행 서비스, `https://ax-auth.s-food.ai`)와 리다이렉트 방식으로 연동한다: `GET /auth/login/{clientId}` → 콜백 `/api/auth/ax-callback` → `POST /auth/token/verify`로 토큰 검증 → next-auth 세션 생성.
- next-auth 세션은 이메일만 보유하며, 이 이메일이 개인 폴더 식별자와 문서 작성자 식별자로 그대로 쓰인다.
- Confluence 접근은 로그인한 직원의 신원과 완전히 분리된, 고정된 서비스 계정(Basic Auth: email + API 토큰)으로만 이루어진다.
- **접속 권한 게이트(2026-09-03 추가)**: AX Auth 로그인(next-auth 세션 발급) 자체는 계정 상태와 무관하게 항상 성공한다. 이후 `/editor` 진입 시(서버 컴포넌트 `layout.tsx` 또는 이에 준하는 서버 측 진입점)와 `/api/editor/**` 요청 시 계정 폴더의 `accountMeta.accessEnabled`를 함께 확인해, `false`면 메인 화면 대신 안내 화면으로 보내고 API는 403(`ACCESS_DISABLED`)을 반환한다. 신규 가입자는 기본값 `true`(즉시 사용 가능)이며, 관리자가 필요한 계정만 개별적으로 `false`로 바꾼다.
- **온보딩(2026-09-03 추가, 같은 날 페이지 방식으로 재구성)**: 계정 폴더에 `accountMeta.name`/`team`이 비어 있으면(첫 로그인) 온보딩 완료 전으로 간주한다. 처음엔 `/editor` 화면 위 Modal로 구현했으나 "메인에서 팝업으로 받는 방식은 아니다, 계정을 못 찾으면 환영 페이지로 이동했다가 완료 시 메인으로 가야 한다"는 피드백으로 전용 페이지(`/welcome`)+리다이렉트 흐름으로 바꿨다 — `/editor/layout.tsx`가 `needsOnboarding`이면 `/welcome`로 보내고, `/welcome`은 저장 완료 시 `/editor`로 돌아간다(design.md의 "온보딩 — Modal에서 전용 페이지로 전환" 참고). 온보딩과 접속 권한 게이트는 서로 독립적이다 — 접속이 차단(N)된 계정은 온보딩 여부와 무관하게 메인 진입 자체가 막힌다.

## 알림 및 자동화
- **알림 채널**: Slack Incoming Webhook 하나. Confluence 연동 실패 등 분류되지 않은 오류가 발생하면 `notifyUpstreamFailure()`가 알림을 보낸다. 알림 전송 자체가 실패해도 API 응답에는 영향을 주지 않고 서버 로그에만 남긴다.
- **자동화**: 정기 실행·배치 처리는 없다. 유일한 자동화 성격의 동작은 오류 발생 시 즉시 알리는 이상 감지뿐이며, 별도의 스케줄러나 큐가 필요하지 않다.
- AX Auth의 메일 발송 기능(`sendMail`)은 구현되어 있으나 현재 어디서도 호출되지 않는다. 향후 댓글 알림 등에 쓰일 수 있음을 염두에 두고 있으나, 이번 설계 범위에는 포함하지 않는다.

## 협업 및 운영 도구 연동
- **개발 AI Agent**: Claude(Claude Code)로 개발을 진행한다.
- **업무·협업 도구**: Confluence(저장소), Slack(알림), GitHub(버전 관리·CI).
- **코드 버전 관리**: Git/GitHub 사용. GitHub Actions로 lint/build를 검증한다.
- **테스트 환경**: 별도 스테이징 환경 없이 단일 환경으로 운영한다. 규모가 커지면 스테이징 분리를 재검토할 수 있다.

## 보안 및 규정 준수
- 다루는 문서는 사내 대외비로 분류될 수 있는 사내 기술 문서다. 개인정보·결제 정보는 다루지 않는다.
- **초안 비공개가 핵심 보안 요건이다.** Confluence Space 자체는 IT팀 외 직원도 접근 가능하므로, 작성 중인 초안이 다른 직원에게 노출되지 않도록 다음을 지킨다.
  - 문서(계정 폴더 바로 하위) 생성 시점에 Confluence 페이지 제한(Restriction)을 명시적으로 적용한다(상속에 의존하지 않음). **2026-08-28 갱신(P0-8)**: 예전에는 이 제한 여부를 "초안"/"게시" 서브페이지 위치와 짝지어 관리했는데, 그 서브페이지 구분을 없애고 이제는 문서 자체의 restriction 상태 하나로만 관리한다(계정 폴더 자신에는 여전히 제한을 걸지 않는다).
  - 제한 대상은 직원 개인 계정이 아니라 서비스 계정 자신(`getCurrentConfluenceUser()`로 얻은 accountId)이다 — Confluence Cloud가 GDPR 정책상 이메일로 계정을 조회하는 기능을 서비스 계정 권한으로 지원하지 않기 때문에, 직원별 개별 제한 대신 이 방식을 택했다.
  - 게시 시 제한을 해제해 Space 구성원 전체에게 공개하고, 게시 취소 시 다시 제한을 건다.
  - 계정 폴더(이메일이 제목)는 제한 없이 노출된다 — "이 직원이 서비스를 쓰고 있다"는 사실은 알 수 있지만, 초안 "내용"은 그 문서 자체에 걸린 제한으로 노출되지 않는다.
- **계정 접속 차단(2026-09-03 추가)**: `accountMeta.accessEnabled=false`인 계정은 AX Auth 로그인은 통과하지만 이후 모든 `/editor` 화면·`/api/editor/**` 요청이 차단된다. 관리자가 이 값을 바꾸는 전용 화면은 이번 범위에 없다 — 서비스 계정 자격증명에 접근 가능한 개발자/운영자가 `scripts/set-account-access.ts`(P5-6)를 로컬에서 직접 실행해 특정 계정의 `accountMeta.accessEnabled`를 수정하는 수동 운영 방식을 택했다(2026-09-03 사용자와의 대화로 결정 — 별도 관리자 화면은 필요해지면 이후 단계에서 재논의).
- Confluence 서비스 계정 자격증명(`CONFLUENCE_API_TOKEN`), AX Auth 클라이언트 시크릿, Slack Webhook URL은 모두 환경변수로 관리한다(`.env`, 저장소에 커밋하지 않음, `.gitignore`에 등록됨). **2026-08-30 결정(Issue #6, P2-3)**: 1차 개발에서는 AWS Secrets Manager·SSM Parameter Store 같은 별도 시크릿 매니저 서비스를 도입하지 않고, Lambda 함수 자체의 환경변수(Secret value) 설정 기능을 그대로 쓴다 — 애플리케이션 코드(`src/lib/env.ts`의 `requireEnv`)는 `process.env`만 읽으므로 로컬 `.env`든 Lambda 환경변수든 코드 변경 없이 동일하게 동작한다. 시크릿 매니저 도입은 필요해지면(예: 시크릿 로테이션 자동화, 여러 서비스 간 공유) 별도로 재논의한다.

## 배포 전략
- **배포 위치**: AWS. 별도 스테이징 없이 단일 프로덕션 환경으로 운영한다.
- **일정**: 목표 일정은 "보통(1~3개월)" 수준으로, 견고함과 속도의 균형을 고려한 단계적 접근을 권장한다.
  1. 1단계 — 이번 설계의 핵심인 Confluence 콘텐츠 구조(초안/게시 생명주기, 숨김 메커니즘, 태그, 게시 메타데이터 확장, 댓글 저장 구조) 구현. 착수 전 스파이크로 다음 4가지를 검증했다(모두 실제 Confluence 인스턴스로 확인 완료, 상세는 [confluence-content-structure-design.md](../superpowers/specs/2026-08-21-confluence-content-structure-design.md)의 "검증이 필요한 가정" 참고).
     - Confluence v2 페이지 API가 parentId 변경(이동)을 지원하는지 → ✅
     - 페이지 제한(Restriction) API가 v2에 없어 v1 REST API 사용이 필요한지 → ✅
     - 서비스 계정이 자기 자신에게 건 제한이 자신의 API 호출을 막지 않는지 → ✅
     - 제한 없는 계정 폴더 하위에서 "초안"만 제한된 상태일 때, 제한 없는 "게시" 서브페이지·문서가 형제 페이지의 제한과 무관하게 독립적으로 유지되는지 → ✅(2026-08-25 확인)
  2. 2단계 — 개인 에디터 기능 강화(상세 요구사항은 별도 논의).
  3. 이후 — 실제 AWS 배포 구성 확정. 배포 서비스(AWS Lambda)와 시크릿 관리 방식(Lambda 환경변수, 별도 시크릿 매니저 없음)은 2026-08-30([Issue #6](https://github.com/sfood-pioneer-1st/sfood-it-editor/issues/6), P2-3)에 이미 결정됐다 — 남은 것은 Next.js를 Lambda에 올리는 구체적인 어댑터·빌드 구성·도메인/HTTPS 설정뿐이다.
- **개발 방식**: AI(Claude)와 개발자가 병행 — Claude가 코드/설계 초안을 만들고 개발자가 검증·다듬는 흐름을 유지한다.

## 트레이드오프 및 대안
- **자체 DB 없이 Confluence를 저장소로 사용**: 별도 DB 운영 부담이 없고 Confluence 검색·권한 체계를 그대로 활용할 수 있는 대신, GDPR 제약으로 인한 계정 조회 불가, v1/v2 API 파편화, 속도(매 요청마다 외부 API 호출) 등의 제약을 감수해야 한다. 별도 DB를 두는 대안은 데이터 이중화와 동기화 문제를 만들어 기각했다.
- **초안 숨김 방식 — 페이지별 제한(Restriction) vs 별도 Space 분리**: 초안/게시를 하나의 Space 안에서 페이지 이동 + 제한으로 처리하는 방식을 택했다. 별도 Space로 분리하는 대안은 권한 관리가 더 명확해질 수 있으나, Space 생성에 통상 사이트 관리자 권한이 필요하고 기존 코드의 "Space 1개" 가정을 크게 바꿔야 해 이번 단계에서는 과한 것으로 판단해 기각했다.
- **제한 대상 — 서비스 계정 자신 vs 직원 개인 계정**: 직원별로 개별 Confluence 계정에 제한을 거는 방식이 더 정교하지만, Confluence Cloud의 GDPR 정책상 이메일로 계정을 조회할 수 없어 기술적으로 막힐 가능성이 크다. 서비스 계정 자신에게 제한을 거는 방식은 이 문제를 완전히 회피하면서 요구사항(다른 직원에게 숨김)을 동일하게 만족한다.
- **공유 문서 동시 편집 — 실시간 잠금/공동편집 vs 기존 버전 충돌 감지 재사용(2026-09-03 결정)**: 페이지 공유로 여러 사람이 같은 문서를 편집할 수 있게 되면서 동시 수정 충돌 처리 범위를 정해야 했다. Google Docs류의 실시간 공동편집(OT/CRDT)이나 편집 시작 시 다른 사용자를 막는 잠금(락) 기능은 WebSocket 등 새 인프라가 필요해 이번 범위에서는 기각했다. 대신 이미 구현된 낙관적 동시성 제어(P0-3, 저장 시점 버전 불일치를 409로 감지)를 공유 문서에도 그대로 적용하고, 문서에 `sharingMeta.lastEditedBy`(이메일·이름·수정 시각)를 추가해 편집 화면에 "마지막 수정자"를 표시하는 것으로 범위를 정했다 — 실시간 충돌 방지는 아니지만, 누가 언제 마지막으로 수정했는지 알 수 있어 충돌 발생 빈도를 줄이고 발생 시 원인 파악을 돕는다. 더 강한 보장(실시간 잠금)이 필요해지면 별도 인프라 도입을 전제로 재논의한다.
- **계정 검색 — 전체 계정 인덱스 페이지 vs 온디맨드 스캔(2026-09-03 결정)**: 페이지 공유의 "공유 대상 검색"과 관리자의 계정 상태 확인에 공용으로 쓸 계정 검색이 필요했다. Space 전체를 매번 스캔하는 대신, 사용자가 제안한 대로 Space 최상단에 "계정 관리" 페이지 하나를 두고 그 `accountIndex` property(전체 계정의 이메일·이름·팀·접속 허용 여부 배열)만 읽어 검색한다 — 기존 slug 인덱스(P0-5a)·삭제된 문서 인덱스(P1-2b)와 같은 "직접 기록해둔 상태만 신뢰" 패턴이다. 계정 수가 많아지면(수백~수천) 배열 전체를 매번 읽는 방식이 느려질 수 있다는 한계가 있으나, 현재 규모(조직·다수 10명+)에서는 충분하다고 판단했다.
- **초안/게시됨 계층 순서 — 루트 분리 vs 계정 폴더 내부 분리(2026-08-24 결정)**: 처음에는 "Space 홈페이지 → 초안 루트/게시됨 루트 → 계정 폴더" 순서였으나, "Space 홈페이지 → 계정 폴더 → 초안/게시" 순서로 뒤집었다. 후자는 관리자의 사전 루트 페이지 생성·수동 Restriction 설정이라는 운영 작업을 완전히 없애는 대신, 계정 폴더(이메일)가 Space 구성원에게 노출되고 게시 문서가 작성자별로 흩어져 Confluence UI 트리 탐색만으로 전체 게시 문서를 한눈에 보기 어려워진다. 두 트레이드오프 모두 검토 후 수용하기로 결정했다 — 상세는 [confluence-content-structure-design.md](../superpowers/specs/2026-08-21-confluence-content-structure-design.md)의 "개정 이력" 참고.
- **게시 여부 판단 — 물리적 이동 vs property만 사용(2026-08-28 결정, P0-8)**: 위 두 항목이 전제했던 "초안"/"게시" 서브페이지 자체를 나중에 완전히 제거했다. 애초에 서브페이지를 나눴던 이유(Confluence UI 트리 탐색으로 초안/게시를 구분해본다는 전제)가 "아무도 Confluence를 직접 열어보지 않는다"는 후속 결정으로 사라졌고, 남은 이점(문서함 조회 시 위치만으로 게시 여부를 공짜로 판단)도 P0-7(표시 제목을 위해 이미 문서마다 추가 property 조회를 하게 됨)로 무의미해져, 물리적 이동 없이 restriction + `publishMetadata.isPublished`만으로 게시 여부를 관리하는 방식으로 되돌렸다. 재시도 안전성(메타데이터 기록 실패 시에도 안전하게 수렴)은 restriction 적용/해제가 멱등 연산이라는 점으로 대체했다.
