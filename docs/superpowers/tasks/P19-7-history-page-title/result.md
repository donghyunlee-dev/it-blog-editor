# P19-7: 이력 화면 제목 표시 — 구현 결과

## 구현 내용
- `VersionHistoryPage.tsx` 헤더에 `currentTitle`(비어 있으면 "(제목 없음)")을
  "문서 이력" 제목 위에 작은 라벨로 표시.

## 파일 변경 내역
| 파일 | 변경 사항 |
|------|---------|
| `src/components/editor/VersionHistoryPage.tsx` | 헤더에 문서 제목 표시 추가 |
| `src/components/editor/VersionHistoryPage.test.tsx` | 표시/빈 제목 대체 테스트 추가 |

## 커밋 내역
| SHA | 메시지 |
|-----|--------|
| `7f7f6c8` | feat: 문서 이력 화면 상단에 문서 제목 표시 (P19-7) |

## 자체 검토 (Self-Review)
### 긍정 사항
- P19-6에서 이미 조회해 둔 값을 재사용해 추가 API 호출 없이 구현했다.

### 주의사항
없음.

### 우려사항
없음.
