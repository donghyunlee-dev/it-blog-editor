# 🔌 API 명세서 — SFOOD IT Editor

## 개요
- 이 문서는 SFOOD IT Editor가 자체적으로 제공하는 내부 API(Next.js Route Handler)를 다룬다. Confluence Cloud REST API, AX Auth API는 이 서비스가 "호출하는" 외부 API이며, 각각 Confluence 공식 문서와 사내 `login-integration-guide.md`/`mail-integration-guide.md`(AX팀 제공, 별도 보관)를 참고한다.
- **Base URL**: 같은 origin의 상대 경로(`/api/...`). 별도 API 서버는 없다.
- **인증 방식**: next-auth 세션 쿠키. 세션이 없으면 모든 `/api/editor/**` 엔드포인트가 401을 반환한다. 세션의 이메일이 곧 "실제 작성자 식별자"로 쓰인다.
- **공통 응답 형식**: 성공 시 각 엔드포인트가 정의한 JSON 본문을 그대로 반환한다.
- **공통 에러 형식**:
  ```json
  { "error": { "code": "STRING_CODE", "message": "사람이 읽을 수 있는 설명" } }
  ```
  | code | 상태 코드 | 의미 |
  |---|---|---|
  | UNAUTHORIZED | 401 | 로그인 필요 |
  | ACCESS_DISABLED | 403 | 로그인은 됐으나 계정 접속이 차단됨(2026-09-03 추가, `accountMeta.accessEnabled=false`) |
  | INVALID_REQUEST | 400 | 필수 값 누락 등 유효성 오류 |
  | NOT_FOUND | 404 | 대상 문서/리소스 없음 |
  | CONFLICT | 409 | 버전 불일치 등(2026-08-28부터 slug 중복은 구조적으로 불가능해져 이 코드 대상에서 빠짐 — P0-5b) |
  | UPSTREAM_ERROR | 502 | Confluence 등 외부 연동 실패(Slack으로 이상 감지 알림 전송) |
- **2026-09-03 갱신**: 로그인 세션이 있어도 `accountMeta.accessEnabled=false`면 `/api/editor/**` 전체가 `ACCESS_DISABLED`(403)를 반환한다(온보딩 API 자체도 예외 없음 — 접속 차단이 온보딩보다 우선한다).

## 엔드포인트 목록
| Method | 경로 | 설명 | prd.md 관련 기능 |
|---|---|---|---|
| GET | /api/auth/ax-callback | AX Auth 로그인 콜백 | 로그인 |
| GET, POST | /api/auth/[...nextauth] | next-auth 표준 핸들러 | 로그인 |
| GET | /api/health/confluence | Confluence 연동 상태 확인 | (운영 헬스체크, 기능 목록 없음) |
| GET | /api/editor/folder | 내 개인 폴더 존재 여부 조회 | 내 문서함 조회 |
| POST | /api/editor/folder | 내 개인 폴더 생성 | 내 문서함 조회 |
| GET | /api/editor/documents | 내 문서 목록 조회 | 내 문서함 조회 |
| POST | /api/editor/documents | 새 문서 생성 | 문서 작성·수정·삭제 |
| PUT | /api/editor/documents/{pageId} | 문서 수정 | 문서 작성·수정·삭제 |
| DELETE | /api/editor/documents/{pageId} | 문서 삭제 | 문서 작성·수정·삭제 |
| POST | /api/editor/documents/{pageId}/images | 이미지 첨부 | 이미지 첨부 |
| GET | /api/editor/documents/{pageId}/images/{filename} | 이미지 원본 프록시(2026-09-07 추가) | 이미지 첨부 |
| PATCH | /api/editor/documents/{pageId}/publish | 게시 설정 변경 | 초안-게시 생명주기, 게시 메타데이터의 뷰어별 확장 |
| PUT | /api/editor/documents/{pageId}/tags | 문서 태그 설정 | 문서 태그 지정 |
| GET | /api/editor/account | 내 계정 정보(이름·팀·온보딩 여부) 조회 | 사용자 계정 정보 관리 |
| PUT | /api/editor/account | 내 계정 정보(이름·팀) 저장 — 온보딩·수정 공용 | 사용자 계정 정보 관리 |
| GET | /api/editor/account/search | 계정 검색(이름·이메일·팀 부분 일치) | 최상단 계정 관리 페이지, 페이지 공유 |
| POST | /api/editor/documents/{pageId}/share | 공유 대상 추가 | 페이지 공유 |
| DELETE | /api/editor/documents/{pageId}/share/{email} | 공유 대상 제거 | 페이지 공유 |
| GET | /api/editor/documents/shared | 나에게 공유된 문서 목록 조회 | 페이지 공유 |

