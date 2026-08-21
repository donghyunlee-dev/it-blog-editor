# 📄 PRD — SFOOD IT Editor

> 전체 진행률: 8 / 15 항목 완료 (최근 갱신: 2026-08-21)

## 🎯 서비스 정의
- 사내 직원이 Markdown으로 문서를 작성해 Confluence에 보관하고, 원할 때 Tech Blog 등 외부 뷰어에 게시할 수 있게 하는 사내 전용 문서 작성·게시 도구다.
- 초안은 작성자 본인 외 누구에게도 보이지 않고, 게시하면 Confluence Space 구성원 전체에 공개된다.
- 관련 문서: [requirements.md](./requirements.md), [architecture.md](./architecture.md)

## 🖥️ 화면 정의
| 화면 | 목적 | 주요 구성 요소 | 진입 경로 |
|---|---|---|---|
| 로그인 화면 | AX Auth(사내 SSO)로 로그인 | "MS 계정으로 로그인" 버튼, 로그인 실패 안내 | `/login` |
| 내 문서함 | 로그인한 사용자의 문서 목록 조회 | 문서 목록, "새 문서" 버튼 | `/editor` |
| 새 문서 작성 | 새 문서를 Markdown으로 작성 | 제목 입력, 본문(Markdown) 입력, 저장 버튼 | `/editor/new` |
| 문서 편집 | 기존 문서 수정·삭제, 이미지 첨부 | 제목/본문 입력, 이미지 등록, 삭제 버튼, "게시 설정" 이동 | `/editor/[pageId]` |
| 게시 설정 | 게시 여부·slug·메타 설명·노출 뷰어 설정 | 게시 여부 체크박스, slug 입력, 메타 설명 입력, 노출 뷰어 체크박스 | `/editor/[pageId]/publish` |

## 🛠️ 개발 스펙 정의
- 기술 스택·인증·데이터 저장·배포 방향의 상세 근거는 [architecture.md](./architecture.md)를 참고한다. 요약:
  - Next.js 16(App Router) + React 19 + TypeScript, AWS 배포, 별도 스테이징 없음
  - 인증: next-auth(Auth.js) v5 + AX Auth(사내 SSO) Credentials 프로바이더
  - 저장소: 자체 DB 없음, Confluence Cloud REST API(v2 우선, 일부 v1)가 유일한 저장소
  - 알림: Slack Incoming Webhook(운영 이상 감지)
- 코드 구조 원칙: `src/lib/confluence/client.ts`(Confluence REST 저수준 래퍼) → `src/lib/editor/*.ts`(도메인 로직) → `src/app/api/editor/**/route.ts`(얇은 API 컨트롤러) → `src/app/editor/**/page.tsx` + `src/components/editor/*.tsx`(화면). 도메인 계층은 `ValidationError`/`NotFoundError`/`ConflictError`/`UnauthorizedError`를 던지고, `src/lib/api-response.ts`의 `toErrorResponse()`가 공통 에러 응답으로 변환한다.
- 외부 라이브러리: `marked`(Markdown → Confluence storage format 변환, 이미지는 `confluence-attachment://{filename}` 스킴 처리).
- 실제 Confluence 쓰기는 항상 공용 서비스 계정으로만 이루어진다. 로그인한 직원의 이메일은 Confluence 신원이 아니라 content property로만 기록되는 "실제 작성자 식별자"다.

## 🧩 기능별 정의

### 기능 — 로그인 (AX Auth)
- 설명: 사내 MS 계정으로 로그인한다. AX Auth가 SSO를 대행한다.
- 입력: 없음(리다이렉트 방식 — AX Auth 로그인 페이지에서 인증 후 콜백으로 loginToken 전달)
- 출력·동작: `/api/auth/ax-callback`이 loginToken을 검증하고 next-auth 세션(이메일)을 생성, `/editor`로 이동
- 예외 상황: 토큰 누락·검증 실패 시 `/login?error=...`로 리다이렉트
- 데이터 저장 여부: 아니오 (세션은 next-auth가 관리, 별도 저장 없음)
- API 필요 여부: 예 — api-spec.md의 인증 관련 엔드포인트 참고
- 상태: 완료(기존 구현)

### 기능 — 내 문서함 조회
- 설명: 로그인한 사용자의 개인 폴더 하위 문서 목록을 보여준다. 개인 폴더가 없으면 자동 생성한다.
- 입력: 세션 이메일
- 출력·동작: 문서 목록(제목, 최종 수정일)
- 예외 상황: Confluence 연동 실패 시 502 + Slack 알림
- 데이터 저장 여부: 예 — data-spec.md의 "개인 폴더"/"문서" 참고
- API 필요 여부: 예 — `GET /api/editor/folder`, `GET /api/editor/documents`
- 상태: 완료(기존 구현)

