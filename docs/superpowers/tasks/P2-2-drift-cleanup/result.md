# P2-2: 문서-코드 드리프트 잔여 항목 정리 — 구현 결과 보고서

## 구현 내용
- `EditorSidebar.tsx`의 `extractPageIdFromPathname`에서 `/editor/{pageId}/publish` 접미사를
  특별 취급하던 정규식(`(?:\/publish)?`)과 그 설명 주석을 제거했다 — 게시 설정은 2026-08-26에
  이미 별도 페이지에서 `DocumentEditor.tsx` 내부 `Modal`로 흡수돼, 그런 경로는 실제로 존재한
  적이 없는(URL이 바뀌지 않는 Modal이라) 죽은 코드였다. `router.push`/`Link href`가 그런
  경로를 생성하는 곳이 전무함을 grep으로 확인했다.
- `EditorSidebar.test.tsx`의 관련 테스트 2건을 새 동작에 맞게 갱신했다 — `/editor/{pageId}/publish`
  는 이제 pageId로 인식되지 않는다(더 깊은 경로는 그냥 매치 실패). 중복이 된
  `/editor/new/publish` 케이스는 같은 "더 깊은 경로는 undefined" 동작을 다른 값으로 한 번 더
  반복 검증할 뿐이라 제거했다.
- `design.md`도 이 항목과 관련해 확인했다 — `/publish` 경로나 `extractPageIdFromPathname`을
  잘못 설명하는 서술이 없어(전체 검색으로 확인) 실제로 고칠 내용이 없었다. `prd.md`의 화면
  정의 표(`/editor/new`, `/editor/[pageId]`)도 이미 정확해 별도 수정이 필요 없었다.
- **진행 중 추가로 발견한 드리프트(같은 PR에서 함께 정리)**: 진행률 헤더를 85/85로 올리며
  전체를 다시 훑다가, "사용자 계정 정보 관리·온보딩"·"접속 권한 게이트" 두 기능별 정의 항목의
  `상태` 줄이 각각 "계획 — Phase 5(...)에서 구현 예정"으로 남아있는 것을 발견했다 — Phase 5는
  2026-09-04에 이미 P5-1~P5-8 전체가 완료됐는데(prd.md 자신의 다른 곳에 이미 기록돼 있음)
  이 두 줄만 갱신이 누락돼 있었다. "완료(..., 2026-09-04)"로 바로잡았다. Phase 4 섹션 헤더
  두 곳도 "(진행 중)"으로 남아있어 P2-2까지 끝난 지금 시점에 맞게 "(완료, 2026-09-07)"로
  갱신했다.

## 파일 변경 내역
| 파일 | 변경 사항 |
|------|---------|
| `src/components/editor/EditorSidebar.tsx` | `extractPageIdFromPathname`에서 죽은 `/publish` 처리 제거 |
| `src/components/editor/EditorSidebar.test.tsx` | 관련 테스트 갱신(2건 → 1건) |
| `docs/superpowers/tasks/P2-2-drift-cleanup/{task,plan,result,test}.md` | 신규 |
| `docs/product/prd.md` | P2-2 완료 표시 |

## 커밋 내역
| SHA | 메시지 |
|-----|--------|
| (PR에서 확인) | fix: 존재하지 않는 게시 설정 라우트를 다루던 죽은 코드 제거 (P2-2) |

## 자체 검토 (Self-Review)
### 긍정 사항
- "죽은 코드"라고 주장하기 전에 실제로 그 경로를 생성하는 곳이 정말 없는지 `grep`으로 직접
  확인했다(`router.push`/`Link href`에 `/publish` 접미사를 붙이는 곳이 프로젝트 전체에 없음).
- `design.md`를 "확인했지만 바꿀 게 없었다"는 것까지 이 문서에 명시해, 조용히 건너뛴 게
  아니라 실제로 검토했다는 근거를 남겼다.

### 주의사항
- 없음 — 순수 정리 작업이라 동작 변경이 없다(정상 경로 `/editor/{pageId}`의 사이드바 강조
  표시는 전혀 바뀌지 않음).

### 우려사항
- 없음.
