# P0-4b: 이미지 업로드 개수 제한 — 검증 기록

## 자동화 테스트
| 커맨드 | 결과 |
|---|---|
| `npx vitest run src/components/editor/RichTextEditor.test.tsx` | 통과 (3/3, 신규 파일) |
| `npm test`(전체) | 통과 (148/148 — 변경 전 145/145에서 3건 순증) |
| `npx tsc --noEmit` | 통과 |
| `npm run lint` | 통과 — 에러 0, 경고 2(기존 무관 경고) |
| `npm run build` | 통과 |

## 수동 검증
이 환경의 Browser 프리뷰 제약(이전 작업들과 동일 — 로컬 dev 서버 `navigate` 거부)으로 실제
브라우저 클릭 검증은 하지 못했다. 대신 실제 TipTap 렌더링에 진짜 `drop`/`paste` DOM 이벤트를
디스패치하는 통합 테스트로 세 진입점 중 드래그앤드롭·붙여넣기 두 곳을 확인했다(슬래시 메뉴
"이미지"는 `<input type=file>` 다이얼로그를 여는 구조라 이 테스트 스위트에서는 다루지 않았고,
코드 리뷰로 같은 검사 로직이 동일하게 들어갔음을 확인했다 — `RichTextEditor.tsx`의
`createImageSlashItem` 참고).

## 발견된 문제와 조치
- **원인**: `drop` 이벤트의 `dataTransfer` 대역에 `getData()`가 없어 ProseMirror 내부
  핸들러가 `TypeError: clipboardData.getData is not a function`을 던지며 테스트가 실패했다.
- **조치**: 대역 객체에 `getData: () => ""`를 추가했다.
- **재검증 결과**: 3개 테스트 모두 통과.

## 검증 중 새로 발견한 결정 사항
없음.

## 최종 판정
- [x] 수용 기준(`task.md`)을 모두 만족함 — PRD 갱신 가능. 서버 측 강제는 의도적으로
  범위 밖으로 뒀다.
