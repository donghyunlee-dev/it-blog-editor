# P2-3: AWS 배포 방식 및 시크릿 매니저 종류 결정 반영 — 구현 결과 보고서

## 구현 내용
- 코드 변경 없음 — [Issue #6](https://github.com/sfood-pioneer-1st/sfood-it-editor/issues/6)의 결정("1차 개발은 Lambda와 Lambda의 Secret value 설정으로 진행")이 실제로는 코드에 영향이 없다는 것을 확인하는 것 자체가 이번 작업의 핵심이다: `src/lib/env.ts`의 `requireEnv`는 `process.env[name]`만 읽고, `src/lib/confluence/client.ts`/`src/lib/ax-auth/client.ts`가 이를 통해 시크릿을 가져온다 — Lambda의 환경변수(Secret value)든 로컬 `.env`든 애플리케이션 코드 입장에서는 똑같이 `process.env`로 노출되므로 코드를 바꿀 이유가 없다.
- `.gitignore`에 `.env`/`.env*.local`이 이미 등록돼 있고 `.env.example`도 존재함을 확인해, "시크릿을 저장소에 커밋하지 않는다"는 기존 전제가 Lambda 환경에서도 그대로 유효함을 재확인했다.
- `docs/product/architecture.md`의 세 곳을 갱신했다: (1) "배포" 항목을 "컨테이너 또는 서버리스 중 하나"에서 "AWS Lambda"로 확정, (2) 시크릿 관리 서술을 "시크릿 매니저 사용 권장"에서 "Lambda 환경변수 사용, 별도 시크릿 매니저 미도입"으로 갱신, (3) "배포 전략"의 3단계 항목에 이 결정이 이미 내려졌음을 반영.
- `docs/superpowers/tasks/_pending-decisions.md`의 P2-3 행을 "반영됨"으로 갱신했다.

## 파일 변경 내역
| 파일 | 변경 사항 |
|------|---------|
| `docs/product/architecture.md` | 배포 방식(Lambda 확정), 시크릿 관리 방식(Lambda Secret value) 반영 3곳 |
| `docs/superpowers/tasks/_pending-decisions.md` | P2-3 "반영됨"으로 갱신 |
| `docs/product/prd.md` | P2-3 체크리스트 완료 표시 |

## 커밋 내역
| SHA | 메시지 |
|-----|--------|
| `23f5fb8` | docs: AWS 배포·시크릿 관리 결정(Lambda) 반영 (P2-3) |

## 자체 검토 (Self-Review)
### 긍정 사항
- "시크릿 매니저로 옮긴다"는 원래 PRD 문구를 그대로 밀어붙이지 않고, 실제 결정("옮기지 않는다, Lambda 환경변수를 쓴다")에 맞춰 항목의 의미 자체를 갱신했다 — 결정이 원래 전제를 뒤집었을 때 문서를 있는 그대로 정직하게 반영한 것이다.
- 코드 변경이 필요 없다는 결론을 추측이 아니라 `src/lib/env.ts`/`confluence/client.ts`/`ax-auth/client.ts`를 직접 읽어 확인했다.

### 주의사항
- Next.js를 실제로 Lambda에 올리는 구체적인 방법(OpenNext 등 어댑터, 빌드 출력 모드, IaC)은 이번 결정과 별개의 문제로 의도적으로 범위 밖에 뒀다 — 실제 배포 착수 시점에 별도로 결정해야 한다.

### 우려사항
없음 — 문서 갱신뿐이며 런타임 동작은 전혀 바뀌지 않았다.
