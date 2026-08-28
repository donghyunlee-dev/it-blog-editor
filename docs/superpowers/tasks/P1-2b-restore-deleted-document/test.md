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

## 수동 검증
**실제 Confluence 인스턴스로 트래시/복구 흐름을 검증하지 못했다** — `result.md`의 "우려사항"
참고. `movePage`(트래시된 페이지 대상)와 `getPageProperty`(트래시된 페이지의 `authorMeta`를
읽지 않도록 설계를 좁혔지만, 계정 폴더 자체의 `deletedDocuments`/`authorMeta` 조회는 정상
페이지 대상이라 기존 기능과 같은 신뢰 수준) 동작을 Atlassian 공식 문서 기준으로만 구현했다.
이것이 이번 작업을 main에 직접 반영하지 않고 PR로 올리는 핵심 이유다 — 머지 전에 실제
인스턴스에서 문서 삭제 → "삭제된 문서" Modal에서 복구 → 초안 목록에 다시 나타남까지 한 번
확인하기를 권장한다.

브라우저 UI 쪽(헤더 "삭제된 문서" 버튼 → Modal → 목록/복구)은 이 환경의 dev 서버 접속 제약으로
직접 클릭 검증은 하지 못했다 — `userEvent.click`으로 재현하는 통합 테스트로 대체했다.

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
