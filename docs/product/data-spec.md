# 🗄️ 데이터 설계서 — SFOOD IT Editor

## 개요
- 이 서비스는 별도의 데이터베이스를 두지 않는다. Confluence Cloud의 페이지(Page)·페이지 라벨(Label)·콘텐츠 속성(Content Property)·댓글(Footer Comment)이 곧 데이터 저장소다.
- 그래서 아래 "테이블 명세"는 SQL 테이블이 아니라, 각 Confluence 콘텐츠에 어떤 속성(Content Property)이 어떤 형태로 붙는지를 정리한 것이다.
- 관련 문서: [requirements.md](./requirements.md), [architecture.md](./architecture.md), [prd.md](./prd.md)

## 엔티티 목록
| 엔티티 | 설명 | prd.md 관련 기능 |
|---|---|---|
| DraftsRoot / PublishedRoot | Space 홈페이지 하위의 고정 루트 페이지 2개 | 초안-게시 생명주기 |
| PersonalFolder | 이메일 제목의 개인 폴더 페이지(DraftsRoot 하위) | 내 문서함 조회 |
| Document | 실제 문서 페이지(개인 폴더 또는 PublishedRoot 하위) | 문서 작성·수정·삭제, 초안-게시 생명주기, 태그, 게시 메타데이터 |
| Comment | 문서에 달린 Confluence footer comment | 댓글 저장 구조(범위: 스키마만) |

## 테이블 명세

### 테이블 — DraftsRoot / PublishedRoot
Confluence 페이지 그 자체이며, 별도 content property는 없다. 최초 1회 운영자가 수동으로 생성하고, `DraftsRoot`에는 서비스 계정 전용 Restriction을 수동으로 설정한다(README.md의 "최초 1회 운영 작업" 참고).

두 루트 페이지의 pageId를 환경변수로 주입하지 않는다. `src/lib/editor/roots.ts`의 `getContentRoots()`가 `CONFLUENCE_SPACE_KEY`로 지정된 Space의 홈페이지 하위에서 **제목 완전 일치**로 두 페이지를 찾아낸다(제목이 곧 식별자이므로 페이지를 다시 만들거나 옮겨도 환경변수를 고칠 필요가 없다). 두 페이지 중 하나라도 없으면 `getContentRoots()`가 오류를 던지고, 개인 폴더 생성·문서 목록 조회 등 관련 기능이 동작하지 않는다.

| 속성 | 타입 | 제약조건 | 설명 |
|---|---|---|---|
| pageId | string | Confluence가 발급, 불변 | 애플리케이션이 제목으로 조회해 런타임에 얻는다(환경변수 없음) |
| title | string | 고정값("초안", "게시됨"), Space 홈페이지 하위에서 unique | 루트 페이지의 실질적 식별자. 운영자가 Confluence UI에서 직접 지정하며, 변경하면 조회가 실패한다 |
| parentId | string | 항상 Space 홈페이지의 pageId | 홈페이지 직속 하위여야 조회된다 |

### 테이블 — PersonalFolder (Confluence Page)
| 속성 | 타입 | 제약조건 | 설명 |
|---|---|---|---|
| pageId | string | Confluence 발급 | 페이지 고유 ID |
| title | string | = 작성자 이메일, DraftsRoot 하위에서 unique | 개인 폴더 식별자 |
| parentId | string | 항상 DraftsRoot의 pageId | 항상 초안 루트 하위에 고정 |
| restriction | Confluence Restriction | 생성 시 항상 서비스 계정으로 제한 | 다른 직원에게 노출 방지 |

