# P19-8: 이력 화면 제목 위계 수정 — 구현 결과

## 구현 내용
- `VersionHistoryPage.tsx` 헤더에서 "문서 이력"을 작은 라벨(`text-sm text-muted`)로,
  문서 제목(`currentTitle`)을 큰 제목(`h1`, `text-2xl font-bold`)으로 순서와 스타일을
  교체했다. 제목이 없을 때의 "(제목 없음)" 대체 문구는 유지했다.

## 파일 변경 내역
| 파일 | 변경 사항 |
|------|---------|
| `src/components/editor/VersionHistoryPage.tsx` | 제목/라벨 순서·스타일 교체 |
| `src/components/editor/VersionHistoryPage.test.tsx` | `heading` role 검증으로 assertion 강화 |

## 커밋 내역
| SHA | 메시지 |
|-----|--------|
| `d187786` | fix: 문서 이력 화면에서 문서 제목이 "문서 이력"보다 작게 보이던 위계 문제 수정 (P19-8) |

## 자체 검토 (Self-Review)
### 긍정 사항
- 사용자가 실제 렌더링된 스크린샷으로 지적해준 덕분에, 텍스트만 보고는 놓쳤을 시각적
  위계 문제를 바로 잡을 수 있었다.
- 테스트도 `getByText`(텍스트 존재만 확인)에서 `getByRole("heading")`(실제로 제목처럼
  마크업됐는지)으로 강화해, 같은 종류의 회귀(텍스트는 있지만 시각적으로 제목처럼 안
  보이는 상태)를 앞으로도 잡을 수 있게 했다.

### 주의사항
- P19-7이 이미 머지된 PR(#154)에 들어가 있어, 이 수정은 새 PR로 올린다.

### 우려사항
없음.
