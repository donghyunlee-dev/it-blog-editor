# P8-6: 본문 최대 폭 조정 — 검증 기록

## 자동화 테스트
| 커맨드 | 결과 |
|---|---|
| `npx vitest run src/components/editor/DocumentEditor.test.tsx` | 39개 전부 통과(신규 1개 포함) |
| `npx tsc --noEmit` | 통과, 에러 없음 |
| `npx eslint src/components/editor/DocumentEditor.tsx src/components/editor/DocumentEditor.test.tsx src/components/editor/RichTextEditor.tsx` | 0 errors |
| `npm test` | 63개 파일, 637개 전부 통과 |
| `npm run build` | Turbopack 프로덕션 빌드 성공, TypeScript 통과, 28개 라우트 정상 생성 |

## 수동 검증
- AX Auth 로그인 제약으로 이 세션에서는 실제 브라우저로 픽셀 단위 렌더링 폭(830px)을
  확인하지 못했다(P7-7·P8-1·P8-4와 동일한 한계). 대신 `DocumentEditor.test.tsx`의 신규
  테스트로 본문 컨테이너에 `max-w-[830px]` 클래스가 적용되고 옛 `max-w-[820px]` 클래스는
  더는 존재하지 않음을 확인했다 — Tailwind 유틸리티 클래스이므로 클래스 적용 = 실제
  `max-width: 830px` CSS 규칙 적용과 동일하다(이 프로젝트가 임의 스타일이 아니라 Tailwind
  유틸리티만 쓰는 관례).

## 발견된 문제와 조치
없음 — 클래스 값 변경 + 주석 갱신만으로 첫 시도에 타입 체크·린트·전체 테스트·빌드가 모두
통과했다.

## 검증 중 새로 발견한 결정 사항
없음.

## 최종 판정
- [x] 수용 기준(`task.md`)을 모두 만족함 — PRD 갱신 가능
