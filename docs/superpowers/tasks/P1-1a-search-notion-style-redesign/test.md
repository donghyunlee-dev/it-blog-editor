# P1-1a 후속: Ctrl+K 검색 팝업 Notion 스타일 재구성 — 검증 기록

## 자동화 테스트
| 커맨드 | 결과 |
|---|---|
| `npx vitest run "src/lib/editor/documents.test.ts"` | 통과 (32/32, 스니펫 관련 신규 3건 포함) |
| `npx vitest run "src/app/api/editor/documents/search/route.test.ts"` | 통과 (4/4) |
| `npx vitest run "src/components/editor/GlobalSearchModal.test.tsx"` | 통과 (10/10) |
| `npm test` (전체) | 통과 (358/358, 회귀 없음) |
| `npm run lint` | 통과(0 오류, 기존 무관 경고 2건만 남음) |
| `npm run build` | 통과 |

## 수동 검증 (필요 시)
- AX Auth 로그인 제약으로 실제 로그인 후 Ctrl+K를 눌러보는 시각적 확인은 하지 못했다(이 프로젝트의
  기존 제약과 동일).

## 발견된 문제와 조치
- **원인 1**: RTL 테스트에서 `getByRole("button", { name: /^React 19 정리/ })`처럼 `^`로 시작을
  고정한 정규식이 실패했다 — 결과 행 버튼 내부의 `StatusIcon`이 `role="img" aria-label="초안"`을
  가지고 있어, 버튼의 접근성 이름이 `"초안 React 19 정리"`처럼 아이콘 라벨이 앞에 붙는 형태로
  계산됐다.
  **조치**: 테스트의 모든 역할-이름 정규식에서 `^` 앵커를 제거해 부분 일치로 바꿨다.
  **재검증 결과**: 관련 테스트 전부 통과.
- **원인 2**: `npm run lint`에서 `react-hooks/immutability`("Cannot reassign variable after
  render completes") 오류 발생 — 결과 목록을 그룹별로 렌더링하며 `let rowCursor` 변수를 JSX 콜백
  안에서 계속 증가시켜 전체 인덱스를 추적하고 있었다.
  **조치**: 가변 카운터를 없애고, 렌더 전에 `useMemo`로 `flatIndexByPageId`(pageId → 인덱스 Map)를
  미리 계산한 뒤 각 행에서 그 Map을 조회하는 방식으로 바꿨다(mutation 없음).
  **재검증 결과**: `npm run lint` 통과(오류 0건).
- **원인 3**: `snippet` 필드를 `DocumentSearchResult`에 추가한 뒤 `npm run build`에서
  `route.test.ts(43,7): error TS2741: Property 'snippet' is missing` 발생 — 라우트 테스트의
  mock 반환값과 기대 응답 바디가 새 필수 필드를 포함하지 않았다.
  **조치**: mock과 기대값 양쪽에 `snippet: "본문 일부"`를 추가했다.
  **재검증 결과**: `npm run build` 통과.

## 검증 중 새로 발견한 결정 사항
없음 — 사용자가 캡처로 목표 UI를 직접 지정했고, 제외 범위(생성자/검색 범위 필터, 즐겨찾기)도
대화 중 사전 고지에 이견이 없었다.

## 최종 판정
- [x] 수용 기준(`task.md`)을 모두 만족함 — PRD 갱신 완료