## 엔드포인트 상세

### GET /api/auth/ax-callback — AX Auth 로그인 콜백
**Header**: 해당 없음 (브라우저 리다이렉트로 호출)

**Request Body**: 해당 없음. 쿼리 파라미터 `login_token` 또는 `loginToken` 필요.

**Response**: 성공 시 `/editor`로 302 리다이렉트(세션 쿠키 설정). 토큰 누락 시 `/login?error=missing_token`으로 302 리다이렉트.

**Response (실패)**
| 상태 코드 | 사유 | 설명 |
|---|---|---|
| 302 | missing_token | `login_token`/`loginToken` 쿼리 파라미터 없음 |
| 302 | (next-auth 표준 에러) | AX Auth 토큰 검증 실패 시 `/login?error=...`로 리다이렉트 |

### GET /api/health/confluence — Confluence 연동 상태 확인
**Header**: 해당 없음

**Request Body**: 해당 없음

**Response Body (성공)**
```json
{ "status": "ok", "user": { "...": "Confluence /rest/api/user/current 응답 그대로" } }
```

**Response (실패)**
| 상태 코드 | 사유 | 설명 |
|---|---|---|
| 502 | Confluence 연동 실패 | `{ "status": "error", "message": "..." }` |

### GET /api/editor/folder — 내 개인 폴더 존재 여부 조회
**Header**
| 이름 | 필수 여부 | 설명 |
|---|---|---|
| Cookie | 필수 | next-auth 세션 쿠키 |

**Request Body**: 해당 없음

**Response Body (성공)**
```json
{ "exists": true, "accountFolderId": "12345", "spaceKey": "SFOODIT" }
```
(폴더가 없으면 `{ "exists": false }`)

**2026-08-28 갱신(P0-8)**: 예전에는 `draftFolderId`/`publishedFolderId`도 함께 반환했으나, "초안"/"게시" 서브페이지 구조 자체가 제거되면서 빠졌다(응답을 실제로 소비하는 프런트엔드 코드가 없어 영향 없음).

**Response (실패)**
| 상태 코드 | 사유 | 설명 |
|---|---|---|
| 401 | UNAUTHORIZED | 로그인 필요 |
| 502 | UPSTREAM_ERROR | Confluence 연동 실패 |

### POST /api/editor/folder — 내 개인 폴더 생성
**Header**: Cookie(세션) 필수

**Request Body**: 해당 없음

**Response Body (성공, 201)**
```json
{ "accountFolderId": "12345", "spaceKey": "SFOODIT" }
```
계정 폴더(제한 없음) 하나만 만든다(P0-8 — "초안"/"게시" 서브페이지는 더 이상 만들지 않는다).

**Response (실패)**
| 상태 코드 | 사유 | 설명 |
|---|---|---|
| 401 | UNAUTHORIZED | 로그인 필요 |
| 409 | CONFLICT | 이미 개인 폴더가 존재함 |
| 502 | UPSTREAM_ERROR | Confluence 연동 실패 |

### GET /api/editor/documents — 내 문서 목록 조회
**Header**: Cookie(세션) 필수

**Request Body**: 해당 없음

**Response Body (성공)**
```json
{
  "documents": [
    {
      "pageId": "111",
      "title": "제목",
      "updatedAt": "2026-08-21T00:00:00.000Z",
      "isPublished": false,
      "tags": ["React", "Backend"]
    }
  ]
}
```

