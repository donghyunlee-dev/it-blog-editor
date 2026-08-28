# P0-7: Confluence 페이지 title 충돌로 인한 문서 생성 실패를 막는다 — 구현 결과 보고서

## 구현 내용
`src/lib/editor/documents.ts`에서 Confluence page의 실제 `title`과 사용자가 보는 "표시 제목"을 완전히 분리했다.

- `createDocument`: `randomUUID()`로 내부 고유키를 만들어 Confluence `createPage`의 `title`로 쓴다. 사용자가 입력한 실제 제목은 `sourceDocument` property에 `doc`과 함께 `{ title, doc }`로 저장한다.
- `updateDocument`: `updatePage` 호출 시 `title`을 항상 기존 값(`current.title`, 즉 내부 고유키)으로 다시 보낸다 — 절대 바뀌지 않는다. 사용자가 수정한 새 제목은 `sourceDocument`에만 반영한다.
- `getDocumentDetail`: `page.title` 대신 `sourceDocument.title`을 반환한다(없으면 빈 문자열).
- `listDocuments`: 문서마다 `getTags`와 함께 `sourceDocument` property를 병렬로 조회해 표시 제목을 얻는다(`sourceProperty?.value?.title ?? page.title` — 과거 방식으로 만들어진 문서를 위한 하위 호환 fallback 포함).
- `deleteDocument`: 삭제된 문서 레지스트리에 남기는 제목도 `sourceDocument.title`을 우선 쓴다(같은 fallback).

이 내부 고유키(Confluence page title)는 P0-5b(slug 구조 개선)에서도 그대로 재사용된다 — 자세한 내용은 [P0-5b-slug-structural-uniqueness/result.md](../P0-5b-slug-structural-uniqueness/result.md).

## 파일 변경 내역
| 파일 | 변경 사항 |
|------|---------|
| `src/lib/editor/documents.ts` | `randomUUID()` import, `createDocument`/`updateDocument`/`getDocumentDetail`/`listDocuments`/`deleteDocument`가 Confluence title과 표시 제목을 분리해서 다루도록 변경 |
| `src/lib/editor/documents.test.ts` | 기존 테스트를 새 동작에 맞게 갱신(UUID title 검증, sourceDocument title 저장/조회/fallback 검증). `listDocuments`에 하위 호환(fallback) 테스트, "요청 내 중복 조회 방지" 테스트에 `getPageProperty` 스텁 추가 신규 |
| `docs/product/data-spec.md` | Document 테이블의 `title`/`sourceDocument`/`publishMetadata` 설명 갱신, 마이그레이션 정책에 하위 호환 설명 추가 |
| `docs/product/api-spec.md` | 문서 생성/목록 조회 엔드포인트에 내부 구현 변경 설명 추가(요청/응답 스키마는 불변) |
| `docs/product/prd.md` | P0-7 신규 항목 추가 및 완료 표시, P1-10/P1-11(우연히 발견한 별개 버그) 백로그 추가 |

## 커밋 내역
| SHA | 메시지 |
|-----|--------|
| `d12fa92` | fix: prevent Confluence page title collisions and make slugs structurally unique (P0-5b와 같은 커밋) |

## 자체 검토 (Self-Review)
### 긍정 사항
- 실제 Confluence 인스턴스에서 핵심 가정(같은 제목 충돌 재현, UUID 제목은 충돌 없음)을 직접 검증했다(`test.md` 참고) — 추측이 아니라 실측으로 확인된 수정이다.
- API 계약(요청/응답 JSON 스키마)을 전혀 바꾸지 않아 클라이언트(DocumentEditor.tsx 등) 코드는 무수정으로 통과했다.
- 부수적으로 발견한 별개 버그(P1-10, 복원 시 계정 폴더 밖으로 이동)를 이번 작업에 끼워 넣지 않고 PRD에 별도로 분리해뒀다 — 원인이 다른 문제를 한 커밋에 섞지 않는다는 원칙을 지켰다.

### 주의사항
- `listDocuments`가 문서마다 `sourceDocument` property를 추가로 읽어 계정 하나 안에서의 조회 비용이 늘었다(태그 조회와 마찬가지로 N+1). 계정별 문서 수가 매우 커지면 재검토가 필요할 수 있다 — 다만 이건 Space 전체 스캔이었던 P0-5b의 문제와는 성격이 다르다.
- `sourceDocument.title`이 없는 레거시 문서는 fallback으로 Confluence page title을 그대로 보여준다. 이 프로젝트는 실사용 데이터가 사실상 없다고 판단해 백필은 하지 않았다 — 만약 이번 배포 전에 실제로 만들어진 문서가 있다면(예: 이번 대화 중 발견한 pageId `212959235`처럼) 그 문서를 열어 화면에는 정상적으로 옛 제목이 보이지만, 그 상태로 다시 수정 저장하기 전까지는 `sourceDocument.title`이 채워지지 않는다.

### 우려사항
- 없음.
