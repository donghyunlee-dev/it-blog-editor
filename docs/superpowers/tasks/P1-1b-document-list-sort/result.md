# P1-1b: 문서 목록 정렬 옵션(최신순/제목순) — 구현 결과 보고서

## 구현 내용
- `EditorSidebar.tsx`에 `sortBy` state(`"updatedAt" | "title"`, 기본값 `"updatedAt"`)와 `@sfood/ui`의 `Select` 드롭다운("최신순"/"제목순")을 추가했다.
- 정렬은 태그 필터·검색어 필터를 거친 결과에 대해서만 적용한다(`.filter().filter().sort()` 체인 — `filter()`가 매번 새 배열을 반환하므로 `sort()`가 `documents` prop 원본을 건드리지 않는다).
- "최신순"은 `updatedAt` 내림차순, "제목순"은 `localeCompare(..., "ko")`로 한글 로케일 오름차순 정렬한다.
- 검색 입력과 같은 조건(`documents.length > 0`)으로 감싸, 문서가 없으면 정렬 드롭다운도 보이지 않는다.

## 파일 변경 내역
| 파일 | 변경 사항 |
|------|---------|
| `src/components/editor/EditorSidebar.tsx` | 정렬 state·UI·로직 추가 |
| `src/components/editor/EditorSidebar.test.tsx` | 신규 테스트 3개, 정렬 전용 픽스처(`SORT_DOCS`) 추가 |

## 자체 검토 (Self-Review)

### 긍정 사항
- TDD로 진행했다.
- 테스트 픽스처를 제목 순서와 날짜 순서가 서로 반대가 되도록 설계해(`가나다 문서(오래됨)` vs `마바사 문서(최근)`), 두 정렬 기준을 실제로 구분해서 검증했다 — 우연히 통과하는 테스트가 아니다.

### 주의사항
- 없음.

### 우려사항
- 없음.