> ⚠️ **화면 UI/UX 설계(2차)에서 확장됨** — 사이드바에 상태 뱃지·태그를 보여줘야 해서 `isPublished`, `tags` 필드가 추가됐다. `listDocuments()`가 "초안"/"게시" 서브페이지 두 곳의 자식을 모두 조회해 합치며, `isPublished`는 별도 property 조회 없이 각 문서가 어느 서브페이지(초안/게시)에서 나왔는지로 바로 판단한다(물리적 위치가 유일한 근거). 라벨(태그)만 문서별로 추가 조회한다(문서 수가 개인 단위라 N+1 호출을 허용).
>
> **2026-08-28 갱신(P0-7)**: `title`은 이제 `sourceDocument` property에서 읽어온다(문서마다 추가 조회 1회, 태그 조회와 함께 병렬) — Confluence page의 실제 title이 더 이상 표시용 제목이 아니기 때문이다(아래 "새 문서 생성" 참고). API 요청/응답 형식 자체는 바뀌지 않았다.

**Response (실패)**
| 상태 코드 | 사유 | 설명 |
|---|---|---|
| 401 | UNAUTHORIZED | 로그인 필요 |

### POST /api/editor/documents — 새 문서 생성
**Header**: Cookie(세션) 필수

**Request Body**
```json
{ "title": "문서 제목", "doc": { "type": "doc", "content": [] } }
```
`doc`은 TipTap/ProseMirror JSON(`JSONContent`)이다. 화면 UI/UX 설계(2차)에서 `body`(Markdown 문자열) 필드를 대체했다.

> **2026-08-28 갱신(P0-7)**: 요청 형식은 그대로지만, 서버가 이 `title`을 Confluence page의 실제 title로 쓰지 않는다 — 대신 `randomUUID()`로 만든 내부 고유키를 title로 쓰고, 요청받은 `title`은 `sourceDocument` property에 저장한다. Confluence는 Space 전체에서 페이지 title이 유일해야 해서, 서로 다른 계정이 같은 제목("회의록" 등)을 쓰면 그대로는 생성이 실패하기 때문이다.

**Response Body (성공, 201)**
```json
{ "pageId": "111", "version": 1 }
```

**Response (실패)**
| 상태 코드 | 사유 | 설명 |
|---|---|---|
| 401 | UNAUTHORIZED | 로그인 필요 |
| 400 | INVALID_REQUEST | 제목/본문 누락 |
| 404 | NOT_FOUND | 개인 폴더가 없음(먼저 생성 필요) |
| 502 | UPSTREAM_ERROR | Confluence 연동 실패 |

### PUT /api/editor/documents/{pageId} — 문서 수정
**Header**: Cookie(세션) 필수

**Request Body**
```json
{ "title": "수정된 제목", "doc": { "type": "doc", "content": [] }, "version": 1 }
```
`doc`은 TipTap/ProseMirror JSON(`JSONContent`)이다. 화면 UI/UX 설계(2차)에서 `body`(Markdown 문자열) 필드를 대체했다.

**Response Body (성공)**
```json
{ "pageId": "111", "version": 2, "lastEditedBy": { "email": "user@s-food.com", "name": "홍길동", "editedAt": "2026-09-04T05:45:02.431Z" } }
```
**2026-09-04 갱신(P6-7, 구현 완료)**: 저장 성공 시 `sharingMeta.lastEditedBy`(이메일·이름·수정 시각)를 저장자로 갱신하고, 그 값을 응답에도 함께 내려준다(생성 직후 아직 한 번도 수정 저장을 거치지 않은 문서는 `lastEditedBy`가 없다). 편집 화면 하단 풋터에 "마지막 수정자"로 표시된다.

> **2026-09-04 갱신(P6-6, 구현 완료)**: 소유권 검사를 `requireDocumentAccess`(문서 소유자 또는 `sharingMeta.sharedWith`에 포함된 계정 모두 통과)로 확장했다 — 공유받은 사람도 소유자와 동일하게 저장할 수 있다(읽기 전용 공유는 없음). 실패 시 응답 코드는 여전히 401(UNAUTHORIZED)이다 — 이 프로젝트의 문서 권한 오류는 처음부터 401로 통일돼 있고, 별도의 403 FORBIDDEN 코드를 쓰지 않는다.

