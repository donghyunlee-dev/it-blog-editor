# P2-3: AWS 배포 방식 및 시크릿 매니저 종류 결정 반영

## 배경
- `docs/product/architecture.md`는 애초에 AWS 배포를 "컨테이너 또는 서버리스 중 하나"라고만 하고 특정 서비스를 확정하지 않았고, 시크릿은 평문 환경변수(`.env`)로만 관리하며 "AWS 배포 시 시크릿 매니저 사용을 권장"한다고만 적혀 있었다.
- [Issue #6](https://github.com/sfood-pioneer-1st/sfood-it-editor/issues/6)에서 2026-08-30 "1차 개발은 Lambda와 Lambda의 Secret value 설정으로 진행"으로 답변됐다 — AWS Secrets Manager/SSM Parameter Store 같은 별도 시크릿 매니저 서비스를 도입하지 않고, Lambda 함수 자체의 환경변수(시크릿) 설정 기능을 그대로 쓰겠다는 결정이다.

## 수용 기준 (Acceptance Criteria)
- [x] 현재 코드(`src/lib/env.ts`의 `requireEnv`, `process.env[name]` 직접 접근)가 이 결정과 호환되는지 확인한다 — Lambda의 환경변수는 애플리케이션 코드 입장에서 여전히 `process.env`로 노출되므로 코드 변경이 필요 없음을 확인한다.
- [x] `.env`가 `.gitignore`에 있고 `.env.example`이 실제 필요한 키 목록과 일치하는지 확인한다(시크릿이 저장소에 커밋되지 않는다는 기존 전제가 Lambda 환경에서도 그대로 유효한지).
- [x] `docs/product/architecture.md`의 "배포" 서술(40번째 줄)과 시크릿 관리 서술(81번째 줄), "배포 전략" 절을 이 결정으로 갱신한다.

## 결정이 필요한 사항
없음 — Issue #6로 이미 확정됐다.

## 범위 밖
- 실제 Next.js를 Lambda에 올리는 구체적인 방법(OpenNext/AWS Amplify Hosting/수동 Lambda+API Gateway 등 어댑터 선택), 빌드 출력 모드(`next.config.ts`의 `output` 설정 등), IaC(CDK/Terraform/SAM) 구성은 이번 결정(시크릿 관리 방식)과 별개의 문제라 다루지 않는다 — architecture.md의 기존 3단계 계획("이후 — 실제 AWS 배포 구성 확정")에 남겨진 대로, 실제 배포 착수 시점에 별도로 결정한다.
- 도메인·HTTPS 설정도 같은 이유로 범위 밖이다.
