# P17-15: 저장 버튼 상태 표현 강화 — 구현 결과 보고서

## 구현 내용
- `DocumentEditor.tsx` 헤더의 저장 버튼 바로 앞에 `SaveStatusIndicator`를 추가해
  "저장 중...", "변경사항 있음", "저장됨 HH:MM" 세 상태 중 하나(또는 해당 없음 →
  표시 안 함)를 보여준다.
- `lastSavedAt` state를 새로 추가해(기존 문서를 열 때는 `initialUpdatedAt`로 초기화)
  수동 저장(`handleSave`)과 자동 저장(`performAutosave`) 성공 시 모두 갱신한다.
- 기존 풋터에 있던 자동저장 상태 문구("자동 저장 중.../자동 저장됨")와 그 전용
  state(`autosaveStatus`)를 제거했다 — 헤더의 새 표시로 통합되어 중복이었다. 풋터는
  세션을 넘나드는 "최종 수정 날짜·수정자"만 남긴다.

## 파일 변경 내역
| 파일 | 변경 사항 |
|------|---------|
| `src/components/editor/DocumentEditor.tsx` | `formatSavedTime`/`SaveStatusIndicator` 추가, `lastSavedAt` state 추가 및 저장 성공 지점 2곳에서 갱신, 헤더에 인디케이터 렌더링, 풋터의 `autosaveStatus` 기반 span·state 제거 |
| `src/components/editor/DocumentEditor.test.tsx` | 신규 describe 블록(`헤더 저장 상태 표시(P17-15)`) 3개 테스트 추가, 기존 자동저장 성공 테스트의 주석/단언을 풋터 제거에 맞게 갱신 |
| `docs/product/prd.md` | P17-15 항목 추가 및 완료 표시 |

## 커밋 내역
| SHA | 메시지 |
|-----|--------|
| (커밋 예정 — 아래 산출물 참고) | feat: 저장 버튼 옆에 저장 상태 표시 추가 (P17-15) |

## 자체 검토 (Self-Review)
### 긍정 사항
- 기존에 이미 있던 `status`/`isDirty` 상태를 재사용해 새 state는 `lastSavedAt`
  하나만 추가했다 — 상태를 중복으로 관리하지 않는다.
- 풋터의 중복 상태 문구를 제거하면서 그 전용 state(`autosaveStatus`)까지 함께
  정리해, "두 곳이 서로 다른 시점을 보여줘 혼란을 준다"는 문제와 죽은 코드 둘 다
  없앴다.
- 임시 디버그 페이지에서 `getComputedStyle`로 실제 색상(변경사항 있음 → 회색
  `rgb(156,163,175)`, 저장됨 → 초록 `rgb(34,197,94)` = `text-success`)과 텍스트
  전환(수정 시 "변경사항 있음"으로, 저장 후 "저장됨 HH:MM"으로)을 직접 확인했다.

### 주의사항
- 좁은 화면(< `sm`, 640px)에서는 `SaveStatusIndicator`가 숨겨진다(`hidden sm:flex`)
  — 헤더의 아이콘 버튼들이 이미 빠듯한 모바일 오프캔버스 드로어 폭을 고려한
  선택이지만, 모바일에서는 상태 표시 자체를 볼 수 없다는 트레이드오프가 있다.
  저장 버튼 자체(아이콘)는 그대로 동작하므로 기능 손실은 아니다.
- 이 세션은 AX Auth 로그인 뒤에 있는 실제 `/editor/[pageId]`를 열 수 없어(P17-13/
  P17-14와 같은 제약), `DocumentEditor`를 독립 라우트에서 직접 마운트해 검증했다 —
  실제 화면에서 다른 헤더 버튼들과 시각적으로 잘 어울리는지는 사용자 확인 권장.

### 우려사항
- 없음 — 저장 버튼의 클릭 동작·비활성화 조건은 전혀 바꾸지 않았고, 기존 43개
  테스트(신규 3개 포함) 모두 통과해 회귀 위험이 낮다.
