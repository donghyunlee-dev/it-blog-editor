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
  | INVALID_REQUEST | 400 | 필수 값 누락 등 유효성 오류 |
  | NOT_FOUND | 404 | 대상 문서/리소스 없음 |
  | CONFLICT | 409 | 버전 불일치, slug 중복 등 |
  | UPSTREAM_ERROR | 502 | Confluence 등 외부 연동 실패(Slack으로 이상 감지 알림 전송) |

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
| PATCH | /api/editor/documents/{pageId}/publish | 게시 설정 변경 | 초안-게시 생명주기, 게시 메타데이터의 뷰어별 확장 |

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
{ "exists": true, "folderId": "12345", "spaceKey": "SFOODIT" }
```
(폴더가 없으면 `{ "exists": false }`)

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
{ "folderId": "12345", "spaceKey": "SFOODIT" }
```

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
{ "documents": [ { "pageId": "111", "title": "제목", "updatedAt": "2026-08-21T00:00:00.000Z" } ] }
```

**Response (실패)**
| 상태 코드 | 사유 | 설명 |
|---|---|---|
| 401 | UNAUTHORIZED | 로그인 필요 |

### POST /api/editor/documents — 새 문서 생성
**Header**: Cookie(세션) 필수

**Request Body**
```json
{ "title": "문서 제목", "body": "Markdown 본문" }
```

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
{ "title": "수정된 제목", "body": "수정된 Markdown", "version": 1 }
```

**Response Body (성공)**
```json
{ "pageId": "111", "version": 2 }
```

**Response (실패)**
| 상태 코드 | 사유 | 설명 |
|---|---|---|
| 401 | UNAUTHORIZED | 로그인 필요 |
| 400 | INVALID_REQUEST | version 누락, 제목/본문 누락 |
| 404 | NOT_FOUND | 문서 없음 |
| 409 | CONFLICT | 요청한 version이 최신이 아님(동시 수정) |
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
{ "attachmentId": "att123", "url": "https://.../download/attachments/..." }
```

**Response (실패)**
| 상태 코드 | 사유 | 설명 |
|---|---|---|
| 401 | UNAUTHORIZED | 로그인 필요 |
| 400 | INVALID_REQUEST | 파일 누락 또는 허용되지 않는 형식 |
| 502 | UPSTREAM_ERROR | Confluence 연동 실패 |

### PATCH /api/editor/documents/{pageId}/publish — 게시 설정 변경
**Header**: Cookie(세션) 필수

**Request Body (현재 구현)**
```json
{ "isPublished": true, "targetViewers": ["tech-blog"], "slug": "my-first-post", "metaDescription": "설명" }
```

**Response Body (성공, 현재 구현)**
```json
{ "pageId": "111", "isPublished": true, "slug": "my-first-post", "publishedAt": "2026-08-21T00:00:00.000Z" }
```

**Response (실패)**
| 상태 코드 | 사유 | 설명 |
|---|---|---|
| 401 | UNAUTHORIZED | 로그인 필요 |
| 400 | INVALID_REQUEST | 게시 시 slug/metaDescription 누락 |
| 404 | NOT_FOUND | 문서 없음 |
| 409 | CONFLICT | slug 중복 |
| 502 | UPSTREAM_ERROR | Confluence 연동 실패 |

> ⚠️ **Phase 1에서 변경 예정** — `docs/superpowers/specs/2026-08-21-confluence-content-structure-design.md`에서 확정된 대로, 게시 메타데이터가 뷰어별 구조로 바뀐다. Phase 1 구현 시 이 절이 다음과 같이 갱신된다.
> - Request Body: `targetViewers` 제거, `viewers: { [viewerId]: { slug, metaDescription } }` 추가
> - slug 중복 체크(409) 판단 기준이 "전체 게시 문서 중 중복"에서 "같은 viewerId 내에서 중복"으로 변경
> - 게시/게시취소 시 문서 페이지의 parentId 이동과 Confluence 페이지 제한(Restriction) 적용/해제가 함께 일어남(현재는 content property만 갱신)

## 계획된 신규 엔드포인트 (Phase 1, 구현 전)

### PUT /api/editor/documents/{pageId}/tags — 문서 태그(라벨) 설정
> 아직 구현되지 않았고, Phase 1에서 추가될 예정이다. 아래는 현재까지 합의된 요구사항을 기준으로 한 초안이며, 실제 구현 시 이 절을 확정본으로 갱신한다.

**Header**: Cookie(세션) 필수

**Request Body (초안)**
```json
{ "tags": ["React", "Backend"] }
```

**Response Body (성공, 초안)**
```json
{ "pageId": "111", "tags": ["React", "Backend"] }
```

**Response (실패, 초안)**
| 상태 코드 | 사유 | 설명 |
|---|---|---|
| 401 | UNAUTHORIZED | 로그인 필요 |
| 404 | NOT_FOUND | 문서 없음 |
| 502 | UPSTREAM_ERROR | Confluence 연동 실패 |

## 참고 — 외부 연동 API (이 서비스가 호출하는 쪽)
- **Confluence Cloud REST API**: `src/lib/confluence/client.ts`에서 v2를 우선 사용하고, v2에 없는 기능(첨부파일 업로드, 예상되는 페이지 제한 기능)은 v1으로 대체한다. 공식 문서: Atlassian Confluence Cloud REST API Reference.
- **AX Auth**: 사내 공통 인증 서비스(`https://ax-auth.s-food.ai`). 로그인 시작(`GET /auth/login/{clientId}`), 토큰 검증(`POST /auth/token/verify`), 메일 발송(`POST /mail/send`, 현재 미사용)을 제공한다. 상세 스펙은 사내 `login-integration-guide.md`/`mail-integration-guide.md`(AX팀 제공)를 참고한다 — 이 리포지토리에는 포함되어 있지 않다.
- **Slack Incoming Webhook**: 운영 이상 감지 알림 전송(단방향, 응답 처리 없음).
