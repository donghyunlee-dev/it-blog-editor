# 📄 PRD — SFOOD IT Editor

> 전체 진행률: 33 / 67 항목 완료 (최근 갱신: 2026-08-27 — Phase 4 P0-3(동시 편집 시 sourceDocument 버전 가드) 완료)
>
> **이 문서는 항상 최종 결과물과 동일해야 한다.** 코드가 바뀌면 이 문서도 같은 커밋 흐름 안에서 갱신한다 — 작업 진행 방식(task/plan/result/test 4파일 루틴)은 [CLAUDE.md](../../CLAUDE.md)의 "작업 루틴" 절 참고.

## 🎯 서비스 정의
- 사내 직원이 WYSIWYG 에디터로 문서를 작성해 Confluence에 보관하고, 원할 때 Tech Blog 등 외부 뷰어에 게시할 수 있게 하는 사내 전용 문서 작성·게시 도구다.
- 초안은 작성자 본인 외 누구에게도 보이지 않고, 게시하면 Confluence Space 구성원 전체에 공개된다.
- 관련 문서: [requirements.md](./requirements.md), [architecture.md](./architecture.md), [design.md](./design.md), Phase 4의 근거가 된 [프로덕션 준비도 감사 리포트](https://claude.ai/code/artifact/87302c07-68d6-42ed-8712-9345547cb659)(2026-08-27)

## 🖥️ 화면 정의
`/editor`로 시작하는 모든 화면은 좌측 사이드바(문서 목록·태그 필터·"새 문서" 버튼)가 있는 공통 앱 셸 레이아웃(`src/app/editor/layout.tsx`) 안에서 렌더링된다. 상세 상호작용은 [docs/superpowers/specs/2026-08-21-editor-ui-ux-design.md](../superpowers/specs/2026-08-21-editor-ui-ux-design.md) 참고.

| 화면 | 목적 | 주요 구성 요소 | 진입 경로 |
|---|---|---|---|
| 로그인 화면 | AX Auth(사내 SSO)로 로그인 | `@sfood/ui`의 `Card`/`Typography`/`Alert` 조합(`LoginSimple`은 email/password 폼 전용이라 SSO 리다이렉트 흐름에 맞지 않아 쓰지 않음 — [design.md](./design.md) "로그인 화면" 절 참고), "MS 계정으로 로그인" 버튼, 로그인 실패 안내 | `/login` |
| 내 문서함 | 로그인한 사용자의 문서 목록 조회(사이드바 중심) | 사이드바(문서 목록 + 상태 뱃지 + 태그, 태그 필터, "새 문서" 버튼), 본문 영역은 문서 미선택 시 빈 상태(`EmptyState`) | `/editor` |
| 새 문서 작성 / 문서 편집 | WYSIWYG로 문서 작성·수정, 태그 지정, 이미지 삽입, 삭제 | 큰 제목 입력, 태그 칩 입력, TipTap 본문 에디터(슬래시 삽입 메뉴, 텍스트 선택 시 버블 툴바), 드래그앤드롭/붙여넣기 이미지 업로드, 저장·삭제(확인 모달)·게시 설정 여는 버튼 | `/editor/new`, `/editor/[pageId]` |
| 게시 설정 | 게시 여부·뷰어별 slug·메타 설명 설정 | 문서 전체 게시 토글, 뷰어별 카드(지금은 Tech Blog 1개, 카드마다 slug·메타 설명 입력) — 별도 화면이 아니라 문서 편집 화면(`DocumentEditor`) 안에서 열리는 `Modal` 오버레이다(2026-08-26 변경 — 기존 `src/app/editor/[pageId]/publish/page.tsx`는 삭제됨) | 별도 라우트 없음 — `/editor/[pageId]` 화면 내 Modal |

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
- 상태: 완료 — WYSIWYG(TipTap) 기반으로 재구현됨. 산출물: src/components/editor/RichTextEditor.tsx, src/components/editor/DocumentEditor.tsx, src/components/editor/SlashCommandExtension.ts, src/lib/editor/tiptap-to-storage.ts

### 기능 — 이미지 첨부
- 설명: 문서에 이미지를 드래그앤드롭하거나 클립보드에서 붙여넣으면 자동 업로드되고 그 위치에 바로 삽입된다(업로드 중 로딩 표시).
- 입력: 이미지 파일(png/jpeg/gif/webp)
- 출력·동작: Confluence 첨부파일로 업로드, 에디터 문서(TipTap JSON)의 해당 위치에 이미지 노드로 삽입 → storage format 변환 시 `confluence-attachment://{filename}` 참조를 거쳐 `<ac:image>`로 매핑
- 예외 상황: 파일 누락·허용되지 않는 형식 → 400
- 데이터 저장 여부: 예(Confluence 첨부파일)
- API 필요 여부: 예 — `POST /api/editor/documents/{pageId}/images`
- 상태: 완료 — 드래그앤드롭·붙여넣기·슬래시 메뉴("이미지") 세 경로 모두 지원. 산출물: src/components/editor/RichTextEditor.tsx, src/components/editor/SlashCommandExtension.ts, src/lib/editor/image-upload.ts

### 기능 — 초안-게시 생명주기 (숨김 ↔ 공개)
- 설명: 문서는 항상 "초안" 또는 "게시됨" 상태다. 초안은 작성자 본인 외 누구에게도 보이지 않고, 게시하면 Space 구성원 전체에 공개된다.
- 입력: 게시 여부(on/off)
- 출력·동작: 문서 페이지의 parent를 같은 계정 폴더 내 "초안" ↔ "게시" 서브페이지 사이로 이동하고, Confluence 페이지 제한(Restriction)을 그에 맞춰 적용/해제한다. 제한 대상은 서비스 계정 자신(직원 개인 계정 매핑 없음).
- 예외 상황: 페이지 이동/제한 API 실패 시 502 + Slack 알림. 스파이크로 사전 검증 필요(parentId 변경 지원 여부, restriction API 버전, 자기 자신 제한이 자기 API 호출을 막는지)
- 데이터 저장 여부: 예 — data-spec.md의 "문서(페이지 위치·제한 상태)" 참고
- API 필요 여부: 예 — 기존 `PATCH /api/editor/documents/{pageId}/publish`를 확장
- 상태: 완료 — 산출물: src/lib/editor/folder.ts, src/lib/editor/publish.ts, src/lib/confluence/client.ts

### 기능 — 문서 태그 지정
- 설명: 문서를 폴더가 아닌 다중 태그로 분류한다. 편집 화면에서는 칩(chip) UI로 입력하고(Enter/쉼표로 확정), 문서함에서 이미 쓰인 태그를 자동완성 후보로 보여준다. 문서함 사이드바에서는 태그로 필터링할 수 있다.
- 입력: 태그 목록(자유 텍스트, 다중)
- 출력·동작: Confluence 네이티브 페이지 라벨로 저장/조회
- 예외 상황: 없음(자유 입력, 사전 정의 카테고리 없음)
- 데이터 저장 여부: 예 — Confluence 페이지 라벨
- API 필요 여부: 예 — 신규 엔드포인트 필요(라벨 추가/조회)
- 상태: 완료 — 산출물: src/lib/editor/tags.ts, src/lib/editor/tag-suggestions.ts, src/app/api/editor/documents/[pageId]/tags/route.ts, src/components/editor/TagInput.tsx

### 기능 — 게시 메타데이터의 뷰어별 확장
- 설명: 게시 시 slug·메타 설명을 뷰어(예: Tech Blog)별로 따로 관리할 수 있게 한다. 게시 설정 화면에는 뷰어마다 카드가 하나씩 있고, 뷰어가 늘어나도 화면 구조를 다시 설계하지 않아도 된다.
- 입력: 뷰어 ID, slug, 메타 설명
- 출력·동작: `publishMetadata.viewers[viewerId] = { slug, metaDescription }` 구조로 저장. slug 중복 체크는 뷰어별로 분리
- 예외 상황: 게시 시 slug/metaDescription 누락 → 400, slug 중복(같은 뷰어 내) → 409
- 데이터 저장 여부: 예
- API 필요 여부: 예 — 기존 게시 설정 API의 요청/응답 스키마 변경
- 상태: 완료 — `targetViewers: string[]` 구조에서 마이그레이션 완료. 산출물: src/lib/editor/publish.ts, src/components/editor/PublishForm.tsx

### 기능 — 댓글 저장 구조 (데이터 구조만 정의, API/화면은 범위 밖)
- 설명: Tech Blog 독자가 게시된 문서에 댓글을 남길 수 있도록, Confluence에 저장되는 데이터 구조를 정의한다. 실제 댓글 작성/조회 API와 화면은 별도 Viewer 프로젝트가 자체 Confluence 자격증명으로 구현한다.
- 입력(Viewer 쪽 기준, 참고용): 댓글 본문, (로그인 시) 세션 이메일/이름, (비로그인 시) 사용자가 입력한 이메일/이름
- 출력·동작(참고용): Confluence footer comment 생성 + `commenterMeta { email, name, isEmployee }` content property 부착
- 예외 상황: 이 프로젝트 범위 밖(문서화만)
- 데이터 저장 여부: 예 — data-spec.md의 "댓글" 참고(스키마 정의만, 이 프로젝트가 직접 쓰지 않음)
- API 필요 여부: 아니오 (이 프로젝트 범위 밖)
- 상태: 완료 — 스키마 문서화 반영됨. 산출물: docs/product/data-spec.md

### 기능 — 에디터 상호작용 강화 (앱 셸 · 슬래시 메뉴 · 버블 툴바)
- 설명: 화면 전환마다 다시 그려지지 않는 좌측 사이드바(문서 목록·태그 필터) 앱 셸을 두고, 상단 고정 포맷 툴바 대신 텍스트 선택 시 뜨는 버블 툴바와 `/` 슬래시 삽입 메뉴로 서식·블록을 삽입한다(Notion/Confluence류 문서 도구와 동일한 상호작용 패턴).
- 입력: 텍스트 선택(버블 툴바 트리거), `/` 입력(슬래시 메뉴 트리거), 사이드바에서 문서 클릭(전환)
- 출력·동작: 버블 툴바로 굵게/기울임/취소선/글자색/하이라이트/링크 적용, 슬래시 메뉴로 제목/목록/표/이미지/코드블록/패널(정보·경고·노트) 삽입, 사이드바 클릭 시 전체 화면 전환 없이 본문 영역만 바뀜
- 예외 상황: 해당 없음(순수 클라이언트 상호작용)
- 데이터 저장 여부: 아니오
- API 필요 여부: 아니오
- 상태: 완료 — 슬래시 메뉴에 이미지·번호 목록 항목 추가로 최종 완료(2026-08-25). 산출물: src/app/editor/layout.tsx, src/components/editor/EditorSidebar.tsx, src/components/editor/RichTextEditor.tsx, src/components/editor/SlashCommandExtension.ts

### 기능 — 디자인 시스템(`@sfood/ui`) 도입
- 설명: 사내 디자인 시스템 컴포넌트·템플릿으로 화면을 구성한다. 로그인 화면은 `LoginSimple` 템플릿, 그 외 화면은 `Sidebar`/`StatusBadge`/`Tag`/`ChipGroup`/`List`/`EmptyState`/`Button`/`FormField`/`Modal`/`Toast`/`Card` 등 컴포넌트를 조합한다. 상세 매핑은 [design.md](./design.md) 참고.
- 입력: 해당 없음
- 출력·동작: `@sfood/ui`·Tailwind CSS 설치, 기존 `globals.css`의 커스텀 클래스를 단계적으로 대체
- 예외 상황: 해당 없음
- 데이터 저장 여부: 아니오
- API 필요 여부: 아니오
- 상태: 완료 — 에디팅 화면(사이드바·에디터·태그·게시 설정)에 이어 페이지 셸(문서 작성/수정/게시 설정 화면의 제목·이동 버튼·카드 컨테이너)까지 `@sfood/ui`로 전환 완료(2026-08-25), `globals.css`의 구형 `.page`/`.card`/`.button*`/`.field`/`.empty-state`/`.doc-list*`/`.badge*`/`.error-text` 클래스 제거. 2026-08-26 갱신: 게시 설정은 별도 페이지가 아니라 `DocumentEditor` 내부 Modal로 통합되어 `src/app/editor/[pageId]/publish/page.tsx`는 삭제됨. 산출물: src/app/editor/[pageId]/page.tsx, src/app/editor/new/page.tsx, src/components/editor/DocumentEditor.tsx, src/app/globals.css

## 🗺️ 단계별 개발 계획

### Phase 0 — 기존 스캐폴딩 (완료)
- 목표: 로그인부터 문서 CRUD, 이미지 첨부, 기본 게시 설정까지의 최소 동작 확인
- 포함 기능: 로그인, 내 문서함 조회, 문서 작성·수정·삭제, 이미지 첨부

### Phase 1 — Confluence 콘텐츠 구조 개편 (완료)
- 목표: 초안이 다른 직원에게 숨겨지고, 게시 시 공개되는 생명주기를 실제로 구현. 태그·뷰어별 게시 메타데이터 구조로 전환. 댓글 저장 스키마를 문서로 확정
- 포함 기능: 초안-게시 생명주기, 문서 태그 지정, 게시 메타데이터의 뷰어별 확장, 댓글 저장 구조

### Phase 2 — 화면 UI/UX 개편 (WYSIWYG · 앱 셸 · 디자인 시스템) (완료)
- 목표: Markdown textarea 기반의 최소 UI를 WYSIWYG 에디터·사이드바 앱 셸·사내 디자인 시스템(`@sfood/ui`) 기반으로 전환한다.
- 포함 기능: 문서 작성·수정·삭제(WYSIWYG 재구현), 이미지 첨부(드래그앤드롭/붙여넣기 UX), 문서 태그 지정(칩 UI), 게시 메타데이터의 뷰어별 확장(카드 UI), 에디터 상호작용 강화(앱 셸·슬래시 메뉴·버블 툴바), 디자인 시스템(`@sfood/ui`) 도입

### Phase 3 — UI/UX 진단 후속 조치 (완료)
- 목표: Phase 2 완료 직후 진행한 화면 디자인 진단([SFOOD IT Editor 디자인 진단](https://claude.ai/code/artifact/3cb3066b-6971-49eb-b908-3ad0669289f8))에서 나온 결함·부족한 부분을 심각도(P0/P1/P2) 순으로 해소한다. 로그인 화면은 실제 Playwright로 렌더링해 스크린샷으로 직접 확인했다(2026-08-25).
- 포함 기능: 링크형 버튼 대비 결함(P0), 브랜드 토큰·CSS 레이어 아키텍처 결함(P0), 편집 화면 제목 중복(P1), 사이드바 모바일 대응(P1), 로그아웃 진입점(P2), 디자인 시스템 문서-코드 드리프트 방지 장치(P2)

### Phase 4 — 프로덕션 하드닝 (진행 중)
- 목표: 2026-08-27 [프로덕션 준비도 감사](https://claude.ai/code/artifact/87302c07-68d6-42ed-8712-9345547cb659)에서 발견된 데이터 손실·정보 노출·확장성·접근성 공백을 해소한다. requirements.md가 "2차: 개인 에디터 기능 강화(상세 요구사항은 1차 완료 후 별도로 논의)"로 남겨뒀던 논의를 실제로 진행한 결과이기도 하다.
- 포함 기능: 감사 리포트의 발견 항목 18개(P0 6건·P1 9건·P2 3건)를 검증 가능한 단위로 더 잘게 쪼갠 37개 세부 항목(P0 9개·P1 23개·P2 5개). 목록은 아래 체크리스트 참고.
- 진행 방식: 항목마다 [CLAUDE.md](../../CLAUDE.md)의 "작업 루틴"(task→plan→result→test→PRD)을 따른다. 값·방식이 아직 정해지지 않은 항목(🔶 표시)은 GitHub Issue로 결정을 받은 뒤 착수하고, 추측으로 진행하지 않는다 — 6건 모두 2026-08-27에 이슈로 등록됐다(진행 현황은 [_pending-decisions.md](../superpowers/tasks/_pending-decisions.md) 참고).

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

### Phase 1 — Confluence 콘텐츠 구조 개편 (완료)
- [x] (완료) 스파이크 — 1~3: parentId 변경, Restriction API 버전, 자기 제한이 자기 API 호출 차단 여부 (2026-08-21 검증 완료) / 4: 제한 없는 계정 폴더 하위 제한 없는 "게시" 서브페이지가 형제 "초안"의 제한과 무관하게 독립적으로 유지되는지 (2026-08-25 검증 완료) — 산출물: docs/product/architecture.md, src/lib/confluence/client.ts
- [x] (완료) `folder.ts` 개편 — 계정 폴더 생성 시 "초안"(제한)/"게시"(제한 없음) 서브페이지 자동 생성, 관련 API 라우트·화면 응답 필드 갱신 — 산출물: src/lib/editor/folder.ts, src/lib/editor/folder.test.ts
- [x] (완료) `confluence/client.ts`에 페이지 이동(movePage)·제한 적용/해제 함수 추가 — 산출물: src/lib/confluence/client.ts (구조 변경과 무관해 그대로 유효)
- [x] (완료) `documents.ts` 개편 — "내 문서함" 목록이 초안+게시를 합쳐서 상태 뱃지로 보여주도록 변경 — 산출물: src/lib/editor/documents.ts, src/lib/editor/documents.test.ts
- [x] (완료) `publish.ts` 개편 — 게시/게시취소 시 같은 계정 폴더 내 초안↔게시 서브페이지 이동 + 제한 토글로 변경 — 산출물: src/lib/editor/publish.ts, src/lib/editor/publish.test.ts
- [x] (완료) 태그(라벨) 추가/조회 연동 — 산출물: src/lib/editor/tags.ts, src/app/api/editor/documents/[pageId]/tags/route.ts (구조 변경과 무관해 그대로 유효)
- [x] (완료) 댓글 저장 구조(`commenterMeta`) 문서화 반영 — 산출물: docs/product/data-spec.md

### Phase 2 — 화면 UI/UX 개편 (WYSIWYG · 앱 셸 · 디자인 시스템) (완료)
- [x] (완료) 화면 UI/UX 브레인스토밍 및 설계 — 산출물: docs/superpowers/specs/2026-08-21-editor-ui-ux-design.md, docs/product/design.md, CLAUDE.md
- [x] (완료) 디자인 시스템(`@sfood/ui`) + Tailwind CSS 설치 및 설정, 페이지 셸(편집/작성/게시 설정 화면) 적용 — 산출물: package.json, tailwind.config.js, src/app/globals.css, src/app/editor/[pageId]/page.tsx, src/app/editor/new/page.tsx (2026-08-25: 페이지 셸 3곳 전환 및 구형 `.page`/`.card`/`.button*` 등 클래스 제거; 2026-08-26: 게시 설정 페이지 셸은 `DocumentEditor` 내부 Modal로 흡수되어 `src/app/editor/[pageId]/publish/page.tsx` 삭제)
- [x] (완료, `LoginSimple` 대신 대체 구성) 로그인 화면 디자인 시스템 전환 — `LoginSimple`은 email/password 폼 전용이라 AX Auth 리다이렉트 흐름에 맞지 않음이 확인되어(design.md "Task 15 검증" 참고) `Card`+`Typography`+`Alert` 조합으로 구현 — 산출물: src/app/login/page.tsx, docs/product/design.md
- [x] (완료) TipTap 기반 WYSIWYG 에디터 도입(1차 서식 목록 + 슬래시 메뉴 이미지/번호 목록) — 산출물: src/components/editor/RichTextEditor.tsx, src/components/editor/SlashCommandExtension.ts (2026-08-25: 슬래시 메뉴에 "이미지"·"번호 목록" 항목 추가)
- [x] (완료) 문서 원본 저장 형식 전환(`sourceMarkdown` → `sourceDocument`) + Confluence 변환기 재작성 — 산출물: src/lib/editor/documents.ts, src/lib/editor/tiptap-to-storage.ts
- [x] (완료) 이미지 붙여넣기/드래그앤드롭 업로드 UX + 슬래시 메뉴 이미지 삽입 — 산출물: src/components/editor/RichTextEditor.tsx, src/components/editor/SlashCommandExtension.ts
- [x] (완료) 사이드바 앱 셸(레이아웃) 구축 — 산출물: src/app/editor/layout.tsx, src/components/editor/EditorSidebar.tsx
- [x] (완료) 태그 칩 입력 UI(자동완성 포함) — 산출물: src/components/editor/TagInput.tsx, src/lib/editor/tag-suggestions.ts
- [x] (완료) 게시 설정 화면 뷰어별 카드 UI — 산출물: src/components/editor/PublishForm.tsx, src/lib/editor/publish.ts

### Phase 3 — UI/UX 진단 후속 조치 (완료)
- [x] (완료, P0) 링크형 버튼 텍스트 대비 결함 수정 — `globals.css`의 `a`/`h1~h3` 규칙이 Tailwind 레이어 밖에 있어 특정성과 무관하게 항상 이겨, `text-on-brand`/`text-foreground` 클래스를 입힌 `<a>`(로그인 CTA·사이드바 "새 문서"·"탐색기로"/"편집으로" 등 이 프로젝트 전반의 Link-as-Button 패턴)의 대비가 1.75:1까지 떨어졌던 문제. `@layer base`로 이동해 해결(대비 1.75:1 → 4.10:1, 실측). 산출물: src/app/globals.css
- [x] (완료, P0) 브랜드 토큰·CSS 레이어 아키텍처 결함 수정 — 세 가지를 실제로 빌드해 확인하고 고쳤다: ① `@sfood/ui/global.css`를 통째로 import하면 그 안의 `@tailwind utilities`가 이 프로젝트 컴파일과 별개의 두 번째 컴파일을 만들어 레이어 밖(unlayered) 유틸리티 사본이 쌓이고, 이게 특정성과 무관하게 반응형 variant(`md:hidden` 등)를 이겨 버리는 문제 → `@sfood/ui/tokens/*.css`만 직접 import하도록 전환(body 배경/글자색/폰트 스무딩은 `globals.css`에서 직접 선언). ② `@sfood/ui`의 브랜드 토큰(`#d65050`)이 이미 s-food.co.kr 실제 강조색에 맞춰 보정돼 있음을 base.css 주석으로 확인 → 이 프로젝트의 구형 `--color-brand`(#e4002b) 등 재정의를 완전히 제거(위 ①로 원천 차단됨). ③ `@sfood/ui` 프리셋의 `theme.extend.spacing`이 `xs/sm/md/lg/xl/2xl` 키를 max-width 스케일과 겹치게 만들어 `max-w-sm`이 24rem 대신 8px로 계산되던 문제(로그인 카드가 8px 폭으로 찌그러져 한글이 세로로 줄바꿈됨, Playwright 스크린샷으로 발견) → `@theme`/`tailwind.config.js` 보정을 모두 실제 빌드해 시도했으나 `@config` 호환 로더가 조용히 무시하는 것을 확인, `max-w-[24rem]` arbitrary value로 우회(재발 방지 주석을 `globals.css` 상단에 남김). 산출물: src/app/layout.tsx, src/app/globals.css, src/app/login/page.tsx, docs/product/design.md
- [x] (완료, P1) 편집 화면 제목 중복 제거 — 페이지 상단 정적 제목과 카드 안 편집 가능한 제목 입력창이 같은 텍스트를 중복 노출하던 문제. 게시 설정 화면과 동일하게 H1="문서 편집" + 부제목=문서 제목으로 통일. 산출물: src/app/editor/[pageId]/page.tsx
- [x] (완료, P1) 사이드바 모바일 오프캔버스 대응 — 375px 뷰포트에서 256px 고정 사이드바가 화면의 68%를 차지해 본문이 119px로 압박되던 문제. 모바일 폭에서 사이드바를 기본적으로 화면 밖에 두고 좌상단 토글 버튼으로 여는 드로어로 전환(Tailwind의 `translate-x-0`/`-translate-x-full` 클래스 토글이 이 프로젝트 빌드에서 신뢰할 수 없어 `matchMedia` + 인라인 스타일로 구현). 실제 Playwright 클릭으로 열림/닫힘 동작까지 확인. 산출물: src/components/editor/EditorShell.tsx, src/components/editor/EditorShell.test.tsx, src/components/editor/EditorSidebar.tsx
- [x] (완료, P2) 로그아웃 진입점 추가 — 화면 어디에도 로그아웃 버튼이 없던 문제(`signOut`이 export만 되고 미사용). 사이드바 하단에 로그인 이메일 + 로그아웃(서버 액션)을 추가. 산출물: src/lib/actions/logout.ts, src/components/editor/EditorSidebar.tsx, src/app/editor/layout.tsx
- [x] (완료, P2) 디자인 시스템 문서-코드 드리프트 방지 장치 — design.md가 `@sfood/ui`의 실제 타입 정의를 근거로 남긴 결정들(Sidebar/List/LoginSimple/ChipGroup을 특정 방식으로만 쓰기로 한 이유)이 `@sfood/ui` 업그레이드로 조용히 낡을 수 있는 문제. 그 근거가 되는 타입 사실을 `expectTypeOf`로 인코딩한 타입 전용 테스트를 추가해, 시그니처가 바뀌면 `tsc --noEmit`이 실패하도록 함. 산출물: src/components/editor/design-system-contract.test.ts

### Phase 4 — 프로덕션 하드닝 (진행 중)
각 항목의 산출물은 `docs/superpowers/tasks/{ID}-{slug}/{task,plan,result,test}.md` 4파일이다(진행 시 생성 —
[CLAUDE.md](../../CLAUDE.md) "작업 루틴" 참고). 🔶는 착수 전 GitHub Issue로 결정을 받아야 하는 항목이다.

**P0 — 즉시 조치(데이터 손실·오작동·정보 노출 차단)**
- [x] (완료, P0-1a) 저장하지 않은 변경사항이 있는 상태에서 탭 닫기·다른 문서로 이동 시 이탈 경고를 띄운다 — Next.js `<Link onNavigate>`(v15.3.0+)로 앱 내부 이동을 가로채 `Modal`로 확인받고, `beforeunload`로 탭 닫기/새로고침을 막는다. 브라우저 뒤로가기/앞으로가기 버튼(popstate)은 Next.js App Router에 안전한 차단 API가 없어 범위 밖으로 명시적으로 제외했다(추후 필요 시 재논의). 산출물: `docs/superpowers/tasks/P0-1a-unsaved-changes-warning/{task,plan,result,test}.md`, src/components/editor/UnsavedChangesContext.tsx, src/components/editor/EditorShell.tsx, src/components/editor/DocumentEditor.tsx, src/components/editor/EditorSidebar.tsx
- [ ] 🔶 (P0-1b) 자동 저장 도입 — **주의**: `docs/superpowers/plans/2026-08-21-editor-ui-ux-implementation.md`의 Global Constraints가 "저장은 수동 유지, 자동저장을 추가하지 않는다"고 이미 명시적으로 결정한 바 있다. 이번 감사와 상충하므로 재논의가 필요하다(로컬 임시저장만 할지, 서버 오토세이브까지 할지, 주기는 얼마로 할지) — [Issue #1](https://github.com/sfood-pioneer-1st/sfood-it-editor/issues/1) 답변 후 착수.
- [x] (완료, P0-2) 게시 설정 Modal의 "게시함" 스위치를 끌 때 `Modal` 확인 절차를 추가한다(문서 삭제와 동일한 안전장치). 게시 시작(켜기)·뷰어별 노출 토글·slug/메타 설명 저장은 기존처럼 확인 없이 즉시 저장된다 — 위험한 쪽(이미 공개된 문서의 순간 비공개 전환)만 막는다. 산출물: `docs/superpowers/tasks/P0-2-unpublish-confirm-modal/{task,plan,result,test}.md`, src/components/editor/PublishForm.tsx
- [x] (완료, P0-3) `updateDocument`의 `sourceDocument` 속성 저장에도 페이지 본문과 동일한 버전 검사를 적용해 동시 편집 시 원고 유실을 막는다 — 저장 시작 시점에 속성 버전을 함께 읽어 두고, 실제 쓰기 직전 다시 확인해 그 사이 다른 요청이 먼저 썼으면 `ConflictError`를 던진다(완전한 원자적 트랜잭션은 Confluence Cloud API의 근본적 한계로 불가능 — "조용한 유실"을 "감지 가능한 오류"로 바꾸는 데까지가 이 계층에서 가능한 범위). 산출물: `docs/superpowers/tasks/P0-3-sourcedocument-version-guard/{task,plan,result,test}.md`, src/lib/confluence/client.ts, src/lib/editor/documents.ts
- [ ] 🔶 (P0-4a) 이미지 업로드 최대 파일 크기를 제한한다 — 상한 값은 [Issue #2](https://github.com/sfood-pioneer-1st/sfood-it-editor/issues/2)에서 결정.
- [ ] (P0-4b) 이미지 업로드 개수(붙여넣기/드래그앤드롭 1회 처리량, 문서당 누적)에 상한을 둔다.
- [ ] (P0-5a) `findPublishedPageBySlug` 반복 스캔 비용을 캐시로 완화한다(즉시 완화책).
- [ ] 🔶 (P0-5b) slug 조회를 구조적으로 해결한다(색인 구조 또는 Confluence CQL 검색 활용 여부) — 방식은 [Issue #3](https://github.com/sfood-pioneer-1st/sfood-it-editor/issues/3)에서 결정.
- [ ] (P0-6) `toErrorResponse`가 클라이언트에 내려보내는 오류 메시지를 일반화하고, 원문 상세는 서버 로그에만 남긴다.

**P1 — 실사용 확장 전 필요**
- [ ] (P1-1a) 사이드바 검색을 태그·본문까지 확장한다.
- [ ] (P1-1b) 문서 목록 정렬 옵션(최신순/제목순)을 추가한다.
- [ ] (P1-1c) 문서 목록에 페이지네이션 또는 무한스크롤을 도입한다.
- [ ] (P1-2a) Confluence 페이지 버전 이력을 읽기 전용으로 조회하는 화면을 추가한다.
- [ ] (P1-2b) 삭제된 문서를 복구하는 기능을 추가한다.
- [ ] (P1-3) `confluenceRequest`에 429/5xx 대상 재시도·지수 백오프를 추가한다.
- [ ] 🔶 (P1-4a) 구조화 로깅을 도입한다 — 라이브러리/전송 대상은 [Issue #4](https://github.com/sfood-pioneer-1st/sfood-it-editor/issues/4)에서 결정.
- [ ] (P1-4b) Slack 웹훅 전송 자체가 실패할 때의 재시도/폴백을 추가한다.
- [ ] 🔶 (P1-5) 민감 API 엔드포인트(문서 생성, 이미지 업로드, 게시)에 레이트리밋을 추가한다 — 구현 방식(인메모리/외부 스토어)과 임계값은 [Issue #5](https://github.com/sfood-pioneer-1st/sfood-it-editor/issues/5)에서 결정.
- [ ] (P1-6a) 문서 제목 길이 상한을 서버에서 검증한다.
- [ ] (P1-6b) 태그 형식·길이·개수 상한을 서버에서 검증한다.
- [ ] (P1-6c) slug 형식(허용 문자)을 서버에서 검증한다.
- [ ] (P1-7a) 표에 행/열 추가·삭제 컨트롤을 추가한다.
- [ ] (P1-7b) 표 컬럼 리사이즈를 활성화한다.
- [ ] (P1-7c) 코드블록에 문법 강조를 추가한다.
- [ ] (P1-7d) Word/Google Docs 붙여넣기 서식을 정제하는 로직을 추가한다.
- [ ] (P1-8) 삽입된 이미지에 대체 텍스트(alt)를 입력할 수 있는 UI를 추가한다.
- [ ] (P1-9a) `documents/route.ts`(목록 조회·생성) 테스트를 추가한다.
- [ ] (P1-9b) `documents/[pageId]/route.ts`(수정·삭제) 테스트를 추가한다.
- [ ] (P1-9c) `documents/[pageId]/images/route.ts` 테스트를 추가한다.
- [ ] (P1-9d) `folder/route.ts` 테스트를 추가한다.
- [ ] (P1-9e) `RichTextEditor.tsx` 테스트를 추가한다.
- [ ] (P1-9f) `SlashCommandExtension.ts` 테스트를 추가한다.

**P2 — 다듬기**
- [ ] (P2-1a) 슬래시 메뉴에 `role`/`aria-selected` 등 ARIA를 보강한다.
- [ ] (P2-1b) 사이드바 리사이즈 핸들에 키보드 조작(방향키)을 추가한다.
- [ ] (P2-1c) 모바일 오프캔버스 드로어에 포커스 트랩을 추가한다.
- [ ] (P2-2) 문서-코드 드리프트 잔여 항목 정리 — 이번 갱신으로 prd.md의 게시 설정 라우트 서술은 반영됨. `EditorSidebar.tsx`의 `extractPageIdFromPathname`이 여전히 다루는 존재하지 않는 `/editor/{pageId}/publish` 경로 처리와 design.md 쪽 서술까지 확인·정리한다.
- [ ] 🔶 (P2-3) 비밀값을 AWS Secrets Manager 또는 SSM Parameter Store로 옮긴다 — architecture.md의 AWS 배포 방식(컨테이너/서버리스) 결정에 의존하므로, [Issue #6](https://github.com/sfood-pioneer-1st/sfood-it-editor/issues/6)에서 배포 방식과 시크릿 매니저 종류를 먼저 확정한다.

## 🗄️ 데이터 저장 여부
- 있음 — 상세 설계는 [data-spec.md](./data-spec.md) 참고 (Confluence content property·라벨 기반, 별도 DB 없음)

## 🔌 API 여부
- 필요 — 상세 명세는 [api-spec.md](./api-spec.md) 참고 (내부 Next.js API 라우트 + Confluence Cloud/AX Auth 외부 연동)
