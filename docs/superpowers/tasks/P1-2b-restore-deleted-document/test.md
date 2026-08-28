# P1-2b: 삭제된 문서 복구 — 검증 기록

## 자동화 테스트
| 커맨드 | 결과 |
|---|---|
| `npx vitest run src/lib/editor/documents.test.ts` | 통과 (19/19, 신규 3건 포함) |
| `npx vitest run src/lib/editor/deleted-documents.test.ts` | 통과 (6/6, 신규) |
| `npx vitest run "src/app/api/editor/documents/deleted/route.test.ts" "src/app/api/editor/documents/[pageId]/restore/route.test.ts"` | 통과 (5/5, 신규) |
| `npx vitest run src/components/editor/DeletedDocumentsModal.test.tsx` | 통과 (6/6, 신규) |
| `npx vitest run src/components/editor/EditorSidebar.test.tsx` | 통과 (27/27, 신규 1건 포함) |
| `npm test`(전체) | 통과 (203/203 — 변경 전 172/172에서 31건 순증) |
| `npx tsc --noEmit` | 통과(아래 "발견된 문제와 조치" 참고) |
| `npm run lint` | 통과 — 에러 0, 경고 2(기존 무관 경고: `postcss.config.js`/`tailwind.config.js`) |
| `npm run build` | 통과 — `/api/editor/documents/deleted`, `/api/editor/documents/[pageId]/restore` 라우트가 목록에 등록됨을 확인 |
| 위 전체(`npm test`/`npm run lint`/`npx tsc --noEmit`/`npm run build`), 아이콘·위치 변경 후 재실행 | 모두 통과(회귀 없음, 203/203 그대로 — 기존 테스트가 버튼을 접근성 이름 "삭제된 문서"로 찾아 위치·아이콘 변경에 영향받지 않음) |

## 수동 검증

### 실제 Confluence 인스턴스 검증 (2026-08-28, 사용자 승인)
사용자가 "아무도 사용 안 하는 Confluence 스페이스라 사용해도 상관없다"고 승인해, 실제 인스턴스에
임시 페이지를 만들어 이 기능의 핵심 가정을 직접 확인했다(스크립트:
`confluence-spike.mjs`, 세션 스크래치패드에 임시 작성 후 실행 — 리포지토리에는 커밋하지 않음).
절차: 페이지 생성 → 버전 2개 생성 → `DELETE`(트래시 이동) → `GET`(트래시 상태 조회) →
`PUT status:"current"` + `parentId`(=`movePage`와 동일한 요청 형태, 복구 시도) → `GET`(복구
후 재확인) → 정리(`DELETE` 후 `?purge=true`로 영구 삭제).

결과:
- `DELETE`로 트래시 이동 성공. 트래시 상태에서 `parentId`가 `null`이 됨을 실측으로 확인 —
  "복구 시 원래 위치를 API로 복원할 수 없다"는, 이 작업이 처음부터 자체 레지스트리 방식을
  택한 근거가 되는 가정이 맞았다.
- `GET .../{id}?body-format=storage`가 트래시 상태에서도 본문을 포함해 정상 응답했다
  (`status: "trashed"`).
- `PUT`(`movePage`와 동일한 요청 바디: `status:"current"` + `parentId`)로 트래시된 페이지를
  성공적으로 복구했다 — 재조회 결과 `status:"current"`, `parentId`가 지정한 값으로 복원됨을
  확인.
- (부수 발견) `DELETE` 호출이 한 번 500(Internal Server Error)을 반환했다 — 즉시 재시도하니
  성공했다. 재현 빈도는 낮아 보이지만, 이미 백로그에 있는 P1-3(429/5xx 재시도·백오프) 항목의
  필요성을 뒷받침하는 실제 사례로 남긴다.
- 테스트 페이지는 트래시 이동 후 `?purge=true`로 영구 삭제해 스페이스에 흔적을 남기지 않았다.

이로써 이 PR을 막던 핵심 불확실성(트래시된 페이지에 대한 `getPage`/`movePage` 동작)이
실제로 해소됐다.

### 브라우저 UI 수동 클릭 검증
이 환경의 dev 서버는 AX Auth(사내 SSO) 로그인이 필요해 이 세션의 브라우저 도구로는 로그인
상태를 재현할 수 없었다 — `userEvent.click`으로 재현하는 통합 테스트로 대체했다. 실제 로그인
상태에서의 화면 확인(아이콘·위치 변경분 포함)은 이전 항목들과 마찬가지로 사용자가 직접 dev
서버(`localhost:3100`)에서 확인하기로 했다 — 이 갱신 시점까지는 아직 확인 전이다.

## 발견된 문제와 조치
- **원인 1**: `DeletedDocumentsModal.tsx`에서 실패 토스트에 `"error"` variant를 넘겼는데,
  `@sfood/ui`의 `useToast().toast()`는 `"success" | "info" | "warning" | "danger"`만 허용해
  `npx tsc --noEmit`이 타입 에러를 냈다.
- **조치 1**: 이 프로젝트의 기존 관례(`DocumentEditor.tsx`가 전체 실패에 쓰는 값)를 따라
  `"danger"`로 교체했다.
- **원인 2**: `npx tsc --noEmit`이 `.next/types/validator.ts`에서 존재하지 않는
  `.../versions/route.js`(P1-2a 브랜치에서만 존재하는 라우트)를 찾지 못해 실패했다 — 이
  작업 도중 `feature/p1-2a-revision-history` 브랜치의 dev 서버가 같은 작업 디렉터리에서
  실행되며 남긴 낡은 `.next` 빌드 캐시였다.
- **조치 2**: `.next` 디렉터리를 삭제(`rm -rf .next`)해 캐시를 정리했다. 소스 코드 문제가
  아니었다.
- **재검증 결과**: 위 두 조치 후 `npx tsc --noEmit`/`npm test`/`npm run lint`/`npm run build`
  모두 통과.

## 검증 중 새로 발견한 결정 사항
없음 — 다만 위 "수동 검증"에 남긴 대로, 실제 인스턴스 검증이라는 확인 절차가 머지 전에 필요하다.

## 최종 판정
- [x] 수용 기준(`task.md`)을 모두 만족함 — PR 리뷰/머지 전 실제 Confluence 인스턴스 확인을
  권장한다는 단서를 달아 PRD를 갱신한다.