### 테이블 — Document (Confluence Page + Content Property + Label)
| 속성 | 타입 | 제약조건 | 설명 |
|---|---|---|---|
| pageId | string | Confluence 발급 | 문서 고유 ID |
| title | string | 필수 | 문서 제목 |
| body(storage format) | string(XHTML) | markdownToStorageFormat() 산출물 | 렌더링용, 편집 원본이 아님 |
| parentId | string | PersonalFolder(초안) 또는 PublishedRoot(게시) 중 하나 | 게시 여부에 따라 이동 |
| restriction | Confluence Restriction | 초안=서비스 계정 제한, 게시=제한 없음 | 초안-게시 생명주기의 핵심 |
| property: `sourceDocument` | `{ doc: JSONContent }` | 필수 | 편집 원본(TipTap/ProseMirror JSON 트리). 2차 UI/UX 설계(WYSIWYG 전환)에서 `sourceMarkdown`을 대체함 — Markdown이 아니라 에디터 고유 문서 트리를 그대로 저장 |
| property: `authorMeta` | `{ actualAuthorEmail: string }` | 필수, 불변 | 실제 작성자 식별(Confluence 신원과 무관) |
| property: `publishMetadata` | `{ isPublished: boolean; publishedAt?: string; viewers: { [viewerId: string]: { slug: string; metaDescription: string } } }` | `isPublished=true`이면 `viewers`에 최소 1개 항목 필요 | 뷰어별로 slug·메타 설명을 따로 관리 |
| label(태그) | string[] | 자유 텍스트, 다중 허용 | Confluence 네이티브 라벨 기능 사용 |

**slug 유니크 제약**: 동일 `viewerId` 내에서 slug는 유니크해야 한다(다른 뷰어끼리는 같은 slug를 써도 충돌 아님). 애플리케이션 레벨에서 `findPublishedPageBySlug`가 PublishedRoot 하위 문서를 순회하며 검사한다(Confluence 자체에는 유니크 제약이 없음).

### 테이블 — Comment (Confluence Footer Comment + Content Property)
이 프로젝트는 이 구조를 정의만 하고, 실제 생성/조회는 별도 Viewer 프로젝트가 자체 Confluence 자격증명으로 수행한다.

| 속성 | 타입 | 제약조건 | 설명 |
|---|---|---|---|
| commentId | string | Confluence 발급 | 댓글 고유 ID |
| pageId | string | 댓글이 달린 Document의 pageId | — |
| body(storage format) | string(XHTML) | 필수 | 댓글 본문 |
| property: `commenterMeta` | `{ email: string; name: string; isEmployee: boolean }` | 필수 | 실제 작성자 식별. `isEmployee=true`면 AX Auth 세션에서 채운 값, `false`면 사용자가 직접 입력한 값 |

Confluence 상의 댓글 작성자(Confluence API 응답의 author 필드)는 항상 Viewer 쪽 서비스 계정으로 표시된다. 실제 작성자는 오직 `commenterMeta`로만 판단해야 한다.

## 관계
- DraftsRoot 1 : N PersonalFolder
- PersonalFolder 1 : N Document (초안 상태일 때)
- PublishedRoot 1 : N Document (게시 상태일 때) — 한 Document는 항상 둘 중 하나의 부모만 가지며, 게시 여부가 바뀌면 부모가 이동한다(양쪽에 동시에 존재하지 않음)
- Document 1 : N Comment

## 인덱스·제약조건
- Confluence 자체는 커스텀 인덱스를 제공하지 않는다. 조회 성능이 필요한 경로(예: slug로 문서 찾기)는 애플리케이션에서 `listAllSpacePages` 페이지네이션을 순회하는 방식에 의존하며, Space 내 문서 수가 크게 늘어나면 성능 재검토가 필요하다.
- `authorMeta.actualAuthorEmail`, `publishMetadata`는 한 페이지에 하나씩만 존재해야 한다(Confluence content property는 key당 1개 값).
- 라벨(태그)은 Confluence가 자체적으로 페이지당 다중 허용을 지원하므로 별도 제약이 필요 없다.

## 마이그레이션·데이터 정책
- 아직 실사용 데이터가 없으므로 기존 데이터 마이그레이션은 필요 없다.
- 최초 1회, 관리자가 Confluence에서 DraftsRoot/PublishedRoot 페이지를 직접 만들고 DraftsRoot에 Restriction을 수동으로 설정해야 한다(시드 데이터 성격의 운영 작업).
- 개인정보 성격의 데이터는 사내 이메일뿐이며, 별도 마스킹·암호화 없이 Confluence의 접근 제어(Restriction)로 보호한다. Confluence 서비스 계정 자격증명 자체는 이 문서가 아니라 [architecture.md](./architecture.md)의 보안 섹션에서 다룬다.
