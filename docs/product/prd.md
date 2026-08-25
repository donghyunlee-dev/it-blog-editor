# 📄 PRD — SFOOD IT Editor

> 전체 진행률: 16 / 24 항목 완료 (최근 갱신: 2026-08-25)

## 🎯 서비스 정의
- 사내 직원이 WYSIWYG 에디터로 문서를 작성해 Confluence에 보관하고, 원할 때 Tech Blog 등 외부 뷰어에 게시할 수 있게 하는 사내 전용 문서 작성·게시 도구다.
- 초안은 작성자 본인 외 누구에게도 보이지 않고, 게시하면 Confluence Space 구성원 전체에 공개된다.
- 관련 문서: [requirements.md](./requirements.md), [architecture.md](./architecture.md), [design.md](./design.md)

## 🖥️ 화면 정의
`/editor`로 시작하는 모든 화면은 좌측 사이드바(문서 목록·태그 필터·"새 문서" 버튼)가 있는 공통 앱 셸 레이아웃(`src/app/editor/layout.tsx`) 안에서 렌더링된다. 상세 상호작용은 [docs/superpowers/specs/2026-08-21-editor-ui-ux-design.md](../superpowers/specs/2026-08-21-editor-ui-ux-design.md) 참고.

| 화면 | 목적 | 주요 구성 요소 | 진입 경로 |
|---|---|---|---|
| 로그인 화면 | AX Auth(사내 SSO)로 로그인 | `@sfood/ui`의 `LoginSimple` 템플릿, "MS 계정으로 로그인" 버튼, 로그인 실패 안내 | `/login` |
| 내 문서함 | 로그인한 사용자의 문서 목록 조회(사이드바 중심) | 사이드바(문서 목록 + 상태 뱃지 + 태그, 태그 필터, "새 문서" 버튼), 본문 영역은 문서 미선택 시 빈 상태(`EmptyState`) | `/editor` |
| 새 문서 작성 / 문서 편집 | WYSIWYG로 문서 작성·수정, 태그 지정, 이미지 삽입, 삭제 | 큰 제목 입력, 태그 칩 입력, TipTap 본문 에디터(슬래시 삽입 메뉴, 텍스트 선택 시 버블 툴바), 드래그앤드롭/붙여넣기 이미지 업로드, 저장·삭제(확인 모달)·게시 설정 이동 버튼 | `/editor/new`, `/editor/[pageId]` |
| 게시 설정 | 게시 여부·뷰어별 slug·메타 설명 설정 | 문서 전체 게시 토글, 뷰어별 카드(지금은 Tech Blog 1개, 카드마다 slug·메타 설명 입력) | `/editor/[pageId]/publish` |

## 🛠️ 개발 스펙 정의
- 기술 스택·인증·데이터 저장·배포 방향의 상세 근거는 [architecture.md](./architecture.md)를 참고한다. 요약:
  - Next.js 16(App Router) + React 19 + TypeScript, AWS 배포, 별도 스테이징 없음
  - 인증: next-auth(Auth.js) v5 + AX Auth(사내 SSO) Credentials 프로바이더
  - 저장소: 자체 DB 없음, Confluence Cloud REST API(v2 우선, 일부 v1)가 유일한 저장소
  - 알림: Slack Incoming Webhook(운영 이상 감지)
