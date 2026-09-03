# 📄 PRD — SFOOD IT Editor

> 전체 진행률: 66 / 71 항목 완료 (최근 갱신: 2026-09-03 — Ctrl+K 전역 검색 팝업을 Notion 스타일(좌측 그룹핑된 결과 목록 + 우측 미리보기, "제목만" 필터)로 재구성했다. 사용자가 실제 Notion 검색 화면 캡처를 공유하며 격차를 지적해 진행된 후속 작업이다. `@sfood/ui`의 `Modal`이 필요한 폭을 지원하지 않아 커스텀 오버레이로 대체(이유는 design.md 기록). 이 항목도 이미 완료 표시돼 있던 P1-1a에 딸린 후속 개선이라 체크리스트 개수(71개)에는 변화가 없다. 이전 갱신: P1-1a 본문 검색 후속([Issue #7](https://github.com/sfood-pioneer-1st/sfood-it-editor/issues/7)) 완료 — `listDocuments()`가 이미 문서 본문을 조회하면서 버리고 있었다는 것을 확인해 원래 우려했던 N+1 비용 증가 없이 재사용, P2-3(AWS Lambda·시크릿 관리 결정) 완료, P1-5(민감 API 레이트리밋, 사용자당 분당 30회) 완료, P1-10 완료·P1-11 코드 측면 해소, Phase 4 P1-8·P1-9a~f 7개 항목 병합 완료)
>
> **이 문서는 항상 최종 결과물과 동일해야 한다.** 코드가 바뀌면 이 문서도 같은 커밋 흐름 안에서 갱신한다 — 작업 진행 방식(task/plan/result/test 4파일 루틴)은 [CLAUDE.md](../../CLAUDE.md)의 "작업 루틴" 절 참고.

## 🎯 서비스 정의
- 사내 직원이 WYSIWYG 에디터로 문서를 작성해 Confluence에 보관하고, 원할 때 Tech Blog 등 외부 뷰어에 게시할 수 있게 하는 사내 전용 문서 작성·게시 도구다.
- 초안은 작성자 본인 외 누구에게도 보이지 않고, 게시하면 Confluence Space 구성원 전체에 공개된다.
- 관련 문서: [requirements.md](./requirements.md), [architecture.md](./architecture.md), [design.md](./design.md), Phase 4의 근거가 된 [프로덕션 준비도 감사 리포트](https://claude.ai/code/artifact/87302c07-68d6-42ed-8712-9345547cb659)(2026-08-27)

## 🖥️ 화면 정의
`/editor`로 시작하는 모든 화면은 좌측 사이드바(문서 목록·태그 필터·"새 문서" 버튼)가 있는 공통 앱 셸 레이아웃(`src/app/editor/layout.tsx`) 안에서 렌더링된다. `Ctrl+K`/`Cmd+K`로 어느 화면에서든 제목·태그·본문을 함께 검색하는 전역 검색 팝업(`GlobalSearchModal.tsx`, [Issue #7](https://github.com/sfood-pioneer-1st/sfood-it-editor/issues/7), 2026-09-03)도 이 앱 셸에 포함된다 — 사이드바 자체의 검색은 여전히 제목·태그만 본다. 상세 상호작용은 [docs/superpowers/specs/2026-08-21-editor-ui-ux-design.md](../superpowers/specs/2026-08-21-editor-ui-ux-design.md) 참고.

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

### 기능 — 문서 전체 검색(Ctrl+K)
- 설명: 사이드바의 상시 검색(제목·태그, 클라이언트 필터)과 별개로, `Ctrl+K`/`Cmd+K`로 여는 전역 팝업에서 제목·태그·본문(TipTap 문서에서 추출한 순수 텍스트)을 함께 검색한다([Issue #7](https://github.com/sfood-pioneer-1st/sfood-it-editor/issues/7), P1-1a 후속, 2026-09-03 결정·구현). `/editor/*` 어느 화면에서든 열 수 있다. Notion의 Ctrl+K 검색 화면을 참고해 좌측 결과 목록 + 우측 미리보기의 2단 레이아웃으로 재구성했다(2026-09-03 재구성).
- 입력: 검색어(자유 텍스트, 300ms 디바운스 후 서버에 전송), "제목만" 필터 토글(클라이언트에서 결과를 다시 거름, 재조회 없음)
- 출력·동작: 일치하는 문서를 최종 수정일 기준 오늘/어제/최근 7일/이전 구간으로 묶어 좌측 목록에 표시(각 행: 상태 아이콘 + 제목 + 태그). 방향키로 강조를 옮기면 우측 패널에 그 문서의 태그·제목·본문 스니펫 미리보기가 나타난다. 클릭하거나 Enter를 누르면 해당 문서 편집 화면으로 이동
- 예외 상황: 검색 API 실패 시 오류 메시지 표시. 개인 폴더가 없으면 빈 목록. 결과가 없으면 안내 문구
- 데이터 저장 여부: 아니오(조회 전용)
- API 필요 여부: 예 — `GET /api/editor/documents/search?q=...`(사용자가 팝업을 열고 입력할 때만 호출되는 온디맨드 API — 사이드바가 매 렌더링마다 쓰는 `listDocuments()`와는 별개). 응답에 미리보기용 `snippet`(본문 중 검색어 주변 문맥, 없으면 본문 앞부분) 필드 포함
- 상태: 완료 — `listDocuments()`가 이미 문서마다 본문(`sourceDocument.doc`)을 조회하면서 제목만 쓰고 버리고 있었다는 것을 확인해 그 조회를 재사용했다(원래 우려했던 "N+1 비용을 배로 늘린다"는 문제가 실제로는 없음). `@sfood/ui`의 `Modal`은 `size`가 최대 `max-w-2xl`까지만 지원해 2단 와이드 레이아웃을 담을 수 없어 커스텀 오버레이로 대체했다(이유는 design.md "Ctrl+K 검색 팝업" 절 참고). 산출물: `docs/superpowers/tasks/P1-1a-content-search-ctrlk/{task,plan,result,test}.md`(최초 구현), `docs/superpowers/tasks/P1-1a-search-notion-style-redesign/{task,plan,result,test}.md`(Notion 스타일 재구성), src/lib/editor/documents.ts, src/lib/editor/documents.test.ts, src/app/api/editor/documents/search/route.ts, src/app/api/editor/documents/search/route.test.ts, src/components/editor/GlobalSearchModal.tsx, src/components/editor/GlobalSearchModal.test.tsx, src/components/editor/EditorShell.tsx, src/components/editor/EditorSidebar.tsx

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
- 출력·동작: Confluence 페이지 제한(Restriction)을 게시 여부에 맞춰 적용/해제하고, `publishMetadata.isPublished`를 함께 기록한다. 제한 대상은 서비스 계정 자신(직원 개인 계정 매핑 없음). **2026-08-28 갱신(P0-8)**: 예전에는 계정 폴더 내 "초안"/"게시" 두 서브페이지 사이로 문서를 물리적으로 이동시키고 그 위치로 게시 여부를 판단했는데, "Confluence는 아무도 직접 열어보지 않는 DB일 뿐"이라는 결정(P0-7) 이후 폴더 이동이 있던 이유(사람이 트리를 탐색해 구분해본다는 전제) 자체가 사라져 제거했다 — 계정 폴더 하나에 모든 문서가 있고, 게시 여부는 오직 `publishMetadata`와 restriction으로만 판단한다.
- 예외 상황: 제한 적용/해제 API 실패 시 502 + Slack 알림. restriction 변경을 메타데이터 기록보다 항상 먼저 해서, 메타데이터 기록이 실패해도 재시도가 안전하게 수렴한다(restriction 자체가 멱등 연산).
- 데이터 저장 여부: 예 — data-spec.md의 "문서(제한 상태·게시 메타데이터)" 참고
- API 필요 여부: 예 — 기존 `PATCH /api/editor/documents/{pageId}/publish`를 확장
- 상태: 완료 — 산출물: src/lib/editor/folder.ts, src/lib/editor/publish.ts, src/lib/editor/documents.ts, src/lib/confluence/client.ts

### 기능 — 문서 태그 지정
- 설명: 문서를 폴더가 아닌 다중 태그로 분류한다. 편집 화면에서는 테두리+배경으로 구획된 칩(chip) UI 영역에 입력하고(Enter/쉼표로 확정, placeholder "예: React, Backend"), 문서함에서 이미 쓰인 태그를 자동완성 후보로 보여준다. 문서함 사이드바에서는 태그로 필터링할 수 있다.
- 입력: 태그 목록(자유 텍스트, 다중, 문서당 최대 20개·태그당 최대 50자)
- 출력·동작: Confluence 네이티브 페이지 라벨로 저장/조회
- 예외 상황: 개수(20개)·길이(50자) 초과, 빈 값, 금지 문자(`:`, `?`, `@`) 포함 시 400(`ValidationError`) — 2026-08-31(P1-6b) 추가. 그 외 Confluence가 형식 문제로 거부하면(우리가 사전에 걸러내지 못한 규칙) 502 대신 400으로 변환한다.
- 데이터 저장 여부: 예 — Confluence 페이지 라벨
- API 필요 여부: 예 — 신규 엔드포인트 필요(라벨 추가/조회)
- 상태: 완료 — 산출물: src/lib/editor/tags.ts, src/lib/editor/tag-suggestions.ts, src/app/api/editor/documents/[pageId]/tags/route.ts, src/components/editor/TagInput.tsx

### 기능 — 게시 메타데이터의 뷰어별 확장
- 설명: 게시 시 slug·메타 설명을 뷰어(예: Tech Blog)별로 따로 관리할 수 있게 한다. 게시 설정 화면에는 뷰어마다 카드가 하나씩 있고, 뷰어가 늘어나도 화면 구조를 다시 설계하지 않아도 된다.
- 입력: 뷰어 ID, slug, 메타 설명
- 출력·동작: `publishMetadata.viewers[viewerId] = { slug, metaDescription, publicSlug }` 구조로 저장(`publicSlug`는 2026-08-28 P0-5b에서 추가 — 서버가 `slug`에 문서별 전역 유일 내부 고유키를 붙여 계산한 실제 공개 URL 값)
- 예외 상황: 게시 시 slug/metaDescription 누락 → 400. **2026-08-28 갱신(P0-5b)**: slug 중복(409)은 더 이상 발생하지 않는다 — `publicSlug`가 구조적으로 항상 유일하다.
- 데이터 저장 여부: 예
- API 필요 여부: 예 — 기존 게시 설정 API의 요청/응답 스키마 변경
- 상태: 완료 — `targetViewers: string[]` 구조에서 마이그레이션 완료. **2026-08-28 갱신**: `PublishForm.tsx`의 "게시함"/"뷰어 노출" 스위치가 저장 실패 시(예: slug/metaDescription 누락 400) 낙관적으로 바꾼 화면 상태를 되돌리지 않던 버그를 실사용 확인 중 발견해 수정 — 실패하면 이전 상태로 롤백한다. 산출물: src/lib/editor/publish.ts, src/components/editor/PublishForm.tsx, src/components/editor/PublishForm.test.tsx

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
- [x] (완료, 2026-08-28 P0-8로 대체됨) `folder.ts` 개편 — 계정 폴더 생성 시 "초안"(제한)/"게시"(제한 없음) 서브페이지 자동 생성, 관련 API 라우트·화면 응답 필드 갱신 — 산출물: src/lib/editor/folder.ts, src/lib/editor/folder.test.ts. **2026-08-28 갱신**: Phase 4 P0-8에서 이 서브폴더 구조 자체를 제거했다(아래 Phase 4 체크리스트 참고) — 이 항목은 역사적 기록으로 남긴다.
- [x] (완료) `confluence/client.ts`에 페이지 이동(movePage)·제한 적용/해제 함수 추가 — 산출물: src/lib/confluence/client.ts (구조 변경과 무관해 그대로 유효, movePage는 P1-2b 복구 기능에서 계속 쓰인다)
- [x] (완료, 2026-08-28 P0-8로 일부 대체됨) `documents.ts` 개편 — "내 문서함" 목록이 초안+게시를 합쳐서 상태 뱃지로 보여주도록 변경 — 산출물: src/lib/editor/documents.ts, src/lib/editor/documents.test.ts. **2026-08-28 갱신**: 게시 여부 판단 방식이 "폴더 위치"에서 "publishMetadata property"로 바뀌었다(P0-8) — "초안+게시를 합쳐서 보여준다"는 동작 자체는 그대로 유지된다.
- [x] (완료, 2026-08-28 P0-8로 대체됨) `publish.ts` 개편 — 게시/게시취소 시 같은 계정 폴더 내 초안↔게시 서브페이지 이동 + 제한 토글로 변경 — 산출물: src/lib/editor/publish.ts, src/lib/editor/publish.test.ts. **2026-08-28 갱신**: 서브페이지 이동 부분은 P0-8에서 제거됐다 — 제한 토글만 남았다.
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
- [x] (완료, P0-1b) 자동 저장 도입 — [Issue #1](https://github.com/sfood-pioneer-1st/sfood-it-editor/issues/1)에서 결정(2026-08-27): 변경사항이 있을 때만, 1분마다 체크해서 저장, localStorage 임시 저장으로 Confluence 저장 실패에 대비. 기존 "저장은 수동 유지" 결정(2026-08-21 플랜)을 뒤집는다. 새 문서(mode="create")의 자동 저장과 태그 자동 저장은 범위 밖(제목·본문만 자동 저장, 태그는 수동 저장 유지). 2026-08-27 실사용 확인 중 풋터의 조용한 상태 표시만으로는 놓치기 쉽다는 피드백으로 성공 시에도 토스트를 띄우도록 갱신(진단용 콘솔 로그는 확인 후 제거). 산출물: `docs/superpowers/tasks/P0-1b-autosave/{task,plan,result,test}.md`, src/lib/editor/autosave-storage.ts, src/components/editor/DocumentEditor.tsx
- [x] (완료, P0-2) 게시 설정 Modal의 "게시함" 스위치를 끌 때 `Modal` 확인 절차를 추가한다(문서 삭제와 동일한 안전장치). 게시 시작(켜기)·뷰어별 노출 토글·slug/메타 설명 저장은 기존처럼 확인 없이 즉시 저장된다 — 위험한 쪽(이미 공개된 문서의 순간 비공개 전환)만 막는다. 산출물: `docs/superpowers/tasks/P0-2-unpublish-confirm-modal/{task,plan,result,test}.md`, src/components/editor/PublishForm.tsx
- [x] (완료, P0-3) `updateDocument`의 `sourceDocument` 속성 저장에도 페이지 본문과 동일한 버전 검사를 적용해 동시 편집 시 원고 유실을 막는다 — 저장 시작 시점에 속성 버전을 함께 읽어 두고, 실제 쓰기 직전 다시 확인해 그 사이 다른 요청이 먼저 썼으면 `ConflictError`를 던진다(완전한 원자적 트랜잭션은 Confluence Cloud API의 근본적 한계로 불가능 — "조용한 유실"을 "감지 가능한 오류"로 바꾸는 데까지가 이 계층에서 가능한 범위). 산출물: `docs/superpowers/tasks/P0-3-sourcedocument-version-guard/{task,plan,result,test}.md`, src/lib/confluence/client.ts, src/lib/editor/documents.ts
- [x] (완료, P0-4a) 이미지 업로드 최대 파일 크기를 제한한다 — [Issue #2](https://github.com/sfood-pioneer-1st/sfood-it-editor/issues/2)에서 10MB로 결정(추천안 그대로 채택). `registerImage`가 10MB 초과 시 `ValidationError`(400)를 던지고 Confluence 첨부파일 업로드를 호출하지 않는다. 클라이언트 사전 검사는 범위 밖(기존 MIME 타입 검사와 동일하게 서버 단일 검증 지점 유지). 산출물: `docs/superpowers/tasks/P0-4a-image-upload-size-limit/{task,plan,result,test}.md`, src/lib/editor/images.ts, src/lib/editor/images.test.ts
- [x] (완료, P0-4b) 이미지 업로드 개수(붙여넣기/드래그앤드롭 1회 처리량, 문서당 누적)에 상한을 둔다 — 1회 처리량은 원래부터 파일 1개만 처리하고 있어 사실상 이미 제한돼 있었고, 문서당 누적 30장 상한을 드래그앤드롭·붙여넣기·슬래시 메뉴 세 진입점에 공통 적용했다(서버 측 강제는 범위 밖 — UX 가드레일이지 보안 경계가 아니라고 판단). 산출물: `docs/superpowers/tasks/P0-4b-image-upload-count-limit/{task,plan,result,test}.md`, src/components/editor/RichTextEditor.tsx
- [x] (완료, P0-5a) `findPublishedPageBySlug` 반복 스캔 비용을 캐시로 완화한다(즉시 완화책) — Space 전체 slug 인덱스를 15초 TTL로 캐시하고, 이 프로세스가 직접 게시할 때는 즉시 무효화한다. 다른 프로세스가 TTL 안에 새로 게시한 slug는 못 볼 수 있다는 한계를 의도적으로 받아들였다(근본 해결은 P0-5b/Issue #3). 산출물: `docs/superpowers/tasks/P0-5a-slug-lookup-cache/{task,plan,result,test}.md`, src/lib/confluence/client.ts, src/lib/editor/publish.ts
- [x] (완료, P0-5b) slug 조회를 구조적으로 해결한다 — [Issue #3](https://github.com/sfood-pioneer-1st/sfood-it-editor/issues/3)에서 CQL(Forge 앱 설치 필요해 불가로 판명) → 계정별 인덱스 순으로 논의하다, 최종적으로 대화(채팅)에서 사용자가 결정한 방향으로 확정: slug 뒤에 P0-7의 내부 고유키(전역 유일)를 붙인 `publicSlug`를 계산해 저장한다. 다른 문서와 겹칠 수 없는 구조라 Space 전체를 스캔해 중복을 검사할 필요 자체가 사라졌다 — P0-5a의 TTL 캐시(`findPublishedPageBySlug`/`buildSlugIndex`/`listAllSpacePages`)를 전부 제거했다. 이 저장소 밖의 Tech Blog Viewer는 공개 URL 형식 변경(`slug` → `slug-내부고유키`)에 맞춰 별도로 반영이 필요하다(범위 밖, 문서화만 함). 산출물: `docs/superpowers/tasks/P0-5b-slug-structural-uniqueness/{task,plan,result,test}.md`, src/lib/confluence/client.ts, src/lib/editor/publish.ts, src/components/editor/PublishForm.tsx
- [x] (완료, P0-6) `toErrorResponse`가 클라이언트에 내려보내는 오류 메시지를 일반화하고, 원문 상세는 서버 로그에만 남긴다 — 분류되지 않은 오류(UPSTREAM_ERROR/502)만 대상이고, 도메인 에러 4종(의도된 사용자 메시지)과 Slack 알림(운영자 전용, 상세 유지)은 그대로 둔다. 산출물: `docs/superpowers/tasks/P0-6-sanitize-error-messages/{task,plan,result,test}.md`, src/lib/api-response.ts
- [x] (완료, P0-7) Confluence 페이지 title이 Space 전체에서 유일해야 하는 제약 때문에 서로 다른 계정이 흔한 제목("회의록" 등)으로 문서를 만들면 실제로 생성이 실패하는 버그를 고쳤다 — 2026-08-28, P0-5b 논의 중 사용자가 제기한 질문("계정별로 동일한 제목을 입력하면 어떻게 되는가?")에서 발견된, 감사 리포트에는 없던 신규 항목. Confluence page의 실제 title을 문서 생성 시 발급한 `randomUUID()`(내부 고유키, 이후 불변)로 바꾸고, 사용자가 보는 진짜 제목은 `sourceDocument` property에 별도 저장한다("Confluence는 DB 역할, 페이지를 직접 열어보는 건 관리자만" — 사용자 결정). 이 내부 고유키는 P0-5b의 `publicSlug` 계산에도 재사용된다. 실제 인스턴스로 직접 검증: 같은 제목으로 서로 다른 부모 밑에 페이지를 만들면 400(`A page with this title already exists`)이 재현되고, `randomUUID()` 제목은 충돌 없이 통과함을 확인했다. 산출물: `docs/superpowers/tasks/P0-7-document-title-uniqueness/{task,plan,result,test}.md`, src/lib/editor/documents.ts
- [x] (완료, P0-8) 게시 여부를 폴더 이동이 아니라 property만으로 관리하도록 단순화했다 — P0-7 직후 사용자가 "계정별 초안/게시 폴더를 나눠 이동시킬 필요가 있냐, property로 게시 여부만 관리하면 되지 않냐"고 제안해 착수. 기존 설계([2026-08-21 콘텐츠 구조 설계](../superpowers/specs/2026-08-21-confluence-content-structure-design.md))를 재검토한 결과 폴더 이동이 필요했던 세 이유(①사람이 Confluence 트리를 직접 탐색한다는 전제 ②`listDocuments()`가 위치로 게시 여부를 공짜로 판단 ③메타데이터 쓰기 실패에도 재시도가 안전하도록 위치를 진실로 삼음) 모두 이번 "Confluence는 아무도 안 본다" 결정 이후 사라졌거나(①), P0-7로 이미 무너졌거나(②, 문서마다 sourceDocument를 추가 조회하고 있어), restriction의 멱등성으로 대체 가능(③)하다고 판단했다. 계정 폴더 하위 "초안"/"게시" 서브폴더를 완전히 제거하고, 게시/게시취소는 이제 restriction 토글(먼저) + `publishMetadata.isPublished` 기록(나중)만으로 이뤄진다. 복구(P1-2b)도 계정 폴더 하나로만 이동하면 되고, 복구 시 `publishMetadata.isPublished`를 명시적으로 `false`로 되돌리도록 함께 고쳤다(안 하면 restriction은 비공개인데 표시는 "게시됨"인 자기모순 상태가 됨 — 새로 발견한 요구사항). 이미 완료 표시됐던 Phase 1 기능("초안-게시 생명주기")을 되돌리는 리팩터이지만, "개발 초기 단계에서 규칙을 바로잡아야 한다"는 사용자 판단에 따라 진행했다. 산출물: `docs/superpowers/tasks/P0-8-remove-draft-published-folder-move/{task,plan,result,test}.md`, src/lib/editor/folder.ts, src/lib/editor/documents.ts, src/lib/editor/publish.ts, src/lib/editor/deleted-documents.ts, src/lib/editor/tag-suggestions.ts, src/app/editor/layout.tsx, src/app/api/editor/documents/route.ts, src/app/api/editor/folder/route.ts

**P1 — 실사용 확장 전 필요**
- [x] (완료, P1-1a) 사이드바 검색을 태그까지 확장한다 — `DocumentSummary.tags`가 이미 클라이언트에 있어 추가 조회 없이 가능했다. 산출물: `docs/superpowers/tasks/P1-1a-search-by-tag-and-content/{task,plan,result,test}.md`, src/components/editor/EditorSidebar.tsx. **본문 검색 후속([Issue #7](https://github.com/sfood-pioneer-1st/sfood-it-editor/issues/7), 2026-09-03 완료)**: "Ctrl+K 전역 검색 팝업으로 개별 구현, 사이드바 검색은 제목·태그만 유지"로 결정됐다. `listDocuments()`가 이미 문서마다 본문(`sourceDocument.doc`)을 조회하면서 제목만 쓰고 버리고 있었다는 것을 확인해, 그 조회를 재사용하는 `searchDocuments()`(제목·태그·본문 텍스트 매칭)를 추가했다 — 원래 우려했던 "N+1 비용을 배로 늘린다"는 문제가 실제로는 발생하지 않는다. `GET /api/editor/documents/search`(온디맨드, `listDocuments()`와 별개) + `Ctrl+K`/`Cmd+K` 전역 검색 팝업(`GlobalSearchModal.tsx`, `/editor/*` 어디서든 열림, 클릭·방향키+Enter로 이동)을 추가했다. 사이드바의 기존 제목·태그 검색은 그대로 뒀다. **Notion 스타일 재구성(2026-09-03 완료)**: 사용자가 실제 Notion Ctrl+K 검색 화면 캡처를 공유하며 격차를 지적, 좌측 결과 목록(오늘/어제/최근 7일/이전 그룹핑, "제목만" 필터)과 우측 미리보기 패널의 2단 레이아웃으로 재구성했다(`docs/superpowers/tasks/P1-1a-search-notion-style-redesign/{task,plan,result,test}.md`). 상세는 "문서 전체 검색(Ctrl+K)" 기능 정의 참고.
- [x] (완료, P1-1b) 문서 목록 정렬 옵션(최신순/제목순)을 추가한다 — 기본값 최신순, 태그·검색어 필터 적용 후 정렬. 산출물: `docs/superpowers/tasks/P1-1b-document-list-sort/{task,plan,result,test}.md`, src/components/editor/EditorSidebar.tsx
- [x] (완료, P1-1c) 문서 목록에 페이지네이션 또는 무한스크롤을 도입한다 — 화면(사이드바) 쪽만 "더 보기" 버튼으로 30개씩 점진적으로 그린다. 서버 조회 범위(`listDocuments()`) 자체의 페이지네이션은 다루지 않았다 — 태그 자동완성(`tag-suggestions.ts`)이 같은 함수로 전체 목록을 필요로 해서 P0-5a/P1-1a와 같은 종류의 아키텍처 결정이 필요하다(`task.md` 참고, 별도 이슈 없이 알려진 위험으로 남김). 산출물: `docs/superpowers/tasks/P1-1c-document-list-pagination/{task,plan,result,test}.md`, src/components/editor/EditorSidebar.tsx
- [x] (완료, P1-2a) Confluence 페이지 버전 이력을 읽기 전용으로 조회하는 화면을 추가했다 — 문서 편집 화면 헤더의 "이력" 버튼 → Modal. `GET /api/v2/pages/{id}/versions` 응답 형태는 처음엔 실제 인스턴스로 검증하지 못한 채 PR로 올렸으나, 2026-08-28 사용자 승인 하에 실제(미사용) Confluence 인스턴스로 직접 확인했다(`number`/`createdAt` 필드명 일치, 서버가 이미 최신순 반환 — `docs/superpowers/tasks/P1-2a-revision-history-view/test.md` 참고). [PR #8](https://github.com/sfood-pioneer-1st/sfood-it-editor/pull/8) 머지 완료. 산출물: `docs/superpowers/tasks/P1-2a-revision-history-view/{task,plan,result,test}.md`, src/lib/confluence/client.ts, src/lib/editor/documents.ts, src/app/api/editor/documents/[pageId]/versions/route.ts, src/components/editor/VersionHistory.tsx, src/components/editor/DocumentEditor.tsx
- [x] (완료, P1-2b) 삭제된 문서를 복구하는 기능을 추가했다 — 삭제 시 작성자 계정 폴더의 `deletedDocuments` property에 기록해두고(휴지통을 직접 질의하는 대신 P0-5a와 같은 "직접 기록해둔 상태만 신뢰" 패턴 재사용), 사이드바의 문서 목록과 계정 정보 사이에 별도로 분리한 "삭제된 문서" 영역에서 Modal을 열어 "초안"으로 되돌릴 수 있다. `movePage`가 트래시된 페이지를 대상으로도 동작하는지는 2026-08-28 사용자 승인 하에 실제(미사용) Confluence 인스턴스로 직접 검증했다(트래시 이동 시 `parentId`가 `null`이 되는 것·트래시 상태에서의 `GET`·`PUT status:"current"` 복구 모두 확인됨, 부수적으로 `DELETE`가 일시적 500을 반환한 사례도 발견 — P1-3의 필요성을 뒷받침). [PR #9](https://github.com/sfood-pioneer-1st/sfood-it-editor/pull/9) 머지 완료. 산출물: `docs/superpowers/tasks/P1-2b-restore-deleted-document/{task,plan,result,test}.md`, src/lib/editor/documents.ts, src/lib/editor/deleted-documents.ts, src/app/api/editor/documents/deleted/route.ts, src/app/api/editor/documents/[pageId]/restore/route.ts, src/components/editor/DeletedDocumentsModal.tsx, src/components/editor/EditorSidebar.tsx
- [x] (완료, P1-3) `confluenceRequest`에 429/5xx 대상 재시도·지수 백오프를 추가한다 — 재시도는 GET(멱등) 요청에만 적용했다(Confluence Cloud API에 idempotency key가 없어, POST/PUT/DELETE를 재시도하면 실제로 반영된 요청을 중복 실행할 위험이 있어 제외). 최대 3회, 지수 백오프+jitter, 429의 `Retry-After` 헤더 우선 적용. P1-2b 검증 중 실제로 관측된 사례(`DELETE`가 한 번 500을 반환했다 재시도로 성공)가 이 항목의 필요성을 뒷받침했다. 산출물: `docs/superpowers/tasks/P1-3-confluence-retry-backoff/{task,plan,result,test}.md`, src/lib/confluence/client.ts
- [x] (완료, P1-4a) 구조화 로깅을 도입한다 — [Issue #4](https://github.com/sfood-pioneer-1st/sfood-it-editor/issues/4)에서 "Slack만 유지, 별도 도구 도입 안 함"으로 결정. `src/lib/logger.ts`에 `logger.info/warn/error`를 추가해 JSON 한 줄(`{level, message, timestamp, context?}`)로 남기고, 기존 산발적인 `console.error` 4곳(`api-response.ts` 2곳, `documents.ts`, `tag-suggestions.ts`)을 교체했다(pageId/email 등 맥락 포함). `serializeError`로 `Error`의 message/stack/커스텀 속성(`ConfluenceApiError.status` 등)까지 온전히 직렬화한다 — 그 과정에서 `toErrorResponse`가 기존엔 `error.message`만 로그에 남기던 정보 손실도 함께 고쳤다. Slack 알림 로직 자체는 바꾸지 않았다. 산출물: `docs/superpowers/tasks/P1-4a-structured-logging/{task,plan,result,test}.md`, src/lib/logger.ts, src/lib/logger.test.ts, src/lib/api-response.ts, src/lib/editor/documents.ts, src/lib/editor/tag-suggestions.ts
- [x] (완료, P1-4b) Slack 웹훅 전송 자체가 실패할 때의 재시도/폴백을 추가한다 — `sendSlackAlert`에 P1-3(`confluenceRequest`)와 같은 정책(최대 3회 지수 백오프+jitter, 429의 `Retry-After` 우선, 429/5xx가 아닌 4xx는 즉시 실패)을 적용했다. Confluence와 달리 GET/POST 구분 없이 재시도한다 — 중복 알림 정도의 부작용이라 데이터 유실 위험이 없다고 판단했다. 재시도 소진 시 예외를 던지는 기존 동작은 유지해, 호출부(`notifyUpstreamFailure`)의 "실패하면 구조화 로그만 남기고 넘어간다"는 기존 폴백을 그대로 활용한다. 산출물: `docs/superpowers/tasks/P1-4b-slack-webhook-retry/{task,plan,result,test}.md`, src/lib/notifications/slack.ts, src/lib/notifications/slack.test.ts
- [x] (완료, P1-5) 민감 API 엔드포인트(문서 생성, 이미지 업로드, 게시)에 레이트리밋을 추가한다 — [Issue #5](https://github.com/sfood-pioneer-1st/sfood-it-editor/issues/5)에서 방식(단일 인메모리, 외부 스토어 없음)을 확정했고, 임계값(사용자당 분당 30회)은 2026-09-03 대화로 확정했다. 고정 윈도우 레이트리밋 유틸리티(`src/lib/rate-limit.ts`)를 세션 확인 직후·실제 도메인 작업 전에 검사하도록 세 라우트(문서 생성/이미지 업로드/게시)에 붙였다. 초과 시 429 + `Retry-After` 헤더를 반환한다. 다중 인스턴스 배포 시 인스턴스별 카운터 분리 한계는 Issue #5에서 이미 받아들인 것이라 그대로 둔다. 산출물: `docs/superpowers/tasks/P1-5-rate-limiting/{task,plan,result,test}.md`, src/lib/rate-limit.ts, src/lib/editor/errors.ts, src/lib/api-response.ts, src/app/api/editor/documents/route.ts, src/app/api/editor/documents/[pageId]/images/route.ts, src/app/api/editor/documents/[pageId]/publish/route.ts
- [x] (완료, P1-6a) 문서 제목 길이 상한을 서버에서 검증한다 — 200자 초과 시 `ValidationError`(400). P0-7 이후 Confluence page의 실제 title이 내부 고유키(UUID)로 바뀌어 이 상한은 더 이상 Confluence의 title 길이 제약을 피하기 위한 값이 아니라(사용자 제목은 `sourceDocument` property에 저장), 순수 UX 가드레일이라 GitHub Issue 없이 값을 직접 정했다. 산출물: `docs/superpowers/tasks/P1-6a-document-title-length-limit/{task,plan,result,test}.md`, src/lib/editor/documents.ts
- [x] (완료, P1-6b) 태그 형식·길이·개수 상한을 서버에서 검증한다 — 개수 20개, 길이 50자 상한(P1-6a와 같은 근거로 GitHub Issue 없이 직접 정함), 금지 문자(`:`, `?`, `@`, [Confluence 공식 문서](https://support.atlassian.com/confluence-cloud/docs/use-labels-to-organize-your-content/)로 확인)는 사전 차단하고, 그 외 Confluence의 400 거부는 `ValidationError`로 변환한다. 함께 `TagInput.tsx` 디자인을 다듬었다(placeholder를 "예: React, Backend"로, 입력 영역을 테두리+배경으로 강조 — 사용자 요청). 산출물: `docs/superpowers/tasks/P1-6b-tag-format-length-count-limit/{task,plan,result,test}.md`, src/lib/editor/tags.ts, src/components/editor/TagInput.tsx
- [x] (완료, P1-6c) slug 형식(허용 문자)을 서버에서 검증한다 — `publish.ts`의 `validateAndComposeViewers`에 표준 kebab-case 규칙(소문자 영숫자와 하이픈만, 하이픈으로 시작/끝·연속 불가)을 추가했다. slug는 그대로 `publicSlug`(P0-5b)로 조합돼 뷰어 공개 URL의 경로 세그먼트가 되므로 서비스 정책이 아닌 URL 라우팅 안전성 문제로 판단해 GitHub Issue 없이 직접 정했다(P0-4b/P1-6a/P1-6b와 같은 근거). P1-11에서 실제 인스턴스에 발견된 `"/root"`(슬래시 포함) 사례를 회귀 테스트로 그대로 재현해 이제는 거부됨을 확인했다. slug 최대 길이 상한과 클라이언트 사전 안내는 범위 밖으로 남겼다. 산출물: `docs/superpowers/tasks/P1-6c-slug-format-validation/{task,plan,result,test}.md`, src/lib/editor/publish.ts
- [x] (완료, P1-7a) 표에 행/열 추가·삭제 컨트롤을 추가한다 — `RichTextEditor.tsx`의 `TableControls`에 TipTap `@tiptap/extension-table`이 이미 제공하는 표준 커맨드(`addRowBefore`/`addRowAfter`/`deleteRow`/`addColumnBefore`/`addColumnAfter`/`deleteColumn`)를 그대로 노출하는 버튼 6개를 추가했다. "표가 문서 첫 노드일 때 기본 선택이 첫 셀 안으로 들어간다"는 사실을 실측해 별도 클릭 시뮬레이션 없이 실제 TipTap 렌더링으로 행/열 개수 변화까지 검증하는 테스트를 추가했다 — 이 과정에서 prosemirror-tables의 `can()`이 "마지막 한 행/열 삭제" 경계를 검사하지 않는 라이브러리 자체의 한계를 소스 코드로 확인해(그 경계에서 버튼은 계속 활성 상태이지만 클릭해도 안전하게 무시됨) 그대로 문서화했다. **실사용 확인 2차례를 거쳐 UI가 두 번 더 바뀌었다**: 1차는 정적 블록이던 컨트롤이 표가 문서 중간·아래에 있으면 스크롤 밖으로 벗어나 안 보인다는 보고로 `BubbleMenu`(캐럿을 따라다니는 플로팅 UI)로 전환했고, 2차는 "텍스트 버튼이라 가로 폭이 크고 클릭할 때마다 캐럿 옆에 튀어나와 불편하다, Confluence처럼 아이콘 기반으로 상단에 고정했으면 좋겠다, 디자인 품질이 낮다"는 보고로 `DocumentEditor.tsx`의 기존 `sticky top-0` 헤더 선례를 재사용해 헤더 바로 아래 고정된 아이콘 툴바(+`Tooltip`)로 재설계했다(`@sfood/ui`의 `Icon`이 `search`/`comment`만 제공해 대응 요소가 없어, `Icon`과 동일한 스타일로 직접 그린 SVG 사용). 이 과정에서 `editor.isActive`/`can()`을 렌더 시점에 그냥 읽으면 순수 커서 이동(내용 변경 없는 선택 전환)에는 리렌더가 안 될 수 있는 잠재 버그를 발견해 `useEditorState`로 옮겨 함께 고쳤다. **3차**는 "sticky 상단 고정이 문서 헤더 기준이라 표가 스크롤로 멀어지면 툴바와 표가 시각적으로 분리된다"는 지적으로, "표 자체의 상단에" 고정하도록 다시 바꿨다 — TipTap의 `Table` 확장이 `resizable: false`일 때 실제로 쓰는 `TableView` 클래스를 `StickyTableView`로 상속해 `.tableWrapper`의 `<table>` 앞에 툴바 슬롯을 끼워 넣고, TipTap이 NodeView 밖에서 React UI를 마운트할 때 공식 제공하는 `ReactRenderer`로 기존 `TableToolbar`를 그대로 마운트했다(표 편집의 핵심 DOM 구조·`ignoreMutation`은 상속으로 그대로 재사용해 재구현 위험을 피함). "커서가 이 표 안에 있는가"는 `editor.isActive("table")` 대신 선택 범위가 이 표 노드의 `[pos, pos+nodeSize)` 안에 있는지로 직접 계산해, 문서에 표가 여러 개일 때도 커서가 있는 표에만 툴바가 뜨도록 했다(이 다중 표 시나리오를 신규 테스트로 고정). 표 컬럼 리사이즈(P1-7b), 표 삭제·헤더 토글은 범위 밖. AX Auth 로그인 제약으로 이 세션에서 직접 로그인해 확인하지는 못했지만, dev 서버 로그로 사용자가 실제 계정으로 문서를 열고 저장까지 완료했고 관련 서버 에러가 없음을 확인했다 — 실제 화면에서 "표에만 고정되는지" 육안 재확인은 여전히 요청 중. 산출물: `docs/superpowers/tasks/P1-7a-table-row-column-controls/{task,plan,result,test}.md`, src/components/editor/RichTextEditor.tsx
- [x] (완료, P1-7b) 표 컬럼 리사이즈를 활성화한다 — `TableWithToolbar.configure({ resizable: true })`로 TipTap `@tiptap/extension-table`(prosemirror-tables 기반)의 컬럼 리사이즈를 켰다. `resizable: true`가 되면 `@tiptap/extension-table`의 `addNodeView()`가 스스로 `null`을 반환하고 대신 prosemirror-tables의 `columnResizing` 플러그인이 자신의 `nodeViews` 등록으로 표 View를 만든다는 것을 소스로 확인했다 — 그 등록부는 View 생성자에 `(node, cellMinWidth, view)` 세 인자만 넘겨, P1-7a의 `StickyTableView`가 의존하던 네 번째 인자 `getPos`를 받을 수 없는 충돌이 있었다. `StickyTableView`를 `createStickyTableView(editor)` 팩토리 함수로 바꿔 `editor`를 클로저로 캡처하고, "커서가 이 표 안에 있는가" 판단을 `getPos` 기반 범위 비교에서 `findParentNodeClosestToPos`(`@tiptap/extension-table`이 `deleteRow`/`deleteColumn`에서 이미 쓰는 유틸) + 노드 참조 비교로 바꿔 리사이즈 켜짐/꺼짐 두 경로 모두에서 동일하게 동작하게 했다. prosemirror-tables가 CSS를 전혀 제공하지 않아(소스 확인) `globals.css`에 리사이즈 손잡이·드래그 커서·표 가로 스크롤 CSS를 추가했다(TipTap 공식 문서 권장 CSS를 이 프로젝트 토큰으로 이식). 리팩터링 과정에서 기존 P1-7a 테스트 9건 중 8건이 일시적으로 실패했는데, 디버그 로그로 직접 관측해 "로직은 이미 올바르다 — 초기 마운트 시 TipTap이 표 NodeView를 한 번 더 재구성하며 생기는 순수 렌더링 타이밍 차이"임을 확인하고 테스트를 `findByLabelText`/`waitFor` 기반으로 조정했다(프로덕션 코드는 수정 없음 — 사용자가 상호작용할 수 있기 전, 최초 마운트 시 한 번만 발생해 체감 영향이 없다고 판단). 공개 뷰어(Tech Blog)에는 리사이즈된 컬럼 너비가 반영 안 될 수 있음을 확인했다(`tiptap-to-storage.ts`가 `colwidth`를 직렬화하지 않음) — 다만 에디터 자체의 저장·재로드는 원본 TipTap JSON(`sourceDocument.doc`)을 그대로 쓰므로 영향 없음을 코드로 확인, 뷰어는 별도 저장소라 범위 밖으로 문서화만 했다. 실제 드래그 리사이즈 상호작용은 happy-dom의 레이아웃 한계와 AX Auth 로그인 제약으로 이 세션에서 직접 확인하지 못했다. 산출물: `docs/superpowers/tasks/P1-7b-table-column-resize/{task,plan,result,test}.md`, src/components/editor/RichTextEditor.tsx, src/app/globals.css
- [x] (완료, P1-7c) 코드블록에 문법 강조를 추가한다 — `@tiptap/extension-code-block-lowlight` + `lowlight`(공식 `common` 언어 번들 — JS/TS/Python/Java/Go/Rust/SQL 등)로 강조를 추가했다. `language` 속성을 지정하지 않아도 `lowlight.highlightAuto()`로 자동 추정 폴백된다는 것을 소스로 확인해, 언어 선택 UI 없이도 동작하게 했다(범위 밖으로 명시). 강조 색상은 기성 테마의 하드코딩 hex 대신 이 프로젝트의 기존 시맨틱 토큰(`--color-brand`=키워드, `--color-success`=문자열, `--color-warning`=숫자, `--color-info`=타입/이름, `--color-muted`=주석 등)에 매핑해 다크 모드 전환을 자동으로 따르게 했다. 설치 전 `npm view`로 버전별 peerDependencies를 확인해, 최신 버전(3.31.0)이 요구하는 `@tiptap/core@3.31.0`이 이 프로젝트의 다른 `@tiptap/*` 패키지(전부 3.30.2)와 어긋난다는 걸 미리 발견하고 `3.30.2`로 맞춰 설치했다. 언어 선택 UI, 공개 뷰어·Confluence storage 포맷에의 강조 정보 반영은 범위 밖. AX Auth 로그인 제약으로 실제 화면에서의 시각적 확인(색상 대비 등)은 하지 못했다. 산출물: `docs/superpowers/tasks/P1-7c-codeblock-syntax-highlighting/{task,plan,result,test}.md`, src/components/editor/RichTextEditor.tsx, src/app/globals.css, package.json
- [x] (완료, P1-7d) Word/Google Docs 붙여넣기 서식을 정제하는 로직을 추가한다 — 단순 HTML 클린업이 아니라 실제 버그였다: `@tiptap/extension-text-style`의 `TextStyle`/`Color`가 `style` 속성이 있는 아무 `<span>`이든 매치해 그 안의 `color`를 그대로 마크로 만든다는 것을 소스로 확인했는데, Word·Google Docs는 텍스트 조각마다 `<span style="color:...">`를 내보내므로 붙여넣기가 "글자색은 정해진 스와치로만"이라는 기존 결정(2026-08-26)을 조용히 우회하고 있었다. `RichTextEditor.tsx`에 `stripPastedInlineStyles`를 추가해 `editorProps.transformPastedHTML`로 외부에서 붙여넣은 HTML의 인라인 `style` 속성을 전부 제거한다 — 출처(Word/Google Docs/기타 웹사이트)를 구분하지 않고 일괄 적용한다(스키마가 애초에 임의 인라인 스타일을 지원하지 않으므로 출처 무관 같은 해법). 같은 세션 내부 복사-붙여넣기는 ProseMirror가 클립보드 HTML을 재파싱하지 않는 내부 최적화 경로를 타 영향받지 않는다. Word의 사이비 리스트(`mso-list`)를 진짜 리스트로 재구성하는 것, 링크 스킴 검증(이미 `@tiptap/extension-link`가 자체 처리)은 범위 밖. AX Auth 로그인 제약으로 실제 Word/Google Docs 문서를 붙여넣는 엔드투엔드 확인은 하지 못했다. **실사용 확인 중 이 항목과 무관한 기존 버그(새 문서 생성 직후 태그 저장 404) 를 발견해 같은 PR에 함께 고쳤다** — Confluence 라벨 조회가 방금 생성된 페이지를 아직 인식하지 못하는 것으로 보여, `DocumentEditor.tsx`의 `saveTags`에 새 문서 생성 직후에 한해서만(기존 문서 수정 시 404는 그대로 즉시 실패) 짧은 재시도를 추가했다. 붙여넣은 이미지가 화면에 안 보이는 문제도 실제 파이프라인으로 재현해 원인(Word는 로컬 파일 경로, Google Docs는 접근이 막힐 수 있는 외부 URL을 참조해 로드 자체가 안 됨)을 확인했지만, 진짜 해법(클립보드의 이미지 파일을 재업로드)은 범위가 훨씬 커 이번엔 원인 확인까지만 하고 수정은 사용자 확인 후 별도로 진행한다. 산출물: `docs/superpowers/tasks/P1-7d-paste-cleanup/{task,plan,result,test}.md`, src/components/editor/RichTextEditor.tsx, src/components/editor/DocumentEditor.tsx
- [x] (완료, P1-8) 삽입된 이미지에 대체 텍스트(alt)를 입력할 수 있는 UI를 추가한다 — 이미지를 클릭(NodeSelection)하면 뜨는 전용 버블 메뉴에 alt 입력창을 두고, `updateAttributes`로 노드 속성에 반영한다. 텍스트 서식 버블 메뉴(`EditorBubbleMenu`)와 겹치지 않도록 `useEditorState`로 이미지 선택 여부를 구독해 두 메뉴를 상호 배타적으로 마운트했다(`shouldShow`를 직접 오버라이드하면 링크 팝오버가 의존하던 포커스 유지 로직까지 깨져 그 방식은 피함). Confluence storage format 변환(`ac:image`)에도 `ac:alt` 속성을 추가했다(Atlassian 공식 문서로 속성명 확인). AX Auth 로그인 제약으로 실제 화면 클릭 확인은 못했지만, 자동화 테스트로 NodeSelection 발생 시 UI 노출·DOM `<img alt>` 반영·직렬화 결과를 모두 검증했다. 산출물: `docs/superpowers/tasks/P1-8-image-alt-text/{task,plan,result,test}.md`, src/components/editor/RichTextEditor.tsx, src/components/editor/RichTextEditor.test.tsx, src/lib/editor/tiptap-to-storage.ts, src/lib/editor/tiptap-to-storage.test.ts
- [x] (완료, P1-9a) `documents/route.ts`(목록 조회·생성) 테스트를 추가한다 — `[pageId]/versions/route.test.ts`가 세운 관례(인증·도메인 함수를 `vi.mock`으로 모듈째 대체, `Request` 직접 생성)를 그대로 따라 `GET`/`POST` 7건을 추가했다. 산출물: `docs/superpowers/tasks/P1-9a-documents-route-test/{task,plan,result,test}.md`, src/app/api/editor/documents/route.test.ts
- [x] (완료, P1-9b) `documents/[pageId]/route.ts`(수정·삭제) 테스트를 추가한다 — P1-9a와 동일한 관례(인증·도메인 함수를 `vi.mock`)를 따라 `PUT`/`DELETE` 7건을 추가했다. 소유자 검증(`requireDocumentOwner`)·낙관적 동시성(`ConflictError`→409)·라우트 자신이 직접 던지는 `version` 검증을 모두 확인했다. 산출물: `docs/superpowers/tasks/P1-9b-document-detail-route-test/{task,plan,result,test}.md`, src/app/api/editor/documents/[pageId]/route.test.ts
- [x] (완료, P1-9c) `documents/[pageId]/images/route.ts` 테스트를 추가한다 — P1-9a/b와 동일한 관례를 따르되, 라우트 자신이 갖고 있는 유일한 로직(`file instanceof File ? file : null` 변환)까지 직접 검증했다. Node 전역 `FormData`/`File`을 그대로 사용했다. 산출물: `docs/superpowers/tasks/P1-9c-images-route-test/{task,plan,result,test}.md`, src/app/api/editor/documents/[pageId]/images/route.test.ts
- [x] (완료, P1-9d) `folder/route.ts` 테스트를 추가한다 — P1-9a~c와 동일한 관례를 따라 `GET`/`POST` 6건을 추가했다. 산출물: `docs/superpowers/tasks/P1-9d-folder-route-test/{task,plan,result,test}.md`, src/app/api/editor/folder/route.test.ts
- [x] (완료, P1-9e) `RichTextEditor.tsx` 테스트를 추가한다 — 텍스트 선택 기반 UI(서식 버블 메뉴)를 처음으로 검증 가능하게 만든 `selectText` 헬퍼(Range + `selectionchange` 이벤트 디스패치)를 확립하고, 굵게/기울임/취소선/글자색/하이라이트/링크 9건 + 기본 렌더링 1건 + 이미지 삽입 실제 결과 1건(기존 P0-4b 공백 보완)을 추가했다. happy-dom 고유 함정 두 가지(`javascript:` URL 제약 검증 과잉 차단, `color-mix()` CSS 미지원)를 소스로 원인까지 확인해 우회했다. 산출물: `docs/superpowers/tasks/P1-9e-richtexteditor-test/{task,plan,result,test}.md`, src/components/editor/RichTextEditor.test.tsx
- [x] (완료, P1-9f) `SlashCommandExtension.ts` 테스트를 추가한다 — P1-9 시리즈 마지막 항목. `createSlashItems` 필터링 4건, 9개 기본 항목의 커맨드 체인 검증 9건(패널 3종의 `panelType` 혼동 방지 포함), `createSlashMenuRenderer` 동작 7건(렌더링·빈 목록·키보드 순환·클릭·unmount) 총 20건을 추가했다. 산출물: `docs/superpowers/tasks/P1-9f-slashcommand-test/{task,plan,result,test}.md`, src/components/editor/SlashCommandExtension.test.ts

- [x] (완료, P1-10) 삭제된 문서 복구(P1-2b) 후 문서가 계정 폴더의 "초안"이 아니라 **Space 홈페이지 바로 아래(최상위)**로 옮겨지는 사례가 실제 인스턴스에서 발견됐다 — 2026-08-28, P0-5b/P0-7 작업 중 실제 계정 폴더를 조회하다가 우연히 발견. 증거: pageId `212959235`("CODEX 명령어 요약1")가 `authorMeta`/`sourceDocument`/`publishMetadata`(실제 이 앱이 쓰는 property 전부)를 갖고 있어 이 앱에서 만든 진짜 문서임이 확인되는데, 당시 `parentId`가 계정 폴더가 아니라 Space 홈페이지(`204341502`)이고 제한은 작성자 1인 전용(초안과 동일한 패턴)이었다. **2026-08-28 갱신(P0-8)**: "초안"/"게시" 서브폴더 구분 자체가 없어져 `restoreDocument`가 이제 계정 폴더 하나로만 이동하므로, "어느 서브폴더로 이동할지 잘못 고르는" 경로는 더 이상 존재하지 않는다. **2026-09-03 갱신**: 이 리팩터로 재현 경로가 사라졌다는 것을 코드로 재확인했다 — 현재 `restoreDocument`는 `findPersonalFolder`/`createPersonalFolder`가 돌려주는 `accountFolderId`(항상 실제 계정 폴더 페이지의 id)로만 이동시켜, `space.homepageId`가 흘러들 수 있는 경로가 구조적으로 없다. P0-8 이전 커밋(`469c3bb^1`)의 구현도 직접 확인했지만 원래 버그의 정확한 트리거는 그 코드에서도 특정하지 못했다(추측으로 메우지 않고 "특정 실패"로 남김). 기존 회귀 테스트(`deleted-documents.test.ts`)가 이미 이 케이스를 구조적으로 막고 있음을 확인해 그 의도를 주석으로 명시했다. **이어서 실제 Confluence 인스턴스 API로 pageId `212959235`를 직접 재조회해 확인한 결과, 이 문서는 이미 계정 폴더(`206143496`, 제목 `donghyun.lee@s-food.com`) 밑에 정상적으로 들어가 있었다** — Space 홈페이지가 아니다. 언제·어떻게 옮겨졌는지는 로그로 소급 확인하지 않았지만(범위 밖), 현재 실데이터 기준으로 이 항목이 가리키던 위치 문제는 더 이상 존재하지 않는다 — 별도 수동 정리 불필요. 산출물: `docs/superpowers/tasks/P1-10-restore-destination-audit/{task,plan,result,test}.md`, src/lib/editor/deleted-documents.test.ts
- [ ] (P1-11) 게시 설정에 `slug: "/root"`처럼 슬래시가 포함된 값이 실제로 저장된 사례가 발견됐다(위 P1-10과 같은 문서, pageId `212959235`) — 현재 slug 검증(`publish.ts`의 `validateAndComposeViewers`)은 빈 값만 걸러내고 형식은 검증하지 않는다. P1-6c(slug 형식 검증)의 실제 필요성을 뒷받침하는 사례로 남긴다. **2026-09-03 갱신**: 코드 측면은 이미 P1-6c(2026-08-31)로 완전히 해소됐음을 재확인했다 — `SLUG_PATTERN`이 `"/root"`류 슬래시 포함 값을 거부하고, `publish.test.ts`에 이 사례가 회귀 테스트로 명시돼 있다(18/18 통과). **실제 Confluence 인스턴스 API로 pageId `212959235`의 `publishMetadata` property를 직접 조회해 재확인한 결과, 지금도 `slug: "/root"`, `publicSlug: "/root-51cda131-6bd4-449f-ace4-a73dc45f27ce"`, `isPublished: true`로 남아있다** — P1-10과 달리 이 문제는 실데이터에 여전히 살아있다(코드가 앞으로의 신규 입력만 막을 뿐, 검증 이전에 이미 저장된 값을 소급해서 고쳐주지는 않으므로 당연한 결과). 산출물: `docs/superpowers/tasks/P1-11-slug-validation-audit/{task,plan,result,test}.md`. **남은 작업**: 이 문서의 실제 `slug` 값을 정정(또는 게시 취소)하는 것은 실제 Confluence 인스턴스 쓰기 작업이 필요해 사용자 승인 후 별도로 진행한다 — 승인 전까지 이 항목은 완료로 표시하지 않는다.

**P2 — 다듬기**
- [ ] (P2-1a) 슬래시 메뉴에 `role`/`aria-selected` 등 ARIA를 보강한다.
- [ ] (P2-1b) 사이드바 리사이즈 핸들에 키보드 조작(방향키)을 추가한다.
- [ ] (P2-1c) 모바일 오프캔버스 드로어에 포커스 트랩을 추가한다.
- [ ] (P2-2) 문서-코드 드리프트 잔여 항목 정리 — 이번 갱신으로 prd.md의 게시 설정 라우트 서술은 반영됨. `EditorSidebar.tsx`의 `extractPageIdFromPathname`이 여전히 다루는 존재하지 않는 `/editor/{pageId}/publish` 경로 처리와 design.md 쪽 서술까지 확인·정리한다.
- [x] (완료, P2-3) 비밀값을 AWS Secrets Manager 또는 SSM Parameter Store로 옮긴다 — [Issue #6](https://github.com/sfood-pioneer-1st/sfood-it-editor/issues/6)에서 2026-08-30 "1차 개발은 Lambda와 Lambda의 Secret value 설정으로 진행"으로 결정돼, 원래 항목이 전제한 "별도 시크릿 매니저로 이전"은 하지 않는 것으로 확정됐다. 배포 서비스도 AWS Lambda로 확정됐다. 현재 코드(`src/lib/env.ts`의 `requireEnv`)는 `process.env`만 읽으므로 Lambda 환경변수와 코드 변경 없이 그대로 호환됨을 확인했다 — 코드 변경 없음, `architecture.md`에 결정 반영. Next.js를 Lambda에 올리는 구체적인 어댑터·빌드 구성·도메인/HTTPS는 이 결정과 별개로 실제 배포 착수 시점에 따로 정한다(범위 밖). 산출물: `docs/superpowers/tasks/P2-3-lambda-secrets/{task,plan,result,test}.md`, docs/product/architecture.md

## 🗄️ 데이터 저장 여부
- 있음 — 상세 설계는 [data-spec.md](./data-spec.md) 참고 (Confluence content property·라벨 기반, 별도 DB 없음)

## 🔌 API 여부
- 필요 — 상세 명세는 [api-spec.md](./api-spec.md) 참고 (내부 Next.js API 라우트 + Confluence Cloud/AX Auth 외부 연동)