### 기능 — 문서 작성·수정·삭제
- 설명: Markdown으로 문서를 작성/수정하고, 필요 시 삭제(Confluence 휴지통 이동)한다.
- 입력: 제목, 본문(Markdown), (수정 시) 현재 버전 번호
- 출력·동작: Confluence 페이지 생성/수정/삭제. 본문은 storage format으로 변환해 저장하고 Markdown 원본은 별도 property로 보관
- 예외 상황: 제목/본문 누락 → 400, 버전 불일치(동시 수정) → 409, 대상 없음 → 404
- 데이터 저장 여부: 예
- API 필요 여부: 예 — `POST /api/editor/documents`, `PUT /DELETE /api/editor/documents/{pageId}`
- 상태: 완료(기존 구현)

### 기능 — 이미지 첨부
- 설명: 문서에 이미지를 첨부하고, 본문에 참조를 삽입한다.
- 입력: 이미지 파일(png/jpeg/gif/webp)
- 출력·동작: Confluence 첨부파일로 업로드, Markdown에 `confluence-attachment://{filename}` 참조 삽입
- 예외 상황: 파일 누락·허용되지 않는 형식 → 400
- 데이터 저장 여부: 예(Confluence 첨부파일)
- API 필요 여부: 예 — `POST /api/editor/documents/{pageId}/images`
- 상태: 완료(기존 구현)

### 기능 — 초안-게시 생명주기 (숨김 ↔ 공개)
- 설명: 문서는 항상 "초안" 또는 "게시됨" 상태다. 초안은 작성자 본인 외 누구에게도 보이지 않고, 게시하면 Space 구성원 전체에 공개된다.
- 입력: 게시 여부(on/off)
- 출력·동작: 문서 페이지의 parent를 "초안 루트/개인폴더" ↔ "게시됨 루트" 사이로 이동하고, Confluence 페이지 제한(Restriction)을 그에 맞춰 적용/해제한다. 제한 대상은 서비스 계정 자신(직원 개인 계정 매핑 없음).
- 예외 상황: 페이지 이동/제한 API 실패 시 502 + Slack 알림. 스파이크로 사전 검증 필요(parentId 변경 지원 여부, restriction API 버전, 자기 자신 제한이 자기 API 호출을 막는지)
- 데이터 저장 여부: 예 — data-spec.md의 "문서(페이지 위치·제한 상태)" 참고
- API 필요 여부: 예 — 기존 `PATCH /api/editor/documents/{pageId}/publish`를 확장
- 상태: 대기 (이번 설계에서 새로 확정, 구현 전)

### 기능 — 문서 태그 지정
- 설명: 문서를 폴더가 아닌 다중 태그로 분류한다.
- 입력: 태그 목록(자유 텍스트, 다중)
- 출력·동작: Confluence 네이티브 페이지 라벨로 저장/조회
- 예외 상황: 없음(자유 입력, 사전 정의 카테고리 없음)
- 데이터 저장 여부: 예 — Confluence 페이지 라벨
- API 필요 여부: 예 — 신규 엔드포인트 필요(라벨 추가/조회)
- 상태: 대기 (이번 설계에서 새로 확정, 구현 전)

### 기능 — 게시 메타데이터의 뷰어별 확장
- 설명: 게시 시 slug·메타 설명을 뷰어(예: Tech Blog)별로 따로 관리할 수 있게 한다.
- 입력: 뷰어 ID, slug, 메타 설명
- 출력·동작: `publishMetadata.viewers[viewerId] = { slug, metaDescription }` 구조로 저장. slug 중복 체크는 뷰어별로 분리
- 예외 상황: 게시 시 slug/metaDescription 누락 → 400, slug 중복(같은 뷰어 내) → 409
- 데이터 저장 여부: 예
- API 필요 여부: 예 — 기존 게시 설정 API의 요청/응답 스키마 변경
- 상태: 대기 (이번 설계에서 새로 확정, 구현 전 — 기존 `targetViewers: string[]` 구조에서 마이그레이션)

### 기능 — 댓글 저장 구조 (데이터 구조만 정의, API/화면은 범위 밖)
- 설명: Tech Blog 독자가 게시된 문서에 댓글을 남길 수 있도록, Confluence에 저장되는 데이터 구조를 정의한다. 실제 댓글 작성/조회 API와 화면은 별도 Viewer 프로젝트가 자체 Confluence 자격증명으로 구현한다.
- 입력(Viewer 쪽 기준, 참고용): 댓글 본문, (로그인 시) 세션 이메일/이름, (비로그인 시) 사용자가 입력한 이메일/이름
- 출력·동작(참고용): Confluence footer comment 생성 + `commenterMeta { email, name, isEmployee }` content property 부착
- 예외 상황: 이 프로젝트 범위 밖(문서화만)
- 데이터 저장 여부: 예 — data-spec.md의 "댓글" 참고(스키마 정의만, 이 프로젝트가 직접 쓰지 않음)
- API 필요 여부: 아니오 (이 프로젝트 범위 밖)
- 상태: 대기 (스키마 문서화만 필요, 이번 설계에서 확정)