- 코드 구조 원칙: `src/lib/confluence/client.ts`(Confluence REST 저수준 래퍼) → `src/lib/editor/*.ts`(도메인 로직) → `src/app/api/editor/**/route.ts`(얇은 API 컨트롤러) → `src/app/editor/**/page.tsx` + `src/components/editor/*.tsx`(화면). 도메인 계층은 `ValidationError`/`NotFoundError`/`ConflictError`/`UnauthorizedError`를 던지고, `src/lib/api-response.ts`의 `toErrorResponse()`가 공통 에러 응답으로 변환한다.
- 에디터/UI 라이브러리: TipTap(WYSIWYG 엔진, 문서 원본은 JSON으로 저장), `@sfood/ui` + Tailwind CSS(사내 디자인 시스템 — [design.md](./design.md) 참고). 이미지는 `confluence-attachment://{filename}` 스킴으로 Confluence storage format의 `<ac:image>`에 매핑한다(변환기는 자체 작성, `marked`는 더 이상 쓰지 않음).
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
- 설명: 로그인한 사용자의 계정 폴더 하위 "초안"+"게시" 문서를 함께 보여주고 상태 뱃지로 구분한다. 계정 폴더(및 초안/게시 서브페이지)가 없으면 자동 생성한다. 게시해도 목록에서 사라지지 않는다.
- 입력: 세션 이메일
- 출력·동작: 문서 목록(제목, 최종 수정일, 게시 여부)
- 예외 상황: Confluence 연동 실패 시 502 + Slack 알림
- 데이터 저장 여부: 예 — data-spec.md의 "계정 폴더"/"문서" 참고
- API 필요 여부: 예 — `GET /api/editor/folder`, `GET /api/editor/documents`
- 상태: 완료 — 산출물: src/lib/editor/folder.ts, src/lib/editor/folder.test.ts, src/lib/editor/documents.ts, src/lib/editor/documents.test.ts, src/app/api/editor/folder/route.ts, src/app/api/editor/documents/route.ts, src/app/editor/layout.tsx, src/lib/editor/tag-suggestions.ts

### 기능 — 문서 작성·수정·삭제
- 설명: TipTap 기반 WYSIWYG 에디터로 문서를 작성/수정하고, 필요 시 삭제(Confluence 휴지통 이동)한다. 삭제는 `window.confirm()`이 아니라 `Modal` 확인창으로 처리한다.
- 입력: 제목, 본문(TipTap JSON), (수정 시) 현재 버전 번호
- 출력·동작: Confluence 페이지 생성/수정/삭제. 본문은 TipTap→storage format 변환기를 거쳐 저장하고, 편집 원본(TipTap JSON)은 별도 property(`sourceDocument`)로 보관
- 예외 상황: 제목/본문 누락 → 400, 버전 불일치(동시 수정) → 409, 대상 없음 → 404. 저장 성공/실패는 `Toast`로 안내
- 데이터 저장 여부: 예
- API 필요 여부: 예 — `POST /api/editor/documents`, `PUT /DELETE /api/editor/documents/{pageId}` (요청 바디의 `body`(문자열) 필드가 `doc`(TipTap JSONContent)로 바뀜 — api-spec.md 갱신 필요)
- 상태: 완료(기존 Markdown 기반 구현 — 이번 설계로 WYSIWYG 기반으로 다시 구현 필요, 대기)

### 기능 — 이미지 첨부
- 설명: 문서에 이미지를 드래그앤드롭하거나 클립보드에서 붙여넣으면 자동 업로드되고 그 위치에 바로 삽입된다(업로드 중 로딩 표시).
- 입력: 이미지 파일(png/jpeg/gif/webp)
- 출력·동작: Confluence 첨부파일로 업로드, 에디터 문서(TipTap JSON)의 해당 위치에 이미지 노드로 삽입 → storage format 변환 시 `confluence-attachment://{filename}` 참조를 거쳐 `<ac:image>`로 매핑
- 예외 상황: 파일 누락·허용되지 않는 형식 → 400
- 데이터 저장 여부: 예(Confluence 첨부파일)
- API 필요 여부: 예 — `POST /api/editor/documents/{pageId}/images`
- 상태: 완료(기존 버튼 기반 구현 — 드래그앤드롭/붙여넣기 UX는 이번 설계로 대기)

### 기능 — 초안-게시 생명주기 (숨김 ↔ 공개)
- 설명: 문서는 항상 "초안" 또는 "게시됨" 상태다. 초안은 작성자 본인 외 누구에게도 보이지 않고, 게시하면 Space 구성원 전체에 공개된다.
- 입력: 게시 여부(on/off)
- 출력·동작: 문서 페이지의 parent를 같은 계정 폴더 내 "초안" ↔ "게시" 서브페이지 사이로 이동하고, Confluence 페이지 제한(Restriction)을 그에 맞춰 적용/해제한다. 제한 대상은 서비스 계정 자신(직원 개인 계정 매핑 없음).
- 예외 상황: 페이지 이동/제한 API 실패 시 502 + Slack 알림. 스파이크로 사전 검증 필요(parentId 변경 지원 여부, restriction API 버전, 자기 자신 제한이 자기 API 호출을 막는지)
- 데이터 저장 여부: 예 — data-spec.md의 "문서(페이지 위치·제한 상태)" 참고
- API 필요 여부: 예 — 기존 `PATCH /api/editor/documents/{pageId}/publish`를 확장
- 상태: 대기 (이번 설계에서 새로 확정, 구현 전)

