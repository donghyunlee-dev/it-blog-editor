# 🗄️ 데이터 설계서 — SFOOD IT Editor

## 개요
- 이 서비스는 별도의 데이터베이스를 두지 않는다. Confluence Cloud의 페이지(Page)·페이지 라벨(Label)·콘텐츠 속성(Content Property)·댓글(Footer Comment)이 곧 데이터 저장소다.
- 그래서 아래 "테이블 명세"는 SQL 테이블이 아니라, 각 Confluence 콘텐츠에 어떤 속성(Content Property)이 어떤 형태로 붙는지를 정리한 것이다.
- 관련 문서: [requirements.md](./requirements.md), [architecture.md](./architecture.md), [prd.md](./prd.md)

## 엔티티 목록
| 엔티티 | 설명 | prd.md 관련 기능 |
|---|---|---|
| AccountFolder | 이메일 제목의 계정 폴더 페이지(Space 홈페이지 하위) | 내 문서함 조회 |
| Document | 실제 문서 페이지(AccountFolder 바로 하위) | 문서 작성·수정·삭제, 초안-게시 생명주기, 태그, 게시 메타데이터 |
| Comment | 문서에 달린 Confluence footer comment | 댓글 저장 구조(범위: 스키마만) |

**2026-08-28 갱신(P0-8)**: 예전에는 AccountFolder 하위에 "초안"/"게시" 두 고정 서브페이지(DraftFolder/PublishedFolder)를 두고 게시 여부에 따라 Document를 그 사이로 물리적으로 이동시켰다. "Confluence는 아무도 직접 열어보지 않는 DB일 뿐"이라는 결정(P0-7) 이후 그 구조가 필요했던 이유(사람이 트리를 탐색해 구분해본다는 전제) 자체가 사라져 두 서브페이지를 완전히 제거했다 — 이제 한 계정의 모든 Document는 AccountFolder 바로 하위에 평평하게 있고, 게시 여부는 오직 Document의 restriction과 `publishMetadata` property로만 판단한다.

## 테이블 명세

### 테이블 — AccountFolder (Confluence Page)
| 속성 | 타입 | 제약조건 | 설명 |
|---|---|---|---|
| pageId | string | Confluence 발급 | 계정 폴더 고유 ID |
| title | string | = 작성자 이메일, Space 홈페이지 하위에서 unique | 계정 식별자 |
| parentId | string | 항상 Space 홈페이지의 pageId | 최상위 고정 |
| restriction | Confluence Restriction | 없음(생성하지 않음) | Space 기본 권한 그대로 — 이메일이 Space 구성원에게 노출됨(수용된 트레이드오프) |

관리자의 사전 수동 작업은 필요 없다 — 계정 폴더가 없는 사용자가 처음 접근하면 코드가 자동으로 만든다.

### 테이블 — Document (Confluence Page + Content Property + Label)
| 속성 | 타입 | 제약조건 | 설명 |
|---|---|---|---|
| pageId | string | Confluence 발급 | 문서 고유 ID |
| title | string | `randomUUID()`로 생성 시 1회 발급, 이후 절대 변경하지 않음 | **표시용 제목이 아니다**(P0-7). Confluence는 Space 전체에서 페이지 title이 유일해야 하는데(부모가 달라도 예외 없음), 서로 다른 계정이 흔한 제목("회의록" 등)을 그대로 title로 쓰면 실제로 생성이 실패한다 — 그래서 내부 전용 고유키만 담고, 사용자가 보는 진짜 제목은 `sourceDocument.title`에 별도 저장한다. 게시 시 `publicSlug` 계산에도 재사용된다(아래 참고) |
| body(storage format) | string(XHTML) | tiptapDocToStorageFormat() 산출물 | 렌더링용, 편집 원본이 아님 |
| parentId | string | 항상 작성자의 AccountFolder(P0-8 — 게시 여부와 무관하게 절대 이동하지 않는다) | — |
| restriction | Confluence Restriction | 초안=서비스 계정 제한, 게시=제한 없음 | 초안-게시 생명주기의 핵심(P0-8부터 이 restriction과 `publishMetadata.isPublished`만으로 게시 여부를 판단한다 — 위치는 더 이상 근거가 아니다) |
| property: `sourceDocument` | `{ title: string; doc: JSONContent }` | 필수 | `title`은 사용자가 실제로 입력한 표시용 제목(P0-7 — Confluence page의 title과 분리됨). `doc`은 편집 원본(TipTap/ProseMirror JSON 트리) — 2차 UI/UX 설계(WYSIWYG 전환)에서 `sourceMarkdown`을 대체함 |
| property: `authorMeta` | `{ actualAuthorEmail: string }` | 필수, 불변 | 실제 작성자 식별(Confluence 신원과 무관). 게시/게시취소 시 이 값으로 작성자의 AccountFolder를 찾는다 |
| property: `publishMetadata` | `{ isPublished: boolean; publishedAt?: string; viewers: { [viewerId: string]: { slug: string; metaDescription: string; publicSlug: string } } }` | `isPublished=true`이면 `viewers`에 최소 1개 항목 필요 | 뷰어별로 slug·메타 설명을 따로 관리. `slug`는 사용자가 입력한 값 그대로, `publicSlug`는 서버가 `${slug}-${page.title}`(위 내부 고유키)로 계산해 채운 실제 공개 URL 값이다 |
| label(태그) | string[] | 자유 텍스트, 다중 허용 | Confluence 네이티브 라벨 기능 사용 |

