# P6-7: 동시 편집 충돌 감지 + 마지막 수정자 표시 — 검증 기록

## 자동화 테스트
| 커맨드 | 결과 |
|---|---|
| `npx vitest run src/lib/editor/documents.test.ts "src/app/api/editor/documents/[pageId]/route.test.ts" src/lib/api-response.test.ts` | 통과 (49/49) |
| `npx vitest run src/components/editor/DocumentEditor.test.tsx` | 통과 (32/32) |
| `npx vitest run`(전체 스위트) | 통과 (49 파일 / 436건) |
| `npm run lint` | 통과(기존 경고 2건만) |
| `npx tsc --noEmit` | 통과(에러 없음 — `updateDocument`의 추론된 반환 타입이 `lastEditedBy` 필드를 필수로 요구해, 관련 mock 두 곳에 `lastEditedBy: undefined`를 명시적으로 추가해 해결) |
| `npm run build` | 통과 |

## 실제 Confluence 인스턴스 end-to-end 검증
테스트 계정(`donghyun.lee@s-food.com`) 폴더 하위에 임시 문서를 만들어 실제 도메인 함수를
순서대로 호출했다(검증 후 문서는 휴지통으로 삭제).
1. 생성 직후 `getDocumentDetail` — `lastEditedBy`가 `undefined`임을 확인(아직 수정 저장을
   거치지 않음).
2. `updateDocument`로 수정 저장 — 응답에 `lastEditedBy: { email, name: "이동현", editedAt }`
   가 포함되고, 다시 `getDocumentDetail`로 조회해도 같은 값이 반영됨을 확인.
3. 낡은 `expectedVersion`(최초 버전)으로 다시 `updateDocument` 호출 — `ConflictError`가
   던져지고, 메시지에 "마지막으로 저장한 사람: 이동현(donghyun.lee@s-food.com)"이 포함되며
   `error.details.lastEditedBy`에도 같은 정보가 실려 있음을 확인.

## 수동 검증(브라우저)
미인증 미리보기 라우트(`src/app/dev-preview-lasteditor/page.tsx`, 검증 후 삭제)에
`DocumentEditor`를 `initialLastEditedBy`와 함께 직접 마운트해 확인했다.
- `find`/`getBoundingClientRect`로 풋터 텍스트가 "최종 수정: 2026.09.04 · 마지막 수정자:
  김철수(other@s-food.com)"로 정확히 렌더링됨을 확인.
- 이 미리보기 페이지는 `EditorShell`(스크롤 컨테이너) 밖에서 단독 마운트한 것이라 화면
  스크롤이 도구상 어긋나 스크린샷 대신 DOM 텍스트/좌표로 확인했다 — 실제 앱에서는
  `EditorShell`의 `overflow-y-auto` 안에서 정상적으로 스크롤된다(기존 다른 P6-*/P5-*
  검증에서 이미 같은 셸을 반복 확인함).

## 발견된 문제와 조치
- **원인**: `updateDocument`의 반환 타입이 인터페이스로 명시돼 있지 않고 함수 반환문에서
  타입 추론되는데, `lastEditedBy: sharingMeta.lastEditedBy` 형태로 항상 키 자체는 포함시켜
  반환하다 보니 TS가 이 필드를 "값은 undefined일 수 있지만 키는 필수"로 추론했다. 이 때문에
  `route.test.ts`의 `updateDocument` mock 두 곳(`{pageId, version}`만 반환)이 타입 오류가
  됐다.
- **조치**: 두 mock 호출에 `lastEditedBy: undefined`를 명시적으로 추가했다. 실제 HTTP 응답은
  `NextResponse.json`이 `JSON.stringify`를 거치며 `undefined` 값 필드를 자동으로 생략하므로,
  이 변경이 실제 API 응답 바디 검증(`toEqual({pageId, version})`)에는 영향이 없다.
- **재검증 결과**: `npx tsc --noEmit` 재실행 시 에러 0건, 관련 테스트 8건 모두 통과.

## 검증 중 새로 발견한 결정 사항
없음.

## 최종 판정
- [x] 수용 기준(`task.md`)을 모두 만족함 — PRD 갱신 가능
