# P8-4: 소개/랜딩 화면 메인 검색 진입점 추가 — 검증 기록

## 자동화 테스트
| 커맨드 | 결과 |
|---|---|
| `npx tsc --noEmit` | 통과, 에러 없음 |
| `npx vitest run src/components/editor/LandingSearchButton.test.tsx src/components/editor/EditorShell.test.tsx src/components/editor/GlobalSearchModal.test.tsx src/components/editor/EditorSidebar.test.tsx` | 4개 파일, 89개 전부 통과(신규 6개 포함) |
| `npx vitest run src/app/editor/page.test.tsx` | 1개 파일, 1개 통과 |
| `npx eslint src/components/editor/GlobalSearchContext.tsx src/components/editor/LandingSearchButton.tsx src/components/editor/EditorShell.tsx src/app/editor/page.tsx (+테스트 파일들)` | 0 errors |
| `npm test` | 63개 파일, 630개 전부 통과 |
| `npm run build` | Turbopack 프로덕션 빌드 성공, TypeScript 통과, 28개 라우트 정상 생성 |

## 수동 검증
- AX Auth 로그인 제약으로 이 세션에서는 실제 브라우저로 확인할 수 없었다(P7-7/P8-1과 동일한
  한계). 대신 다음을 자동화 테스트로 직접 검증했다:
  - `LandingSearchButton`을 Provider 없이 렌더링해도 클릭 시 에러가 나지 않는다(랜딩 화면이
    실수로 `GlobalSearchProvider` 밖에서 렌더링되는 회귀를 잡아낸다).
  - `EditorShell` 안에서 children(라우트 페이지 대역)이 `useGlobalSearch()`로 얻은
    `triggerSearch`를 호출하면 실제로 `GlobalSearchModal`이 열린다(`getByLabelText("문서
    전체 검색")`로 확인).
  - 헤더의 검색 버튼(P8-1, 사이드바)과 children의 검색 트리거(P8-4)를 순서대로 눌러도
    `getAllByLabelText("문서 전체 검색")`가 항상 길이 1 — 두 진입점이 별개의 모달을 만들지
    않고 같은 하나만 여닫는다는 것을 직접 확인했다.
  - `EditorHomePage`를 렌더링해 "새 문서 작성" 링크와 검색 버튼이 함께 나타나는지 확인했다
    (기존 유일한 primary 액션과 공존, 레이아웃 자체가 깨지지 않음).

## 발견된 문제와 조치
없음 — 첫 구현에서 타입 체크·린트·전체 테스트·빌드가 모두 바로 통과했다.

## 검증 중 새로 발견한 결정 사항
없음.

## 최종 판정
- [x] 수용 기준(`task.md`)을 모두 만족함 — PRD 갱신 가능
