# 🗄️ 데이터 설계서 — SFOOD IT Editor

## 개요
- 이 서비스는 별도의 데이터베이스를 두지 않는다. Confluence Cloud의 페이지(Page)·페이지 라벨(Label)·콘텐츠 속성(Content Property)·댓글(Footer Comment)이 곧 데이터 저장소다.
- 그래서 아래 "테이블 명세"는 SQL 테이블이 아니라, 각 Confluence 콘텐츠에 어떤 속성(Content Property)이 어떤 형태로 붙는지를 정리한 것이다.
- 관련 문서: [requirements.md](./requirements.md), [architecture.md](./architecture.md), [prd.md](./prd.md)

## 엔티티 목록
| 엔티티 | 설명 | prd.md 관련 기능 |
|---|---|---|
| AccountFolder | 이메일 제목의 계정 폴더 페이지(Space 홈페이지 하위) | 내 문서함 조회, 사용자 계정 정보 관리, 페이지 공유(공유받은 문서 참조) |
| AccountIndex | Space 최상단의 "계정 관리" 페이지(1개만 존재) | 최상단 계정 관리 페이지, 페이지 공유(공유 대상 검색) |
| Document | 실제 문서 페이지(AccountFolder 바로 하위) | 문서 작성·수정·삭제, 초안-게시 생명주기, 태그, 게시 메타데이터, 페이지 공유 |
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
| property: `accountMeta`(2026-09-03 추가) | `{ name: string; team: string; accessEnabled: boolean; onboardedAt?: string }` | 계정 폴더 생성 시 기본값 `{ name: "", team: "", accessEnabled: true }`로 생성 | 이름·팀은 온보딩 완료 전까지 빈 문자열이고, 클라이언트는 둘 중 하나라도 비어 있으면 온보딩 미완료로 판단한다. `accessEnabled=false`면 로그인은 되지만 `/editor` 진입이 차단된다(관리자가 `scripts/set-account-access.ts`로 직접 변경, UI 없음). `onboardedAt`은 온보딩 완료 시 1회 기록 |
| property: `sharedDocumentRefs`(2026-09-03 추가) | `{ pageId: string; ownerEmail: string; documentTitle: string; sharedAt: string }[]` | 없으면 빈 배열로 간주 | 다른 사람이 나에게 공유한 문서의 참조 캐시(P1-2b의 `deletedDocuments`와 동일한 패턴). 공유 추가/해제 시점에 갱신되며, "공유받은 문서" 목록 조회가 이 property만 읽으면 되도록 한다 — 실시간 동기화가 아니라 쓰기 시점에 갱신되는 캐시임에 유의 |
| property: `folderIndex`(2026-09-09 추가, Phase 7 P7-1) | `{ id: string; name: string; parentId: string \| null; order: number }[]` | 없으면 빈 배열로 간주. `id`는 `randomUUID()`. 중첩 깊이 최대 5단계([Issue #65](https://github.com/sfood-pioneer-1st/sfood-it-editor/issues/65) "B안" 결정, `src/lib/editor/folders.ts`가 검증) | 이 계정의 폴더 트리 전체(실제 Confluence 페이지가 아니라 가상 구조 — 문서의 실제 페이지 위치는 그대로 계정 폴더 바로 아래다). 문서가 어느 폴더에 속하는지는 이 트리가 아니라 문서 쪽 property의 `folderId`로 판단한다(P7-3에서 추가 예정, 이 시점에는 아직 없음). 폴더 이름변경·삭제 시 자식 승격 정책은 P7-2에서 다룬다 |
| body(페이지 본문, 2026-09-04 추가, P5-8) | Confluence storage format(XHTML) | `accountMeta`가 바뀔 때마다 관리자 열람용으로 다시 그려짐(best-effort) | 이름·팀·접속 허용·온보딩 완료 시각을 표로 보여준다 — **진짜 데이터가 아니라 참고용 스냅샷**이다(사용자가 Confluence에서 페이지를 직접 열어봐도 데이터를 확인할 수 있게 해달라고 요청, `accountMeta` property가 여전히 유일한 기준). 이름·팀은 `escapeHtml`로 이스케이프해 삽입한다. 본문을 직접 고쳐도 반영되지 않고 다음 `accountMeta` 갱신 시 덮어써진다 |

관리자의 사전 수동 작업은 필요 없다 — 계정 폴더가 없는 사용자가 처음 접근하면 코드가 자동으로 만든다.

### 테이블 — AccountIndex (Confluence Page, 2026-09-03 추가)
| 속성 | 타입 | 제약조건 | 설명 |
|---|---|---|---|
| pageId | string | Confluence 발급 | Space 홈페이지 바로 하위, Space 전체에서 1개만 존재 |
| title | string | 고정("계정 관리") | — |
| property: `accountIndex` | `{ email: string; name: string; team: string; accessEnabled: boolean; accountFolderId: string }[]` | 계정 생성·온보딩 완료·계정 정보 수정·접속 권한 변경 시마다 해당 이메일 항목을 upsert | 계정 검색(공유 대상 검색, 관리자 조회)의 유일한 조회 대상 — Space 전체를 스캔하지 않는다. 이 페이지가 없으면 최초 접근 시 코드가 자동 생성한다(계정 폴더 자동 생성과 동일한 패턴) |
| body(페이지 본문, 2026-09-04 추가, P5-8) | Confluence storage format(XHTML) | `accountIndex`가 바뀔 때마다 관리자 열람용으로 다시 그려짐(best-effort) | 전체 계정(이메일·이름·팀·접속 허용)을 표로 보여준다 — AccountFolder의 body와 같은 이유·같은 "참고용 스냅샷" 원칙(`accountIndex` property가 기준). 이름·팀은 `escapeHtml`로 이스케이프한다 |

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
| property: `sharingMeta`(2026-09-03 추가) | `{ sharedWith: string[]; lastEditedBy?: { email: string; name: string; editedAt: string } }` | 공유하지 않은 문서는 property 자체가 없음(빈 배열과 동일하게 취급) | `sharedWith`는 공유 대상 이메일 목록 — 공유받은 사람은 소유자와 동일하게 조회·수정 가능하다(읽기 전용 공유는 이번 범위 밖). `lastEditedBy`는 문서 저장(PUT) 성공 시마다 갱신되어 편집 화면에 "마지막 수정자"로 표시된다 |

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
- Space 홈페이지 1 : 1 AccountIndex(2026-09-03 추가)
- AccountFolder 1 : N Document — 게시 여부와 무관하게 항상 같은 AccountFolder 하위에 있다(P0-8 — 이동하지 않는다)
- Document 1 : N Comment
- Document N : M AccountFolder — `sharingMeta.sharedWith`(문서 → 계정)와 `sharedDocumentRefs`(계정 → 문서)로 양방향 참조를 각자 따로 기록한다(2026-09-03 추가, 실시간 동기화 아님)

## 인덱스·제약조건
- Confluence 자체는 커스텀 인덱스를 제공하지 않는다. slug 조회(게시 시 중복 검사)는 더 이상 Space 전체를 스캔하지 않는다(P0-5b) — `publicSlug`에 항상 전역 유일한 내부 고유키가 포함되어 애초에 충돌이 불가능하기 때문이다.
- `listDocuments()`(문서함 조회)는 계정 하나의 문서 범위 내에서 문서마다 `sourceDocument`(표시 제목, P0-7)와 `publishMetadata`(게시 여부, P0-8) property를 각각 한 번씩 읽는다. Space 전체가 아니라 계정 범위로 한정되어 있어 문서 수가 많이 늘어나도 다른 계정에 영향을 주지 않는다.
- `authorMeta.actualAuthorEmail`, `publishMetadata`, `sourceDocument`, `accountMeta`, `sharingMeta`, `accountIndex`는 한 페이지에 하나씩만 존재해야 한다(Confluence content property는 key당 1개 값).
- 라벨(태그)은 Confluence가 자체적으로 페이지당 다중 허용을 지원하므로 별도 제약이 필요 없다.
- 계정 검색(2026-09-03 추가)은 `listAllSpacePages` 같은 Space 스캔을 다시 쓰지 않는다 — `AccountIndex.accountIndex` property 하나만 읽어 이름·이메일·팀 부분 일치로 필터링한다(P0-5a/P1-2b와 같은 "직접 기록해둔 상태만 신뢰" 패턴). 계정 수가 크게 늘어나면 이 배열 하나를 통째로 읽고 쓰는 방식의 한계(동시 upsert 시 덮어쓰기 경쟁 등)를 재검토해야 한다.

## 마이그레이션·데이터 정책
- 아직 실사용 데이터가 없으므로 기존 데이터 마이그레이션은 필요 없다.
- P0-7(문서 title 구조 변경) 이전에 만들어진 문서는 `sourceDocument.title`이 없다 — `listDocuments()`/`getDocumentDetail()`은 이 경우 Confluence page의 실제 title(과거엔 표시 제목이었던 값)로 대체해 보여준다(하위 호환, 코드에 기본값 처리 있음). 다만 이런 문서를 수정 저장하면 그 시점부터 `sourceDocument.title`이 채워진다.
- P0-8(폴더 이동 제거) 이전에 만들어진 계정의 "초안"/"게시" 서브페이지는 코드가 더 이상 참조하지 않지만, 능동적으로 삭제하지도 않는다 — 실사용 데이터가 사실상 없다는 판단과 동일한 근거.
- 관리자의 사전 수동 작업이 필요 없다 — 계정 폴더가 없는 사용자가 처음 접근하면 코드가 AccountFolder 하나만 자동으로 만든다. AccountIndex 페이지도 마찬가지로 최초 접근 시 자동 생성된다(2026-09-03 추가).
- `accountMeta`가 없는 기존 계정(2026-09-03 이전 생성분)은 `accessEnabled=true`(하위 호환 기본값)로 취급하고, 온보딩 미완료로 간주해 다음 로그인 시 온보딩 팝업을 띄운다.
- 개인정보 성격의 데이터는 사내 이메일뿐이며, 별도 마스킹·암호화 없이 Confluence의 접근 제어(Restriction)로 보호한다. 다만 AccountFolder 자체(이메일이 제목)는 의도적으로 제한을 걸지 않으므로 Space 구성원에게 노출된다는 점은 인지하고 있어야 한다(초안 "내용"은 여전히 보호됨). Confluence 서비스 계정 자격증명 자체는 이 문서가 아니라 [architecture.md](./architecture.md)의 보안 섹션에서 다룬다.
