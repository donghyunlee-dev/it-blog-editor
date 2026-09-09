# P7-2: 폴더 CRUD 도메인 함수·API — 검증 기록

## 자동화 테스트
| 커맨드 | 결과 |
|---|---|
| `npx vitest run src/lib/editor/folders.test.ts` | 통과 (19/19, 신규 9건: 중복 이름 2건·renameFolder 5건·deleteFolder 승격 2건) |
| `npx vitest run "src/app/api/editor/folders/route.test.ts" "src/app/api/editor/folders/[folderId]/route.test.ts"` | 통과 (12/12, 신규) |
| `npx vitest run`(전체 스위트) | 통과 (58 파일 / 543건) |
| `npm run lint` | 통과(내 코드 기준 무관 경고 2건만) |
| `npx tsc --noEmit` | 통과(에러 없음) |
| `npm run build` | 통과(`/api/editor/folders`, `/api/editor/folders/[folderId]` 라우트가 목록에 나타남) |

## 실제 Confluence 인스턴스 end-to-end 검증
실제 계정(`donghyun.lee@s-food.com`)의 계정 폴더로 검증했다. 검증 전 `folderIndex`가
비어 있음을 먼저 확인한 뒤에만 진행했고, 끝나고 정확히 빈 배열로 복구했다.
1. 최상위 폴더 + 그 아래 자식 폴더 2개 생성 → 성공.
2. 같은 위치에 같은 이름으로 다시 생성 시도 → `ValidationError`("같은 위치에 이미 같은
   이름의 폴더가 있습니다.")로 정상 거부.
3. 자식 폴더 하나 이름변경(앞뒤 공백 trim 확인) → 성공.
4. 다른 자식 폴더를 방금 바꾼 이름으로 이름변경 시도 → 정상 거부.
5. 최상위 폴더 삭제 → 남은 두 자식이 모두 `parentId: null`(최상위)로 승격됨을 확인.
6. 남은 폴더 전부 삭제 → 정리 후 목록이 빈 배열로 원상 복구됨을 확인.

## 발견된 문제와 조치
없음.

## 검증 중 새로 발견한 결정 사항
없음 — 이름 중복 비허용, 문서 재배정을 P7-3으로 미루는 범위 조정은 모두 `task.md`에
근거와 함께 직접 정했다(GitHub Issue 불필요로 판단).

## 최종 판정
- [x] 수용 기준(`task.md`)을 모두 만족함 — PRD 갱신 가능