### 기능 — 개인 에디터 기능 강화 (2차 서브 프로젝트)
- 설명: 툴바, 실시간 미리보기, 자동저장 등 에디터 자체의 작성 경험 개선. 상세 요구사항은 아직 논의 전이다.
- 입력/출력·동작/예외 상황: 미정 — 다음 브레인스토밍에서 구체화
- 데이터 저장 여부: 미정
- API 필요 여부: 미정
- 상태: 대기 (다음 단계에서 별도 설계 예정)

## 🗺️ 단계별 개발 계획

### Phase 0 — 기존 스캐폴딩 (완료)
- 목표: 로그인부터 문서 CRUD, 이미지 첨부, 기본 게시 설정까지의 최소 동작 확인
- 포함 기능: 로그인, 내 문서함 조회, 문서 작성·수정·삭제, 이미지 첨부

### Phase 1 — Confluence 콘텐츠 구조 개편
- 목표: 초안이 다른 직원에게 숨겨지고, 게시 시 공개되는 생명주기를 실제로 구현. 태그·뷰어별 게시 메타데이터 구조로 전환. 댓글 저장 스키마를 문서로 확정
- 포함 기능: 초안-게시 생명주기, 문서 태그 지정, 게시 메타데이터의 뷰어별 확장, 댓글 저장 구조

### Phase 2 — 개인 에디터 기능 강화
- 목표: 상세 요구사항 확정 후 별도로 정의
- 포함 기능: 개인 에디터 기능 강화(상세 미정)

## ✅ 단계별 진행 체크리스트

### Phase 0 — 기존 스캐폴딩 (완료)
- [x] (완료) AX Auth 로그인 연동 — 산출물: src/lib/auth.ts, src/lib/ax-auth/client.ts, src/app/login/page.tsx
- [x] (완료) 개인 폴더 조회/생성 — 산출물: src/lib/editor/folder.ts, src/app/api/editor/folder/route.ts
- [x] (완료) 문서 작성·수정·삭제 — 산출물: src/lib/editor/documents.ts, src/app/api/editor/documents/**
- [x] (완료) 이미지 첨부 — 산출물: src/lib/editor/images.ts, src/app/api/editor/documents/[pageId]/images/route.ts
- [x] (완료) 기본 게시 설정(게시 여부/slug/메타 설명/노출 뷰어) — 산출물: src/lib/editor/publish.ts, src/components/editor/PublishForm.tsx
- [x] (완료) 공통 에러 응답 처리 — 산출물: src/lib/api-response.ts
- [x] (완료) Slack 이상 감지 알림 — 산출물: src/lib/notifications/slack.ts
- [x] (완료) 문서 정의 단계(요구사항/아키텍처/PRD) — 산출물: docs/product/requirements.md, docs/product/architecture.md, docs/product/prd.md, docs/superpowers/specs/2026-08-21-confluence-content-structure-design.md

### Phase 1 — Confluence 콘텐츠 구조 개편
- [ ] (대기) 스파이크 — parentId 변경(페이지 이동), Restriction API 버전, 자기 제한이 자기 API 호출을 막는지 검증 — 산출물: (없음)
- [ ] (대기) 초안(Drafts Root)/게시됨(Published Root) 루트 페이지 생성 및 초기 Restriction 설정 — 산출물: (없음)
- [ ] (대기) `confluence/client.ts`에 페이지 이동(movePage)·제한 적용/해제 함수 추가 — 산출물: (없음)
- [ ] (대기) `publish.ts` 개편 — 게시/게시취소 시 페이지 이동 + 제한 토글, `publishMetadata.viewers` 구조로 변경 — 산출물: (없음)
- [ ] (대기) 태그(라벨) 추가/조회 연동 — 산출물: (없음)
- [ ] (대기) 댓글 저장 구조(`commenterMeta`) 문서화 반영 — 산출물: docs/product/data-spec.md

### Phase 2 — 개인 에디터 기능 강화
- [ ] (대기) 상세 요구사항 브레인스토밍 — 산출물: (없음)

## 🗄️ 데이터 저장 여부
- 있음 — 상세 설계는 [data-spec.md](./data-spec.md) 참고 (Confluence content property·라벨 기반, 별도 DB 없음)

## 🔌 API 여부
- 필요 — 상세 명세는 [api-spec.md](./api-spec.md) 참고 (내부 Next.js API 라우트 + Confluence Cloud/AX Auth 외부 연동)
