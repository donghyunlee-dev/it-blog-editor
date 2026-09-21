# P17-14: "새 문서" 버튼 강조도 낮추기 — 구현 결과 보고서

## 구현 내용
- 사이드바 하단 "새 문서" `<Link>`(`EditorSidebar.tsx`)의 스타일을 `bg-brand` 풀필드에서
  `@sfood/ui`의 `Button variant="secondary"`와 동일한 색 조합(연한 테두리 + surface
  배경)으로 낮췄다. 위치·href·클릭 동작(저장 안 된 변경사항 경고)은 그대로다.

## 파일 변경 내역
| 파일 | 변경 사항 |
|------|---------|
| `src/components/editor/EditorSidebar.tsx` | 하단 "새 문서" 링크 className을 `bg-brand`/`text-on-brand`에서 `border border-border bg-surface`/`text-foreground`(secondary 변형과 동일)로 교체, 근거 주석 추가 |
| `docs/product/prd.md` | P17-14 항목 추가 및 완료 표시 |

## 커밋 내역
| SHA | 메시지 |
|-----|--------|
| (커밋 예정 — 아래 산출물 참고) | style: 사이드바 "새 문서" 버튼 강조도 낮춤 (P17-14) |

## 자체 검토 (Self-Review)
### 긍정 사항
- 새 색상을 발명하지 않고 이미 다른 보조 버튼(같은 사이드바의 "더 보기" 등)이 쓰는
  `secondary` 변형의 정확한 색 조합을 그대로 재사용해 일관성을 유지했다.
- 임시 디버그 페이지에서 실제 렌더링된 `getComputedStyle`을 측정해 브랜드 레드가
  더 이상 배경색이 아님을 직접 확인했다(로그인 우회 없이도 `EditorShell`은 `/editor`
  레이아웃(auth 게이트) 밖의 독립 라우트에서도 그대로 마운트할 수 있어 검증 가능했다).

### 주의사항
- 폴더 "+" 버튼과의 시각적 위계(하나는 아이콘만, 하나는 아이콘+텍스트 아웃라인 버튼)가
  사용자가 실제로 보기에 여전히 조화로운지는 스크린샷 기반 재확인이 아니라 계산된 색상
  값(`getComputedStyle`)으로만 검증했다 — 실제 화면에서 위화감이 없는지 사용자 확인 권장.

### 우려사항
- 없음 — href/클릭 핸들러/DOM 위치는 전혀 바꾸지 않았고 기존 78개 테스트가 모두
  통과해 회귀 위험이 낮다.
