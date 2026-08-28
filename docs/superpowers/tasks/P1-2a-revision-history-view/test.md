# P1-2a: 버전 이력 조회 화면 — 검증 기록

## 자동화 테스트
| 커맨드 | 결과 |
|---|---|
| `npx vitest run src/lib/confluence/client.test.ts`(구현 전, TDD red) | 2건 실패(의도됨) |
| `npx vitest run src/lib/confluence/client.test.ts`(구현 후) | 통과 (18/18) |
| `npx vitest run src/lib/editor/documents.test.ts`(구현 전, TDD red) | 1건 실패(의도됨) |
| `npx vitest run src/lib/editor/documents.test.ts`(구현 후) | 통과 (17/17) |
| `npx vitest run ".../versions/route.test.ts"`(구현 전, TDD red) | 모듈 없음(의도됨) |
| `npx vitest run ".../versions/route.test.ts"`(구현 후) | 통과 (2/2) |
| `npx vitest run src/components/editor/VersionHistory.test.tsx`(구현 전, TDD red) | 모듈 없음(의도됨) |
| `npx vitest run src/components/editor/VersionHistory.test.tsx`(구현 후) | 통과 (4/4) |
| `npx vitest run src/components/editor/DocumentEditor.test.tsx` | 통과 (27/27, 신규 1건 포함) |
| `npm test`(전체) | 통과 (192/192 — 변경 전 182/182에서 10건 순증) |
| `npx tsc --noEmit` | 통과 |
| `npm run lint`(1차) | `react-hooks/set-state-in-effect` 에러 1건(`VersionHistory.tsx`) |
| `npm run lint`(최종) | 통과 — 에러 0, 경고 2(기존 무관 경고) |
| `npm run build` | 통과 — `/api/editor/documents/[pageId]/versions` 라우트가 목록에 등록됨을 확인 |
| 널 바이트 스캔(Node 스크립트, 이번에 손댄 모든 파일) | 이상 없음 |

## 수동 검증
**실제 Confluence 인스턴스로 검증하지 못했다** — 이 환경에는 접근 가능한 Confluence 인스턴스가
없다. `listPageVersions`가 호출하는 `GET /api/v2/pages/{id}/versions`의 실제 응답 형태를
Atlassian 공식 문서 기준으로만 구현했다. 이것이 이번 작업을 main에 직접 반영하지 않고 PR로
올리는 핵심 이유다(`task.md`/`result.md` 참고) — 머지 전에 실제 인스턴스로 한 번 호출해
필드명·페이지네이션 동작을 확인하기를 권장한다.

브라우저 UI 쪽(헤더 "이력" 버튼 → Modal → 목록 표시)은 이 환경의 dev 서버 접속 제약으로
직접 클릭 검증은 하지 못했다 — `userEvent.click`으로 재현하는 통합 테스트로 대체했다.

## 발견된 문제와 조치
- **원인**: `VersionHistory.tsx`의 데이터 로딩 `useEffect`에서 `setState({status:"loading"})`
  호출이 `react-hooks/set-state-in-effect` lint 에러를 냈다.
- **조치**: 이번 경우는 React 문서가 useEffect의 정당한 용도로 직접 예시로 드는 "데이터
  가져오기" 패턴이라, 근거를 남기고 `eslint-disable-next-line`으로 억제했다.
- **재검증 결과**: lint 통과, 나머지 회귀 없음.

## 검증 중 새로 발견한 결정 사항
없음 — 다만 위 "수동 검증"에 남긴 대로, 실제 인스턴스 검증이라는 확인 절차가 머지 전에
필요하다.

## 최종 판정
- [x] 수용 기준(`task.md`)을 모두 만족함 — PR 리뷰/머지 전 실제 Confluence 인스턴스 확인을
  권장한다는 단서를 달아 PRD를 갱신한다.
