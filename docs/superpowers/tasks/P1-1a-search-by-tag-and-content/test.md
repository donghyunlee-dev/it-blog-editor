# P1-1a: 사이드바 검색을 태그까지 확장 — 검증 기록

## 자동화 테스트
| 커맨드 | 결과 |
|---|---|
| `npx vitest run src/components/editor/EditorSidebar.test.tsx`(구현 전, TDD red) | 1건 실패(태그 검색, 의도됨), 2건은 이미 통과(제목 검색은 기존 동작, AND 조합은 우연히 이미 성립) |
| `npx vitest run src/components/editor/EditorSidebar.test.tsx`(구현 후) | 통과 (19/19, 신규 3건 포함) |
| `npm test`(전체) | 통과 (175/175 — 변경 전 172/172에서 3건 순증) |
| `npx tsc --noEmit` | 통과 |
| `npm run lint` | 통과 — 에러 0, 경고 2(기존 무관 경고) |
| `npm run build` | 통과 |

## 수동 검증
사이드바 UI 변경이라 브라우저로 확인 가능하지만, 이 환경의 dev 서버 접속 제약으로 직접
클릭 검증은 하지 못했다(이전 작업들과 동일한 제약). `userEvent.type`으로 실제 타이핑을
재현하는 통합 테스트로 대체했다.

## 발견된 문제와 조치
문제는 없었다 — TDD로 먼저 실패하는 테스트를 작성하고(레드), 최소 구현으로 통과시켰다(그린).

## 검증 중 새로 발견한 결정 사항
본문(문서 내용) 검색 지원 여부·방식 — [Issue #7](https://github.com/sfood-pioneer-1st/sfood-it-editor/issues/7)로 등록했다(`_pending-decisions.md` 갱신).

## 최종 판정
- [x] 수용 기준(`task.md`)을 모두 만족함 — PRD 갱신 가능. 본문 검색은 의도적으로 범위 밖(Issue #7 결정 대기).
