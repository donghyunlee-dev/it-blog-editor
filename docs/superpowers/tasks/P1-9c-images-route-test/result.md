# P1-9c: `documents/[pageId]/images/route.ts` 테스트 — 구현 결과 보고서

## 구현 내용
- `src/app/api/editor/documents/[pageId]/images/route.test.ts`를 신규 작성했다. P1-9a/P1-9b와 동일한 관례를 따랐고, Node 전역 `FormData`/`File`을 그대로 사용해 실제 멀티파트 업로드 요청과 동일한 형태로 `POST` 요청을 구성했다.
- 4건: 정상 업로드(위임 파라미터 확인 + 201), 소유자 아님(401), `file` 필드 누락 시 라우트 자신의 `instanceof File ? file : null` 변환 로직이 `registerImage(pageId, null)`로 정확히 호출되는지, `registerImage`의 `ValidationError`가 400으로 매핑되는지.

## 파일 변경 내역
| 파일 | 변경 사항 |
|------|---------|
| `src/app/api/editor/documents/[pageId]/images/route.test.ts` | 신규 — POST 라우트 테스트 4건 |
| `docs/product/prd.md` | P1-9c 체크리스트 완료 표시 |

## 커밋 내역
| SHA | 메시지 |
|-----|--------|
| `6373191` | test: documents/[pageId]/images/route.ts 테스트 추가 (P1-9c) |

## 자체 검토 (Self-Review)
### 긍정 사항
- 라우트 자신이 갖고 있는 유일한 로직(`instanceof File` 변환)을 놓치지 않고 직접 검증했다.
- Node 전역 `FormData`/`File`을 그대로 써서 실제 요청 형태와 가까운 테스트를 만들었다(별도 모킹 불필요).

### 주의사항
없음.

### 우려사항
없음 — 순수 유닛 테스트 추가.