**Response (실패)**
| 상태 코드 | 사유 | 설명 |
|---|---|---|
| 401 | UNAUTHORIZED | 로그인 필요, 또는 문서 소유자도 공유 대상도 아님 |
| 403 | ACCESS_DISABLED | 접속이 차단된 계정 |
| 400 | INVALID_REQUEST | version 누락, 제목/본문 누락 |
| 404 | NOT_FOUND | 문서 없음 |
| 409 | CONFLICT | 요청한 version이 최신이 아님(동시 수정) — 응답 본문에 `lastEditedBy`를 함께 내려보내 "누가 먼저 저장했는지" 화면에서 안내한다(P6-7, 구현 완료) |
| 502 | UPSTREAM_ERROR | Confluence 연동 실패 |

### DELETE /api/editor/documents/{pageId} — 문서 삭제
**Header**: Cookie(세션) 필수

**Request Body**: 해당 없음

**Response**: 성공 시 204 No Content

**Response (실패)**
| 상태 코드 | 사유 | 설명 |
|---|---|---|
| 401 | UNAUTHORIZED | 로그인 필요 |
| 404 | NOT_FOUND | 문서 없음 |
| 502 | UPSTREAM_ERROR | Confluence 연동 실패 |

### POST /api/editor/documents/{pageId}/images — 이미지 첨부
**Header**
| 이름 | 필수 여부 | 설명 |
|---|---|---|
| Cookie | 필수 | next-auth 세션 쿠키 |
| Content-Type | 필수 | `multipart/form-data` |

**Request Body**: `file` 필드(png/jpeg/gif/webp)

