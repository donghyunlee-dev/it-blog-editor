# P1-9a: `documents/route.ts` 테스트 — 구현 결과 보고서

## 구현 내용
- `src/app/api/editor/documents/route.test.ts`를 신규 작성했다. 이미 이 디렉터리 트리(`[pageId]/versions/route.test.ts` 등)가 세운 관례를 그대로 따라 `@/lib/auth-guard`/`@/lib/editor/folder`/`@/lib/editor/documents`를 `vi.mock`으로 모듈째 대체하고, `Request`를 직접 만들어 라우트 함수(`GET`/`POST`)를 호출한 뒤 응답 status·body와 모킹된 함수 호출 인자를 검증했다.
- `GET` 3건(폴더 없음 → 빈 목록/조회 생략, 폴더 있음 → `listDocuments` 위임, 세션 없음 → 401), `POST` 4건(폴더 없음 → 404, 정상 생성 → `createDocument` 파라미터 위임 + 201, title/doc 미지정 시 기본값 채움, `ValidationError` → 400)으로 라우트의 위임·status 매핑 책임만 검증하고 도메인 로직 자체(제목 검증 등)는 `documents.test.ts`의 책임으로 남겼다.

## 파일 변경 내역
| 파일 | 변경 사항 |
|------|---------|
| `src/app/api/editor/documents/route.test.ts` | 신규 — GET/POST 라우트 테스트 7건 |
| `docs/product/prd.md` | P1-9a 체크리스트 완료 표시 |

## 커밋 내역
| SHA | 메시지 |
|-----|--------|
| `0c74c09` | test: documents/route.ts GET/POST 테스트 추가 (P1-9a) |

## 자체 검토 (Self-Review)
### 긍정 사항
- 기존 관례(`versions/route.test.ts`)를 그대로 재사용해 새로운 테스트 패턴을 만들지 않았다.
- 라우트의 책임(세션 확인 → 폴더 조회 → 도메인 함수 위임 → status 매핑)과 도메인 로직 검증 책임을 명확히 분리했다.

### 주의사항
- 없음.

### 우려사항
- 없음 — 순수 유닛 테스트 추가라 런타임 동작 변경이 전혀 없다.
