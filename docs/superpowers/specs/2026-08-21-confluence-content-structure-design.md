# Confluence 콘텐츠 구조 설계

- 날짜: 2026-08-21
- 서브 프로젝트: SFOOD IT Editor 기획/설계 보강 — 1차(콘텐츠 구조). 2차(개인 에디터 기능 강화)는 별도 브레인스토밍으로 진행 예정.
- 관련 문서: [docs/product/requirements.md](../../product/requirements.md), [docs/product/architecture.md](../../product/architecture.md), [docs/product/prd.md](../../product/prd.md), [docs/product/data-spec.md](../../product/data-spec.md), [docs/product/api-spec.md](../../product/api-spec.md)

## 배경

기존 스캐폴딩은 "Space 홈페이지 하위 = 이메일 제목의 개인 폴더 = 그 하위 문서" 라는 1단계 구조뿐이었고, 게시(publish)는 문서를 별도 위치로 복사하는 것이 아니라 같은 페이지에 `isPublished` content property만 붙이는 방식이었다. 즉 초안이든 게시본이든 같은 Confluence 페이지가 항상 같은 자리에 있다.

이 서비스가 접근하는 Confluence Space는 IT팀 외 다른 직원도 열람 가능한 Space다. 따라서 초안이 다른 직원에게 노출될 수 있다는 문제가 있었고, 이를 포함해 태그, 게시 메타데이터의 확장성, 댓글 저장 구조까지 함께 설계했다.

## 확정된 요구사항

1. 초안(작성 중인 문서, 개인 폴더)은 작성자 본인 외 어떤 직원에게도 보이면 안 된다.
2. 게시하는 순간 제한이 해제되어 Space 구성원 누구나 볼 수 있어야 한다.
3. 문서 분류는 폴더 계층이 아니라 다중 태그로 한다.
4. 새 문서의 초기 내용은 지금처럼 빈 백지(제목+본문)로 유지한다 — 템플릿 도입 안 함(YAGNI).
5. 게시 메타데이터는 향후 다른 뷰어가 추가되어도 확장 가능한 구조로 잡는다(지금은 Tech Blog 하나뿐).
6. 댓글(footer comment) 기능은 이번 설계에 "저장 구조"로 포함한다. 다만 실제 API 연동은 별도 Viewer 프로젝트(자체 Confluence 자격증명 보유)의 책임이며, 이 프로젝트는 스키마만 정의한다.
7. 모든 Confluence 쓰기는 항상 공용 서비스 계정으로 이루어진다. AX Auth(MS) 로그인은 앱 사용자를 식별할 뿐 Confluence 상의 실제 신원과 무관하며, 실제 작성자 식별은 항상 content property로만 한다.
8. 아직 실사용 데이터가 없어 마이그레이션은 필요 없다.

## 검토한 접근법 — 초안 숨김 메커니즘

**접근법 A — 페이지별 Restriction, 직원 개인 계정 대상 (기각)**
문서/폴더 생성 시 작성자 개인의 Confluence accountId에 read/update 제한을 건다. Confluence Cloud는 GDPR 정책상 이메일로 계정을 조회하는 기능을 서비스 계정 권한으로 지원하지 않아, AX Auth 이메일 → Confluence accountId 매핑 수단이 없다. 기술적으로 막힐 가능성이 커 기각.

**접근법 B — 초안/게시됨 루트 분리 + 이동 (채택)**
Space 홈페이지 아래 "초안(Drafts Root)" / "게시됨(Published Root)" 두 루트 페이지를 두고, 게시 여부에 따라 문서 페이지를 두 루트 사이로 이동(parentId 변경)한다. 계정 매핑이 전혀 필요 없다.

**접근법 C — Space 자체 분리 (기각)**
초안용/게시용 Space를 분리하는 방식. Space 생성은 보통 사이트 관리자 권한이 필요해 서비스 계정 권한 범위를 벗어날 가능성이 높고, 기존 코드의 "Space 1개" 가정을 크게 바꿔야 해 이번 단계에는 과함(YAGNI).

## 채택한 설계

### 전체 구조

```
Space 홈페이지
├── 초안 (Drafts Root)
│   ├── {author-email-1}  (개인 폴더)
│   │   ├── 문서 A (draft)
│   │   └── 문서 B (draft)
│   └── {author-email-2}
│       └── 문서 C (draft)
└── 게시됨 (Published Root)
    ├── 문서 A (published)
    └── ...
```

- 개인 폴더는 지금과 동일하게 이메일 제목의 페이지 하나이며, 위치만 "초안" 루트 아래로 옮긴다.
- "게시됨" 루트 하위는 평평한 목록이다(작성자별 하위 폴더 없음) — 분류는 태그로 한다.
- 게시(publish): 문서 페이지의 parent를 `초안/{email}` → `게시됨`으로 변경. 게시 취소는 반대로 이동.
- 최초 1회, 관리자가 두 루트 페이지를 만들고 "초안" 루트에 수동으로 Restriction을 설정하는 운영 작업이 필요하다(코드 범위 밖).

