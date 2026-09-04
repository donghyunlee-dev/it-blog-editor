# P5-4: 계정 정보 수정 팝업 — 구현 결과 보고서

## 구현 내용
- `src/components/editor/AccountInfoModal.tsx`를 신설했다 — `DeletedDocumentsModal.tsx`와 같은 로딩/에러/성공 3상태 패턴으로 `GET /api/editor/account`를 조회하고, 성공하면 이메일(읽기전용 `Input`)·이름·팀(`FormField`+`Input`)을 보여준다. 저장은 `PUT /api/editor/account`를 호출하고 성공/실패 모두 `Toast`로 안내한다(CLAUDE.md 규칙 — 인라인 텍스트 대신 Toast). 저장 성공 시에도 Modal을 자동으로 닫지 않는다 — 온보딩(P5-2)과 달리 강제 흐름이 아니므로 사용자가 직접 닫게 둔다.
- `src/components/editor/EditorSidebar.tsx`의 하단 계정 표시(이메일)를 `<span>`에서 `<button type="button">`으로 바꿔 계정 정보 Modal을 여는 진입점으로 만들었다 — 로그아웃 버튼과 같은 hover 스타일을 줘 클릭 가능함을 알린다. `accountInfoOpen` 상태와 `<Modal><AccountInfoModal /></Modal>`을 기존 "삭제된 문서" Modal 옆에 추가했다.

## 파일 변경 내역
| 파일 | 변경 사항 |
|------|---------|
| `src/components/editor/AccountInfoModal.tsx` | 신규 |
| `src/components/editor/AccountInfoModal.test.tsx` | 신규 — 5건(로딩/성공/조회실패/저장성공/저장실패) |
| `src/components/editor/EditorSidebar.tsx` | 이메일을 클릭 가능한 진입점으로, `AccountInfoModal` Modal 마운트 |
| `docs/product/prd.md` | 체크리스트 P5-4 완료 표시 |

## 커밋 내역
| SHA | 메시지 |
|-----|--------|
| (PR에서 확인) | feat: add an account info popup opened from the sidebar (Phase 5, P5-4) |

## 자체 검토 (Self-Review)
### 긍정 사항
- 새 API를 만들지 않고 P5-2에서 이미 만든 `GET`/`PUT /api/editor/account`를 그대로 재사용했다 — 두 항목이 같은 API를 공유하도록 설계했던 것이 그대로 맞아떨어졌다.
- 임시 라우트(fetch를 클라이언트에서 스텁)로 실제 렌더링 + 저장 클릭까지 확인해, 정적 스크린샷 이상으로 실제 상호작용(성공 Toast가 뜨고 Modal이 열린 채로 남는 것)까지 검증했다.

### 주의사항
- `AccountInfoModal`은 이름·팀이 반드시 채워져 있는 상태(이미 온보딩을 마친 계정)에서만 열린다고 가정한다 — 온보딩 미완료 계정은 애초에 `/welcome`으로 리다이렉트되어 `/editor`에 도달하지 못하므로(P5-2) 이 팝업 자체를 열 수 없다.

### 우려사항
- 없음.