**Response Body (성공, 201)**
```json
{ "attachmentId": "att123", "url": "/api/editor/documents/{pageId}/images/{filename}", "filename": "{filename}" }
```
`url`은 Confluence의 원본 다운로드 링크가 아니라 아래 `GET .../images/{filename}` 프록시
라우트를 가리킨다(2026-09-07 갱신) — Confluence 원본 링크는 Confluence 자체 인증이 있어야
열려 브라우저의 `<img src>`가 직접 못 쓴다(실사용 확인: "사진 아이콘만 보이고 실제 사진이
안 들어간다"). 클라이언트는 이 값을 그대로 `<img src>`에 쓰면 된다.

`filename`은 요청에 실은 원본 파일명과 다를 수 있다(2026-09-09 추가) — 동명 첨부파일
충돌(같은 문서에 이미 같은 이름의 첨부가 있으면 Confluence가 업로드 자체를 거부)을 피하려
서버가 고유 접미사를 붙인 실제 Confluence 첨부파일명이다. **클라이언트는 이 값을 그대로
저장해 다시 써야 한다** — 원본 파일명으로 되돌려 쓰면 문서 저장 시 Confluence storage
format의 `<ac:image ri:filename="...">`가 실제 첨부파일이 아닌 엉뚱한 파일을 가리키게
된다(실사용 확인으로 발견한 버그).

**Response (실패)**
| 상태 코드 | 사유 | 설명 |
|---|---|---|
| 401 | UNAUTHORIZED | 로그인 필요 |
| 400 | INVALID_REQUEST | 파일 누락 또는 허용되지 않는 형식 |
| 502 | UPSTREAM_ERROR | Confluence 연동 실패 |

### GET /api/editor/documents/{pageId}/images/{filename} — 이미지 원본 프록시(2026-09-07 추가)
Confluence 첨부파일을 서버(API 토큰 인증)를 대신 거쳐 브라우저에 내려준다. 소유자뿐 아니라
공유받은 사람도 볼 수 있다(P6-6과 같은 `requireDocumentAccess` 사용).

**Header**: Cookie(세션) 필수

**Response (성공, 200)**: 이미지 바이트 그대로, `Content-Type`은 Confluence가 응답한 값을
그대로 전달한다.

**Response (실패)**
| 상태 코드 | 사유 | 설명 |
|---|---|---|
| 401 | UNAUTHORIZED | 로그인 필요 또는 접근 권한 없음(소유자·공유받은 사람 모두 아님) |
| 502 | UPSTREAM_ERROR | Confluence 연동 실패(첨부파일 없음 포함) |

### PATCH /api/editor/documents/{pageId}/publish — 게시 설정 변경
**Header**: Cookie(세션) 필수

**Request Body**
```json
{ "isPublished": true, "viewers": { "tech-blog": { "slug": "my-first-post", "metaDescription": "설명" } } }
```
게시 시 `isPublished: true`와 `viewers` 객체가 필수. `viewers`의 각 항목은 `slug`와 `metaDescription`을 포함해야 한다.

**Response Body (성공)**
```json
{ "pageId": "111", "isPublished": true, "viewers": { "tech-blog": { "slug": "my-first-post", "metaDescription": "설명", "publicSlug": "my-first-post-3f9a2b7e-1c2d-4e5f-8a9b-0c1d2e3f4a5b" } }, "publishedAt": "2026-08-21T00:00:00.000Z" }
```
`publicSlug`는 서버가 계산해 채우는 값으로, 요청 바디에 보내지 않아도 되고 보내도 무시된다(항상 재계산됨). 형식은 `{slug}-{내부 고유키(UUID)}`이며, 이 내부 고유키는 문서마다 생성 시 한 번 발급되어 전역 유일이 보장되므로(P0-7) **다른 문서의 slug와 절대 겹치지 않는다** — 뷰어(Tech Blog 등)는 공개 URL에서 `publicSlug`를 그대로 쓰고, 조회 시 마지막 구분자(`-`) 뒤 고정 길이(36자) UUID만 떼어 그 값으로 페이지를 조회하면 검색 없이 바로 문서를 찾을 수 있다(2026-08-28, P0-5b — 예전에는 Space 전체를 스캔해 중복을 검사했다).

**Response (실패)**
| 상태 코드 | 사유 | 설명 |
|---|---|---|
| 401 | UNAUTHORIZED | 로그인 필요 |
| 400 | INVALID_REQUEST | 게시 시 뷰어별 slug/metaDescription 누락 또는 최소 하나의 뷰어 설정 필요 |
| 404 | NOT_FOUND | 문서 없음 |
| 502 | UPSTREAM_ERROR | Confluence 연동 실패 |

게시/게시취소 시 문서 페이지의 부모 폴더가 자동으로 변경되고(초안 ↔ 게시), Confluence 페이지 제한(Restriction) 적용/해제가 함께 일어난다.

### PUT /api/editor/documents/{pageId}/tags — 문서 태그(라벨) 설정
**Header**: Cookie(세션) 필수

**Request Body**
```json
{ "tags": ["React", "Backend"] }
```

**Response Body (성공)**
```json
{ "pageId": "111", "tags": ["React", "Backend"] }
```

**Response (실패)**
| 상태 코드 | 사유 | 설명 |
|---|---|---|
| 401 | UNAUTHORIZED | 로그인 필요 |
| 404 | NOT_FOUND | 문서 없음 |
| 502 | UPSTREAM_ERROR | Confluence 연동 실패 |

태그는 Confluence 네이티브 페이지 라벨로 저장되며, 자유 텍스트로 입력할 수 있다. 문서함의 태그 필터링과 자동완성에 사용된다.

### GET /api/editor/account — 내 계정 정보 조회(2026-09-03 추가)
**Header**: Cookie(세션) 필수

**Request Body**: 해당 없음

**Response Body (성공)**
```json
{ "email": "user@s-food.com", "name": "홍길동", "team": "IT팀", "needsOnboarding": false }
```
`name`/`team`이 둘 다 비어 있으면(계정 폴더에 `accountMeta`가 아직 없는 경우 포함) `needsOnboarding: true`를 반환해, 클라이언트가 온보딩 팝업을 띄울지 판단한다.

**Response (실패)**
| 상태 코드 | 사유 | 설명 |
|---|---|---|
| 401 | UNAUTHORIZED | 로그인 필요 |
| 403 | ACCESS_DISABLED | 접속이 차단된 계정 |
| 502 | UPSTREAM_ERROR | Confluence 연동 실패 |

### PUT /api/editor/account — 내 계정 정보 저장(2026-09-03 추가, 온보딩·수정 공용)
**Header**: Cookie(세션) 필수

**Request Body**
```json
{ "name": "홍길동", "team": "IT팀" }
```
`accessEnabled`는 이 API로 바꿀 수 없다(관리자 전용 스크립트로만 변경 — 아래 "참고" 절 및 architecture.md 참고).

**Response Body (성공)**
```json
{ "email": "user@s-food.com", "name": "홍길동", "team": "IT팀" }
```
저장 시 Space 최상단 "계정 관리" 페이지의 `accountIndex` 항목도 함께 upsert된다.

**Response (실패)**
| 상태 코드 | 사유 | 설명 |
|---|---|---|
| 401 | UNAUTHORIZED | 로그인 필요 |
| 403 | ACCESS_DISABLED | 접속이 차단된 계정 |
| 400 | INVALID_REQUEST | 이름/팀 누락 |
| 502 | UPSTREAM_ERROR | Confluence 연동 실패 |

### GET /api/editor/account/search — 계정 검색(2026-09-03 추가)
**Header**: Cookie(세션) 필수

**Request Body**: 해당 없음. 쿼리 파라미터 `q`(검색어, 이름·이메일·팀 부분 일치, 대소문자 무시) 필요.

**Response Body (성공)**
```json
{ "accounts": [ { "email": "user2@s-food.com", "name": "김철수", "team": "디자인팀", "accessEnabled": true } ] }
```
"계정 관리" 페이지의 `accountIndex` property만 읽어 서버에서 필터링한다(Space 전체 재조회 없음). 접속이 차단(`accessEnabled=false`)된 계정도 결과에 포함된다 — 검색 자체는 공유 대상을 찾기 위한 것이라 접속 가능 여부와 무관하다. `accountFolderId`는 내부 식별자라 응답에 노출하지 않는다. `q`가 빈 문자열이면 전체 목록을 반환한다(`/editor/accounts` 화면의 최초 진입 시 사용) — `q` 파라미터 자체가 없을 때만 400이다.

**Response (실패)**
| 상태 코드 | 사유 | 설명 |
|---|---|---|
| 401 | UNAUTHORIZED | 로그인 필요 |
| 403 | ACCESS_DISABLED | 접속이 차단된 계정 |
| 400 | INVALID_REQUEST | 검색어(`q`) 누락 |
| 502 | UPSTREAM_ERROR | Confluence 연동 실패 |

### POST /api/editor/documents/{pageId}/share — 공유 대상 추가(2026-09-03 계획, 2026-09-04 구현 완료 — P6-2/P6-3)
**Header**: Cookie(세션) 필수

**Request Body**
```json
{ "email": "user2@s-food.com" }
```

**Response Body (성공)**
```json
{ "sharedWith": ["user2@s-food.com"] }
```
대상의 `accountFolderId`는 클라이언트가 보내지 않는다 — 서버가 `email`로 직접 조회한다
(내부 식별자를 클라이언트가 다루지 않게 하는 관례, 계정 검색 API가 `accountFolderId`를
응답에서 뺀 것과 같은 이유). `sharing.ts`의 `shareDocument`(P6-1/P6-4)를 그대로 호출해
문서의 `sharingMeta.sharedWith`와 대상 계정 폴더의 `sharedDocumentRefs`를 함께 갱신한다.
이미 공유된 대상을 다시 지정해도 조용히 무시한다(멱등).

**Response (실패)**
| 상태 코드 | 사유 | 설명 |
|---|---|---|
| 401 | UNAUTHORIZED | 로그인 필요, 또는 문서 소유자가 아님(공유받은 사람은 재공유 불가 — 이 프로젝트의 문서 권한 오류는 처음부터 401로 통일돼 있다, `requireDocumentOwner` 재사용) |
| 403 | ACCESS_DISABLED | 접속이 차단된 계정 |
| 400 | INVALID_REQUEST | 이메일 누락, 본인 자신을 공유 대상으로 지정 |
| 404 | NOT_FOUND | 문서 없음, 또는 대상 이메일의 계정 폴더를 찾을 수 없음 |
| 502 | UPSTREAM_ERROR | Confluence 연동 실패 |

### DELETE /api/editor/documents/{pageId}/share/{email} — 공유 대상 제거(2026-09-03 계획, 2026-09-04 구현 완료 — P6-2/P6-3)
**Header**: Cookie(세션) 필수

**Request Body**: 해당 없음

**Response Body (성공)**
```json
{ "sharedWith": [] }
```
`sharingMeta.sharedWith`와 대상 계정 폴더의 `sharedDocumentRefs` 양쪽에서 제거한다. 원래
공유돼 있지 않았던 이메일을 제거해도 에러 없이 그대로 둔다(멱등).

**Response (실패)**
| 상태 코드 | 사유 | 설명 |
|---|---|---|
| 401 | UNAUTHORIZED | 로그인 필요, 또는 문서 소유자가 아님 |
| 403 | ACCESS_DISABLED | 접속이 차단된 계정 |
| 404 | NOT_FOUND | 문서 없음, 또는 대상 이메일의 계정 폴더를 찾을 수 없음 |
| 502 | UPSTREAM_ERROR | Confluence 연동 실패 |

### GET /api/editor/documents/shared — 나에게 공유된 문서 목록(2026-09-03 계획, 2026-09-04 구현 완료 — P6-5)
**Header**: Cookie(세션) 필수

**Request Body**: 해당 없음

**Response Body (성공)**
```json
{
  "documents": [
    {
      "pageId": "222",
      "title": "제목",
      "ownerEmail": "owner@s-food.com",
      "ownerName": "홍길동",
      "updatedAt": "2026-09-03T00:00:00.000Z",
      "isPublished": false,
      "tags": ["React"]
    }
  ]
}
```
내 계정 폴더의 `sharedDocumentRefs`를 근거로 각 문서를 조회하되, `title`/`updatedAt`/
`isPublished`/`tags`는 캐시된 스냅샷이 아니라 매번 현재 문서 상태를 다시 읽는다(문서함
목록 조회와 동일한 방식, `documents.ts`의 `fetchDocumentEntry` 재사용). 참조는 있지만
문서가 더 이상 존재하지 않으면(소유자가 완전히 삭제한 뒤 등, 드리프트) 그 항목만 조용히
목록에서 제외한다 — 전체 조회가 실패하지 않는다. `ownerName`은 accountIndex에 없는
소유자(아주 오래된 계정 등)일 경우 빈 문자열이다. 사이드바 상단의 "공유받은 문서" 영역이
이 API를 쓴다.

**Response (실패)**
| 상태 코드 | 사유 | 설명 |
|---|---|---|
| 401 | UNAUTHORIZED | 로그인 필요 |
| 403 | ACCESS_DISABLED | 접속이 차단된 계정 |
| 502 | UPSTREAM_ERROR | Confluence 연동 실패 |

## 참고 — 외부 연동 API (이 서비스가 호출하는 쪽)
- **Confluence Cloud REST API**: `src/lib/confluence/client.ts`에서 v2를 우선 사용하고, v2에 없는 기능(첨부파일 업로드, 예상되는 페이지 제한 기능)은 v1으로 대체한다. 공식 문서: Atlassian Confluence Cloud REST API Reference.
- **AX Auth**: 사내 공통 인증 서비스(`https://ax-auth.s-food.ai`). 로그인 시작(`GET /auth/login/{clientId}`), 토큰 검증(`POST /auth/token/verify`), 메일 발송(`POST /mail/send`, 현재 미사용)을 제공한다. 상세 스펙은 사내 `login-integration-guide.md`/`mail-integration-guide.md`(AX팀 제공)를 참고한다 — 이 리포지토리에는 포함되어 있지 않다.
- **Slack Incoming Webhook**: 운영 이상 감지 알림 전송(단방향, 응답 처리 없음).
