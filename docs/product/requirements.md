# 📋 요구사항 명세서 — SFOOD IT Editor

## 🎯 서비스 개요
- 사내 직원이 개인 문서를 Markdown으로 작성해 Confluence에 보관하고, 원할 때 Tech Blog 등 외부 뷰어에 게시할 수 있게 하는 사내 전용 문서 작성·게시 도구다.
- 기존에는 sfood-it-tech-blog(Viewer, 게시된 글을 읽는 뷰어) 저장소에 작성 기능이 함께 있었으나, 작성/게시 책임을 이 프로젝트로 분리했다.
- 핵심 사용자는 사내 직원이며, 특히 Tech Blog에 글을 쓰는 필자다. 다만 Confluence Space 자체는 IT팀 외 직원도 접근할 수 있다는 전제를 둔다.
- 해결하려는 문제: 필자가 초안을 편하게 작성·보관하다가, 본인이 원하는 시점에만 선택적으로 외부에 공개(게시)할 수 있는 워크플로가 필요하다. 초안 상태에서는 작성자 본인 외 누구에게도 보이지 않아야 한다.

## ✅ 핵심 기능 목록
- AX Auth(사내 MS 계정)를 통한 로그인
- 개인 문서함 — 로그인한 사용자가 작성한 문서 목록 조회
- 문서 작성·수정·삭제 (Markdown 기반)
- 문서에 이미지 첨부
- 문서 태그 지정 (다중 태그, 자유 텍스트)
- 게시 설정 — 게시 여부, 공개 경로(slug), 메타 설명, 노출 대상 뷰어 지정
- 초안-게시 생명주기 — 초안은 작성자 외 다른 직원에게 숨겨지고, 게시하면 Confluence Space 구성원 누구나 조회 가능해짐
- (참고, 이 프로젝트 범위 밖) 게시된 문서에 대한 댓글 — 별도 Viewer 프로젝트가 자체 기능으로 제공. 이 프로젝트는 댓글이 Confluence에 저장되는 구조만 정의한다.

## 🗄️ 데이터 요구사항
자체 데이터베이스 없이 Confluence Cloud를 유일한 저장소로 사용한다.
- 문서 본문 원본(Markdown) — Confluence content property(`sourceMarkdown`). Confluence 페이지 본문(storage format)은 렌더링용 산출물이고, 편집 원본은 별도로 보관한다.
- 작성자 식별 — content property(`authorMeta.actualAuthorEmail`). 실제 Confluence 쓰기는 공용 서비스 계정으로 이루어지므로, 진짜 작성자는 이 property로만 구분한다.
- 게시 메타데이터 — content property(`publishMetadata`): 공개 여부, 게시 시각, 노출 대상 뷰어별 slug·메타 설명 (뷰어가 늘어나도 확장 가능한 구조).
- 태그 — Confluence 네이티브 페이지 라벨(label) 기능을 그대로 사용.
- 댓글 작성자 식별 — 댓글(footer comment) content에 딸린 content property(`commenterMeta`: email, name, isEmployee). 다른 프로젝트(Viewer)가 쓰고 읽는다.

## 🔗 외부 연동·알림 요구사항
- **Confluence Cloud REST API** — 서비스 계정(Basic Auth, API 토큰)으로 문서 저장소 역할을 한다.
- **AX Auth(사내 공통 인증 서비스)** — 로그인 시작 URL 제공, 로그인 토큰 검증(대행 SSO). 메일 발송 기능도 제공하나, 현재 실제로 호출되는 곳은 없고 향후(예: 댓글 알림) 사용을 염두에 두고 준비돼 있다.
- **Slack Incoming Webhook** — Confluence 연동 실패 등 운영 이상 감지 시 알림.

## 🗓️ 우선순위와 일정
- 1차: Confluence 콘텐츠 구조 확정 및 구현 — 초안/게시 생명주기, 숨김 메커니즘, 태그, 게시 메타데이터의 뷰어별 확장, 댓글 저장 구조.
- 2차: 개인 에디터 기능 강화 — 상세 요구사항은 1차 완료 후 별도로 논의.
- 목표 일정: 미정

## 📝 확인되지 않은 사항
- 전체 서비스의 목표 출시 일정
- 2차 서브 프로젝트(개인 에디터 기능 강화)의 상세 요구사항 — 다음 단계에서 별도로 다룰 예정
