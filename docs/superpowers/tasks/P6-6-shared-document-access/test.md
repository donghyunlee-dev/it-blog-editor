# P6-6: 공유 문서 접근 권한 확장 — 검증 기록

## 자동화 테스트
| 커맨드 | 결과 |
|---|---|
| `npx vitest run src/lib/editor/documents.test.ts` | 통과 (37/37, `requireDocumentAccess` 4건 포함) |
| `npx vitest run "src/app/api/editor/documents/[pageId]/route.test.ts"` | 통과 (9/9) |
| `npx vitest run "src/app/api/editor/documents/[pageId]/publish/route.test.ts"` | 통과 (4/4) |
| `npx vitest run "src/app/api/editor/documents/[pageId]/images/route.test.ts"` | 통과 (6/6) |
| `npx vitest run "src/app/api/editor/documents/[pageId]/versions/route.test.ts"` | 통과 (3/3) |
| `npx vitest run "src/app/api/editor/documents/[pageId]/tags/route.test.ts"` | 통과 (4/4) |
| `npx vitest run`(전체 스위트) | 통과 (49 파일 / 447건) |
| `npm run lint` | 통과(기존 경고 2건만) |
| `npx tsc --noEmit` | 통과(에러 없음) |
| `npm run build` | 통과 |

## 실제 Confluence 인스턴스 end-to-end 검증
소유자 계정(기존 테스트 계정 `donghyun.lee@s-food.com`), 임시 "공유받은 사람" 계정 폴더
(`p6-6-verify-shared@s-food.com`, 새로 만듦), 임시 "관계없는 제3자" 이메일(계정 폴더를 만들
필요조차 없음 — 접근 거부만 확인)로 실제 도메인 함수를 순서대로 호출했다(검증 후 문서와
공유받은 사람 계정 폴더 모두 정리).
1. 공유 전: 소유자는 `requireDocumentAccess` 통과, 관계없는 제3자는 거부(401 성격의
   `UnauthorizedError`) — 확인.
2. `shareDocument`로 공유 추가.
3. 공유 후: 공유받은 사람은 `requireDocumentAccess` 통과 — 확인.
4. 공유 후에도 관계없는 제3자는 여전히 `requireDocumentAccess` 거부 — 확인.
5. 공유받은 사람은 `requireDocumentOwner`(삭제 권한 기준)로는 여전히 거부됨 — 확인.
6. 소유자는 `requireDocumentOwner`도 통과 — 확인.

## 발견된 문제와 조치
없음 — 사전에 Explore 에이전트로 `requireDocumentOwner`의 실제 호출부 16건을 모두 조사해
(정의 1건, 실제 라우트 호출 7건, `restore`는 별도 방식이라 대상 아님, `deleted-documents.ts`
는 함수명이 주석에만 언급된 false positive) 정확한 대상만 골라 진행해서, 구현·테스트 단계
에서 별도로 발견된 문제는 없었다.

## 검증 중 새로 발견한 결정 사항
- 삭제(DELETE)를 공유 대상까지 확장할지는 prd.md에 명시돼 있지 않았다. GitHub Issue를
  등록하는 대신, "재공유는 소유자만"이라는 이미 정해진 문구와 협업 도구 일반 관례를 근거로
  "삭제는 소유자 전용"이라는 상식적 기본값으로 진행했다(`task.md`/`result.md`에 근거 기록).
  사용자가 다른 결정을 원하면 쉽게 바꿀 수 있는 한 줄짜리 변경이다.

## 최종 판정
- [x] 수용 기준(`task.md`)을 모두 만족함 — PRD 갱신 가능