### 숨김 메커니즘 — 상속에 의존하지 않는 명시적 제한

최초 설계에서는 "부모 페이지의 Restriction이 하위 페이지에 상속된다"고 가정했으나, 이는 근거가 약한 가정이다. Confluence의 페이지 Restriction은 기본적으로 페이지별로 개별 적용되며, "이 아래 모든 페이지에 적용"은 그 순간 존재하는 하위 페이지에 일괄 복사하는 1회성 동작에 가깝다. API로 나중에 새로 만드는 페이지가 자동으로 상속받는다고 보장할 수 없다.

**보완된 방식**: 개인 폴더·문서를 생성하는 시점에 그 페이지에 명시적으로 Restriction을 건다(상속을 신뢰하지 않음).

- 제한 대상은 **직원 개인 계정이 아니라 서비스 계정 자신**이다. 이미 구현된 `getCurrentConfluenceUser()`(`/rest/api/user/current`)로 서비스 계정의 accountId를 얻어 그 accountId만 read/update 허용 목록에 둔다.
- 이 방식은 직원 이메일 → Confluence 계정 매핑이 전혀 필요 없어, 접근법 A에서 문제였던 GDPR 제약을 그대로 피해간다.
- 게시 시 Restriction을 제거(→ Space 기본 권한으로 공개), 게시 취소 시 다시 적용한다.

### 태그

Confluence 네이티브 페이지 라벨(label) 기능을 사용한다. 커스텀 property를 새로 만들지 않고, Confluence의 라벨 검색(CQL `label = "..."`)을 그대로 활용한다. 다중 라벨 허용, 사전 정의된 카테고리 목록 없음(자유 텍스트).

### 게시 메타데이터 — 뷰어별 확장 구조

```ts
interface PublishMetadata {
  isPublished: boolean;
  publishedAt?: string;
  viewers: {
    [viewerId: string]: {   // 예: "tech-blog"
      slug: string;
      metaDescription: string;
    };
  };
}
```

- 기존 `targetViewers: string[]` 필드는 제거하고 `Object.keys(viewers)`로 대체한다(중복 정보 제거).
- slug 중복 체크(`findPublishedPageBySlug`)는 뷰어별로 분리해서 검사한다 — 뷰어가 다르면 같은 slug를 써도 충돌이 아니다.
- 지금은 `viewers.tech-blog` 하나만 채우면 되고, 나중에 다른 뷰어가 생기면 같은 문서를 다른 slug/설명으로 그 뷰어에도 노출할 수 있다.

### 댓글 저장 구조 (스키마만 정의)

Viewer(별도 프로젝트)가 자체 Confluence 자격증명으로 직접 댓글을 쓰고 읽는다는 전제이므로, 여기서는 두 프로젝트가 공유해야 하는 저장 규칙만 정의한다.

- 댓글 본문은 `createFooterComment`의 `body.storage.value`(HTML)를 그대로 사용한다.
- 작성자 식별은 문서와 동일한 패턴 — 댓글 content에 딸린 content property로 저장한다.
  ```ts
  // property key: "commenterMeta", attached to the footer-comment's content id
  interface CommenterMeta {
    email: string;
    name: string;
    isEmployee: boolean; // AX Auth 로그인 여부
  }
  ```
- AX 로그인 상태면 `email`/`name`을 세션에서 채우고 `isEmployee: true`. 비로그인이면 사용자가 입력한 값을 그대로 저장하고 `isEmployee: false`.
- Confluence의 댓글 작성자(API 응답상 항상 Viewer의 서비스 계정)와 이 property의 `email`이 다르다는 점을 두 프로젝트가 공유해서 인지해야 한다.

## 검증이 필요한 가정 (구현 착수 전 스파이크로 확인)

1. Confluence v2 페이지 API(`PUT /api/v2/pages/{id}`)가 `parentId` 변경(페이지 이동)을 지원하는지. 지원하지 않으면 v1 API로 대체해야 한다.
2. 페이지 Restriction API가 v2에 없을 가능성이 높다 — 첨부파일 업로드가 이미 v1으로 대체된 전례처럼, v1 `/rest/api/content/{id}/restriction/byOperation/{read|update}`를 사용할 가능성이 크다.
3. 서비스 계정 자신에게 거는 제한이 서비스 계정의 이후 API 호출 자체를 막지 않는지(제한 대상=자기 자신이므로 문제 없을 것으로 예상하지만 실제 확인 필요).

이 3가지는 Phase 1 구현 착수 전에 실제 Confluence 인스턴스로 먼저 확인한다.

## 범위 밖

- 개인 에디터 기능 강화(툴바, 미리보기, 자동저장 등) — 2차 서브 프로젝트, 별도 브레인스토밍에서 다룬다.
- 댓글 작성/조회 API·화면 구현 — 별도 Viewer 프로젝트 범위.
- 기존 데이터 마이그레이션 — 실사용 데이터 없어 불필요.
- 실제 AWS 배포 구성(컨테이너/서버리스 선택 등) — [architecture.md](../../product/architecture.md)에서 다음 단계로 남겨둠.
