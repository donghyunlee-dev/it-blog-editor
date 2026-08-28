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

### 실제 Confluence 인스턴스 검증 (2026-08-28, 사용자 승인)
사용자가 "아무도 사용 안 하는 Confluence 스페이스라 사용해도 상관없다"고 승인해 직접 확인했다.
절차: 임시 페이지 생성 → 본문 수정(버전 2 생성) → `GET /api/v2/pages/{id}/versions` 호출 →
정리(트래시 이동 후 `?purge=true`로 영구 삭제, 스페이스에 흔적 남기지 않음).

실제 응답(요약):
```json
{
  "results": [
    { "number": 2, "createdAt": "2026-08-28T05:16:13.979Z", "message": "", "authorId": "...", "page": { "id": "...", "title": "...", "body": {} } },
    { "number": 1, "createdAt": "2026-08-28T05:16:13.122Z", "message": "", "authorId": "...", "page": { "id": "...", "title": "...", "body": {} } }
  ],
  "_links": { "base": "https://sfoodxproject.atlassian.net/wiki" }
}
```

확인된 것:
- `listPageVersions`가 기대하는 필드명(`number`/`createdAt`)이 실제 응답과 정확히 일치한다.
- 서버가 이미 최신순(버전 2 → 1)으로 반환한다 — 우리 코드가 클라이언트에서 다시 정렬하는
  안전장치는 여전히 유효하고 손해도 없다.
- 버전이 2개뿐이라 `_links.next` 커서 페이지네이션은 실제로 여러 페이지에 걸쳐서는 확인하지
  못했다(응답의 `_links`에 `base`만 있고 `next`는 없었다 — 더 가져올 페이지가 없을 때의 정상
  동작으로 보인다). 이 프로젝트의 다른 목록 엔드포인트가 전부 검증된 같은 커서 패턴이라
  위험은 낮다고 판단한다.

### 브라우저 UI 수동 클릭 검증
이 환경의 dev 서버는 AX Auth(사내 SSO) 로그인이 필요해 이 세션의 브라우저 도구로는 로그인
상태를 재현할 수 없었다 — `userEvent.click`으로 재현하는 통합 테스트로 대체했다. 실제 로그인
상태에서의 "이력" 버튼 → Modal 클릭 확인은 사용자가 직접 dev 서버에서 진행하기로 했다.

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