### 기능 — 문서 태그 지정
- 설명: 문서를 폴더가 아닌 다중 태그로 분류한다. 편집 화면에서는 칩(chip) UI로 입력하고(Enter/쉼표로 확정), 문서함에서 이미 쓰인 태그를 자동완성 후보로 보여준다. 문서함 사이드바에서는 태그로 필터링할 수 있다.
- 입력: 태그 목록(자유 텍스트, 다중)
- 출력·동작: Confluence 네이티브 페이지 라벨로 저장/조회
- 예외 상황: 없음(자유 입력, 사전 정의 카테고리 없음)
- 데이터 저장 여부: 예 — Confluence 페이지 라벨
- API 필요 여부: 예 — 신규 엔드포인트 필요(라벨 추가/조회)
- 상태: 대기 (이번 설계에서 새로 확정, 구현 전)

### 기능 — 게시 메타데이터의 뷰어별 확장
- 설명: 게시 시 slug·메타 설명을 뷰어(예: Tech Blog)별로 따로 관리할 수 있게 한다. 게시 설정 화면에는 뷰어마다 카드가 하나씩 있고, 뷰어가 늘어나도 화면 구조를 다시 설계하지 않아도 된다.
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

### 기능 — 에디터 상호작용 강화 (앱 셸 · 슬래시 메뉴 · 버블 툴바)
- 설명: 화면 전환마다 다시 그려지지 않는 좌측 사이드바(문서 목록·태그 필터) 앱 셸을 두고, 상단 고정 포맷 툴바 대신 텍스트 선택 시 뜨는 버블 툴바와 `/` 슬래시 삽입 메뉴로 서식·블록을 삽입한다(Notion/Confluence류 문서 도구와 동일한 상호작용 패턴).
- 입력: 텍스트 선택(버블 툴바 트리거), `/` 입력(슬래시 메뉴 트리거), 사이드바에서 문서 클릭(전환)
- 출력·동작: 버블 툴바로 굵게/기울임/취소선/글자색/하이라이트/링크 적용, 슬래시 메뉴로 제목/목록/표/이미지/코드블록/패널(정보·경고·노트) 삽입, 사이드바 클릭 시 전체 화면 전환 없이 본문 영역만 바뀜
- 예외 상황: 해당 없음(순수 클라이언트 상호작용)
- 데이터 저장 여부: 아니오
- API 필요 여부: 아니오
- 상태: 대기 (이번 설계에서 새로 확정, 구현 전)

### 기능 — 디자인 시스템(`@sfood/ui`) 도입
- 설명: 사내 디자인 시스템 컴포넌트·템플릿으로 화면을 구성한다. 로그인 화면은 `LoginSimple` 템플릿, 그 외 화면은 `Sidebar`/`StatusBadge`/`Tag`/`ChipGroup`/`List`/`EmptyState`/`Button`/`FormField`/`Modal`/`Toast`/`Card` 등 컴포넌트를 조합한다. 상세 매핑은 [design.md](./design.md) 참고.
- 입력: 해당 없음
- 출력·동작: `@sfood/ui`·Tailwind CSS 설치, 기존 `globals.css`의 커스텀 클래스를 단계적으로 대체
- 예외 상황: 해당 없음
- 데이터 저장 여부: 아니오
- API 필요 여부: 아니오
- 상태: 대기 (이번 설계에서 새로 확정, 구현 전)

## 🗺️ 단계별 개발 계획

### Phase 0 — 기존 스캐폴딩 (완료)
- 목표: 로그인부터 문서 CRUD, 이미지 첨부, 기본 게시 설정까지의 최소 동작 확인
- 포함 기능: 로그인, 내 문서함 조회, 문서 작성·수정·삭제, 이미지 첨부

### Phase 1 — Confluence 콘텐츠 구조 개편
- 목표: 초안이 다른 직원에게 숨겨지고, 게시 시 공개되는 생명주기를 실제로 구현. 태그·뷰어별 게시 메타데이터 구조로 전환. 댓글 저장 스키마를 문서로 확정
- 포함 기능: 초안-게시 생명주기, 문서 태그 지정, 게시 메타데이터의 뷰어별 확장, 댓글 저장 구조

