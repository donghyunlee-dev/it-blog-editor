# P1-9b: `documents/[pageId]/route.ts` 테스트 — 구현 결과 보고서

## 구현 내용
- `src/app/api/editor/documents/[pageId]/route.test.ts`를 신규 작성했다. P1-9a와 동일한 관례(`@/lib/auth-guard`/`@/lib/editor/documents`를 `vi.mock`, `Request` 직접 생성)를 따라 `PUT`(수정) 4건, `DELETE`(삭제) 3건을 추가했다.
- `PUT`은 라우트 자신이 직접 검증하는 유일한 값인 `version`(숫자가 아니면 `ValidationError`)까지 포함해 검증했고, 그 외 소유자 검증(`requireDocumentOwner`)·낙관적 동시성(`ConflictError`→409)은 위임·status 매핑이 올바른지만 확인했다.

## 파일 변경 내역
| 파일 | 변경 사항 |
|------|---------|
| `src/app/api/editor/documents/[pageId]/route.test.ts` | 신규 — PUT/DELETE 라우트 테스트 7건 |
| `docs/product/prd.md` | P1-9b 체크리스트 완료 표시 |

## 커밋 내역
| SHA | 메시지 |
|-----|--------|
| (커밋 예정) | test: documents/[pageId]/route.ts PUT/DELETE 테스트 추가 (P1-9b) |

## 자체 검토 (Self-Review)
### 긍정 사항
- P1-9a와 동일한 패턴을 재사용해 일관성을 유지했다.
- `version` 검증처럼 라우트가 직접 던지는 유일한 분기를 놓치지 않고 짚었다(P0-3 낙관적 동시성 전제).

### 주의사항
없음.

### 우려사항
없음 — 순수 유닛 테스트 추가.
