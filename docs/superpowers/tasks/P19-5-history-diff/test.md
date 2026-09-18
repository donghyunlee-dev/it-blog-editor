# P19-5: 이력 diff — 검증 기록

## 자동화 테스트
| 커맨드 | 결과 |
|---|---|
| `npx vitest run src/lib/editor/documents.test.ts src/components/editor/VersionHistoryPage.test.tsx` | 통과 (62 tests) |
| `npx eslint src/lib/confluence/client.ts src/lib/editor/documents.ts src/lib/editor/documents.test.ts src/components/editor/VersionHistoryPage.tsx src/components/editor/VersionHistoryPage.test.tsx "src/app/api/editor/documents/[pageId]/versions/[version]/diff/route.ts" "src/app/editor/history/[pageId]/page.tsx"` | 통과(경고/오류 없음) |
| `npm run build` | 통과 — 라우트 목록에 `ƒ /api/editor/documents/[pageId]/versions/[version]/diff` 확인됨 |

## 수동 검증
실제 Confluence 인스턴스(`sfoodxproject.atlassian.net`, 버전 57개짜리 실제 문서
`233439235`)에 직접 `getVersionDiff`를 실행해 두 시나리오를 확인했다.

1. **변경 없는 인접 버전(57 vs 56)**: 반환된 diff가 추가/삭제 없이 전체가 하나의 미변경
   파트였다 — 텍스트로는 차이가 없는 저장이었음을 정확히 반영.
2. **실제로 내용이 바뀐 버전(10 vs 9)**: 5개 파트 중 2개가 `added: true`로 표시됐고, 그
   값(`"\";"`, `"    return name;\n"`)이 실제로 그 버전에서 추가된 코드 줄과 일치했다.

## 발견된 문제와 조치
없음.

## 검증 중 새로 발견한 결정 사항
없음.

## 최종 판정
- [x] 수용 기준(`task.md`)을 모두 만족함 — PRD 갱신 가능