### Phase 2 — 화면 UI/UX 개편 (WYSIWYG · 앱 셸 · 디자인 시스템)
- 목표: Markdown textarea 기반의 최소 UI를 WYSIWYG 에디터·사이드바 앱 셸·사내 디자인 시스템(`@sfood/ui`) 기반으로 전환한다.
- 포함 기능: 문서 작성·수정·삭제(WYSIWYG 재구현), 이미지 첨부(드래그앤드롭/붙여넣기 UX), 문서 태그 지정(칩 UI), 게시 메타데이터의 뷰어별 확장(카드 UI), 에디터 상호작용 강화(앱 셸·슬래시 메뉴·버블 툴바), 디자인 시스템(`@sfood/ui`) 도입

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
- [x] (완료) 스파이크 — 1~3: parentId 변경, Restriction API 버전, 자기 제한이 자기 API 호출 차단 여부 (2026-08-21 검증 완료) / 4: 제한 없는 계정 폴더 하위 제한 없는 "게시" 서브페이지 열람 여부 (미검증) — 산출물: docs/product/architecture.md, src/lib/confluence/client.ts
- [x] (완료) `folder.ts` 개편 — 계정 폴더 생성 시 "초안"(제한)/"게시"(제한 없음) 서브페이지 자동 생성, 관련 API 라우트·화면 응답 필드 갱신 — 산출물: src/lib/editor/folder.ts, src/lib/editor/folder.test.ts
- [x] (완료) `confluence/client.ts`에 페이지 이동(movePage)·제한 적용/해제 함수 추가 — 산출물: src/lib/confluence/client.ts (구조 변경과 무관해 그대로 유효)
- [x] (완료) `documents.ts` 개편 — "내 문서함" 목록이 초안+게시를 합쳐서 상태 뱃지로 보여주도록 변경 — 산출물: src/lib/editor/documents.ts, src/lib/editor/documents.test.ts
- [x] (완료) `publish.ts` 개편 — 게시/게시취소 시 같은 계정 폴더 내 초안↔게시 서브페이지 이동 + 제한 토글로 변경 — 산출물: src/lib/editor/publish.ts, src/lib/editor/publish.test.ts
- [x] (완료) 태그(라벨) 추가/조회 연동 — 산출물: src/lib/editor/tags.ts, src/app/api/editor/documents/[pageId]/tags/route.ts (구조 변경과 무관해 그대로 유효)
- [x] (완료) 댓글 저장 구조(`commenterMeta`) 문서화 반영 — 산출물: docs/product/data-spec.md

### Phase 2 — 화면 UI/UX 개편 (WYSIWYG · 앱 셸 · 디자인 시스템)
- [x] (완료) 화면 UI/UX 브레인스토밍 및 설계 — 산출물: docs/superpowers/specs/2026-08-21-editor-ui-ux-design.md, docs/product/design.md, CLAUDE.md
- [ ] (대기) 디자인 시스템(`@sfood/ui`) + Tailwind CSS 설치 및 설정 — 산출물: (없음)
- [ ] (대기) 로그인 화면 `LoginSimple` 템플릿 전환 — 산출물: (없음)
- [ ] (대기) TipTap 기반 WYSIWYG 에디터 도입(1차 서식 목록) — 산출물: (없음)
- [ ] (대기) 문서 원본 저장 형식 전환(`sourceMarkdown` → `sourceDocument`) + Confluence 변환기 재작성 — 산출물: (없음)
- [ ] (대기) 이미지 붙여넣기/드래그앤드롭 업로드 UX — 산출물: (없음)
- [ ] (대기) 사이드바 앱 셸(레이아웃) 구축 — 산출물: (없음)
- [ ] (대기) 태그 칩 입력 UI(자동완성 포함) — 산출물: (없음)
- [ ] (대기) 게시 설정 화면 뷰어별 카드 UI — 산출물: (없음)

## 🗄️ 데이터 저장 여부
- 있음 — 상세 설계는 [data-spec.md](./data-spec.md) 참고 (Confluence content property·라벨 기반, 별도 DB 없음)

## 🔌 API 여부
- 필요 — 상세 명세는 [api-spec.md](./api-spec.md) 참고 (내부 Next.js API 라우트 + Confluence Cloud/AX Auth 외부 연동)
