# P6-5: 공유받은 문서 목록 조회 — 검증 기록

## 자동화 테스트
| 커맨드 | 결과 |
|---|---|
| `npx vitest run src/lib/editor/documents.test.ts` | 통과 (41/41, `listSharedDocuments` 3건 포함) |
| `npx vitest run src/app/api/editor/documents/shared/route.test.ts` | 통과 (2/2) |
| `npx vitest run src/components/editor/EditorShell.test.tsx` | 통과 (3/3) |
| `npx vitest run src/components/editor/EditorSidebar.test.tsx` | 통과 (31/31, 신규 2건 포함) |
| `npx vitest run`(전체 스위트) | 통과 (53 파일 / 477건) |
| `npm run lint` | 통과(기존 경고 2건만) |
| `npx tsc --noEmit` | 통과(에러 없음) |
| `npm run build` | 통과(`/api/editor/documents/shared` 라우트 정상 생성 확인) |

## 실제 Confluence 인스턴스 end-to-end 검증
소유자 계정(기존 테스트 계정 `donghyun.lee@s-food.com`)과 임시 "수신자" 계정 폴더
(`p6-5-verify-recipient@s-food.com`, 새로 만듦)를 준비해 임시 문서 두 개를 만들고 실제
도메인 함수를 순서대로 호출했다(검증 후 문서·수신자 폴더 모두 정리).
1. 공유 전 `listSharedDocuments(recipientEmail)` — 빈 배열 확인.
2. 두 문서 모두 수신자에게 공유 → 재조회 시 두 문서 모두 현재 제목·소유자 이름
   ("안드레이" — 실제 accountIndex에 반영된 값)과 함께 정확히 나타남을 확인.
3. 소유자가 문서2를 완전히 삭제(휴지통 이동) → 재조회 시 문서1만 남고 문서2는 조용히
   제외됨을 확인(드리프트 처리, 전체 조회가 깨지지 않음).
4. 문서1 공유 해제 → 재조회 시 빈 배열로 돌아옴을 확인.

## 수동 검증(브라우저)
임시 미리보기 라우트(`src/app/dev-preview-shared-list/page.tsx`, 검증 후 삭제)에
`EditorShell`을 `sharedDocuments`와 함께 마운트해 확인했다.
1. "공유받은 문서" 영역이 "새 문서" 버튼과 검색창 사이에, "내 문서" 목록과 분리되어
   나타남을 확인.
2. 게시된 문서(초록 아이콘)·초안(점선 아이콘) 구분이 공유받은 문서에도 동일하게 적용됨을
   확인.
3. 소유자 이름이 있는 경우(`홍길동(hong@s-food.com)`)와 없는 경우(accountIndex에 없는
   계정 — `unknown@s-food.com`만 표시, `formatAccountLabel` 폴백)를 모두 확인.
4. 다크 테마에서 스크린샷으로 확인 — 토큰 기반 색상이라 하드코딩 없이 기존 문서 행과 같은
   스타일을 그대로 공유한다.

## 발견된 문제와 조치
없음 — 이전 P6-* 작업들에서 반복 확인한 "블랭킷 mock이 새 property key 조회와 충돌하는"
문제를 이번에도 미리 감안해 `listSharedDocuments` 테스트를 처음부터 key/pageId별로 값을
구분하는 `mockImplementation`으로 작성했다.

## 검증 중 새로 발견한 결정 사항
없음.

## 최종 판정
- [x] 수용 기준(`task.md`)을 모두 만족함 — PRD 갱신 가능
