# P2-3: AWS 배포 방식 및 시크릿 매니저 종류 결정 반영 — 구현 계획

## Global Constraints
- 코드 변경 없이 문서만 갱신한다 — 이번 결정은 "시크릿을 어떻게 관리할 것인가"에 대한 것이고, 현재 코드(`process.env` 기반 `requireEnv`)는 이미 Lambda 환경변수와 호환된다.

## Files
- Modify: `docs/product/architecture.md` — 배포 방식(Lambda 확정), 시크릿 관리 방식(Lambda Secret value 설정) 반영.
- Modify: `docs/superpowers/tasks/_pending-decisions.md` — P2-3 행을 "반영됨"으로 갱신.
- Create: `docs/superpowers/tasks/P2-3-lambda-secrets/{task,plan,result,test}.md`.

## Steps
- [x] **Step 1**: `src/lib/env.ts`/`src/lib/confluence/client.ts` 등 시크릿을 읽는 코드가 `process.env` 기반임을 재확인하고, Lambda 환경변수와의 호환성을 검증(코드 읽기로 확인, 별도 배포 테스트는 범위 밖).
- [x] **Step 2**: `.gitignore`의 `.env` 항목과 `.env.example` 존재를 확인.
- [x] **Step 3**: `architecture.md`의 "배포"(40번째 줄)를 "AWS Lambda로 배포한다"로, 시크릿 관리 서술(81번째 줄)을 "Lambda의 환경변수(Secret value) 설정을 그대로 쓴다(1차 개발 기준, 별도 시크릿 매니저 서비스 도입 안 함)"로 갱신.
- [x] **Step 4**: "배포 전략" 절의 3단계 항목을 이번 결정 반영 내용으로 갱신.
- [x] **Step 5**: `_pending-decisions.md`의 P2-3 행 갱신.
