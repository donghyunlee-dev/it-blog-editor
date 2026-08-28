# P0-4a: 이미지 업로드 최대 파일 크기를 제한한다 — 구현 결과 보고서

## 구현 내용
`src/lib/editor/images.ts`의 `registerImage`에 파일 크기 검사를 추가했다. 기존 파일 누락 검사·MIME 타입 검사 다음 순서로, `file.size`가 [Issue #2](https://github.com/sfood-pioneer-1st/sfood-it-editor/issues/2)에서 결정된 10MB(`10 * 1024 * 1024` 바이트)를 초과하면 `ValidationError`를 던지고 `uploadAttachment`(Confluence 첨부파일 API 호출)를 호출하지 않는다. 10MB 이하(경계값 포함)는 기존과 동일하게 통과한다.

라우트(`src/app/api/editor/documents/[pageId]/images/route.ts`)는 수정하지 않았다 — `toErrorResponse`가 이미 `ValidationError`를 400으로 매핑하므로 그대로 전달된다.

## 파일 변경 내역
| 파일 | 변경 사항 |
|------|---------|
| `src/lib/editor/images.ts` | `MAX_IMAGE_SIZE_BYTES` 상수 추가, `registerImage`에 크기 검사 추가 |
| `src/lib/editor/images.test.ts` | 신규 — 이 파일에 대한 첫 단위 테스트(5건: 파일 누락, 잘못된 MIME, 10MB 초과, 10MB 경계값, 일반 파일) |
| `docs/superpowers/tasks/_pending-decisions.md` | P0-4a 행 상태를 "반영됨"으로 갱신 |
| `docs/superpowers/tasks/P0-4a-image-upload-size-limit/{task,plan,result,test}.md` | 이 작업의 task/plan/result/test 4파일 신규 작성 |

Issue #2는 구현 완료 코멘트와 함께 닫았다.

## 커밋 내역
| SHA | 메시지 |
|-----|--------|
| `dec98bd` | fix: enforce 10MB max size on image uploads |

## 자체 검토 (Self-Review)
### 긍정 사항
- 값 결정(10MB)이 이미 Issue #2에 등록돼 있어 추측 없이 바로 착수할 수 있었다.
- 기존 MIME 타입 검사와 동일한 단일 검증 지점(`registerImage`) 패턴을 그대로 따라, 코드 구조에 새로운 갈래를 만들지 않았다.
- 그동안 테스트가 전혀 없던 `images.ts`에 처음으로 단위 테스트를 붙였다(P1-9 계열 항목이 다루는 라우트 테스트와는 별개로, 도메인 함수 자체의 커버리지 공백을 이번에 메웠다).

### 주의사항
- 클라이언트 쪽 사전 검사(업로드 전 파일 크기 안내)는 범위 밖으로 뒀다 — 사용자가 10MB를 초과하는 파일을 선택하면, 우리 서버까지 전송된 뒤에야(Confluence로는 전달되지 않음) 거부된다. 대용량 파일일수록 업로드 시작 후 실패까지의 대기 시간이 아깝다는 피드백이 나오면 클라이언트 사전 검사를 후속으로 추가할 수 있다.
- 실제 Confluence 인스턴스로 검증하지 않았다 — 이번 변경은 우리 자신의 검증 함수(`registerImage`) 안의 순수 크기 비교이고, `uploadAttachment`(Confluence 첨부파일 API 호출부)는 전혀 건드리지 않았다. Confluence 쪽 응답 형태·동작에 대한 새로운 가정이 없어 mock 기반 단위 테스트로 충분하다고 판단했다(`test.md` 참고).

### 우려사항
- 없음.