**slug 유니크 제약(P0-5b, 2026-08-28 구조 변경)**: `publicSlug`는 문서마다 발급된 전역 유일 내부 고유키를 항상 포함하므로, 다른 문서의 `publicSlug`와 절대 같을 수 없다 — 애플리케이션이 Space 전체를 스캔해 중복을 검사할 필요가 구조적으로 없어졌다(예전의 `findPublishedPageBySlug`/`listAllSpacePages` 기반 스캔·TTL 캐시는 모두 제거됨). 뷰어는 공개 URL에서 `publicSlug`를 그대로 쓰고, 마지막 구분자(`-`) 뒤 고정 길이(36자) UUID만 떼어 그 값으로 페이지를 조회하면 검색 없이 바로 문서를 찾을 수 있다.

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
- Space 홈페이지 1 : N AccountFolder
- AccountFolder 1 : N Document — 게시 여부와 무관하게 항상 같은 AccountFolder 하위에 있다(P0-8 — 이동하지 않는다)
- Document 1 : N Comment

## 인덱스·제약조건
- Confluence 자체는 커스텀 인덱스를 제공하지 않는다. slug 조회(게시 시 중복 검사)는 더 이상 Space 전체를 스캔하지 않는다(P0-5b) — `publicSlug`에 항상 전역 유일한 내부 고유키가 포함되어 애초에 충돌이 불가능하기 때문이다.
- `listDocuments()`(문서함 조회)는 계정 하나의 문서 범위 내에서 문서마다 `sourceDocument`(표시 제목, P0-7)와 `publishMetadata`(게시 여부, P0-8) property를 각각 한 번씩 읽는다. Space 전체가 아니라 계정 범위로 한정되어 있어 문서 수가 많이 늘어나도 다른 계정에 영향을 주지 않는다.
- `authorMeta.actualAuthorEmail`, `publishMetadata`, `sourceDocument`는 한 페이지에 하나씩만 존재해야 한다(Confluence content property는 key당 1개 값).
- 라벨(태그)은 Confluence가 자체적으로 페이지당 다중 허용을 지원하므로 별도 제약이 필요 없다.

## 마이그레이션·데이터 정책
- 아직 실사용 데이터가 없으므로 기존 데이터 마이그레이션은 필요 없다.
- P0-7(문서 title 구조 변경) 이전에 만들어진 문서는 `sourceDocument.title`이 없다 — `listDocuments()`/`getDocumentDetail()`은 이 경우 Confluence page의 실제 title(과거엔 표시 제목이었던 값)로 대체해 보여준다(하위 호환, 코드에 기본값 처리 있음). 다만 이런 문서를 수정 저장하면 그 시점부터 `sourceDocument.title`이 채워진다.
- P0-8(폴더 이동 제거) 이전에 만들어진 계정의 "초안"/"게시" 서브페이지는 코드가 더 이상 참조하지 않지만, 능동적으로 삭제하지도 않는다 — 실사용 데이터가 사실상 없다는 판단과 동일한 근거.
- 관리자의 사전 수동 작업이 필요 없다 — 계정 폴더가 없는 사용자가 처음 접근하면 코드가 AccountFolder 하나만 자동으로 만든다.
- 개인정보 성격의 데이터는 사내 이메일뿐이며, 별도 마스킹·암호화 없이 Confluence의 접근 제어(Restriction)로 보호한다. 다만 AccountFolder 자체(이메일이 제목)는 의도적으로 제한을 걸지 않으므로 Space 구성원에게 노출된다는 점은 인지하고 있어야 한다(초안 "내용"은 여전히 보호됨). Confluence 서비스 계정 자격증명 자체는 이 문서가 아니라 [architecture.md](./architecture.md)의 보안 섹션에서 다룬다.
