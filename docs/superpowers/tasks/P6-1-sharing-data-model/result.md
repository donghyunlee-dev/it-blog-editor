# P6-1: 공유 데이터 모델 확장 — 구현 결과 보고서

## 구현 내용
`src/lib/editor/sharing.ts`(신규) — 순수 도메인 함수만 담은 모듈. API 라우트나 UI는
이번 범위가 아니다(`task.md`의 "범위 밖" 참고, P6-3부터).
- `getSharingMeta(pageId)` — 문서의 `sharingMeta` property를 읽는다. 없으면
  `{ sharedWith: [] }`(하위 호환 기본값).
- `shareDocument(pageId, email)` / `unshareDocument(pageId, email)` — `sharedWith` 배열만
  변경한다(둘 다 idempotent — 중복 추가·존재하지 않는 항목 제거를 조용히 무시). 기존
  `lastEditedBy`는 그대로 보존한다.
- `updateLastEditedBy(pageId, { email, name })` — `lastEditedBy`를 현재 시각으로 갱신한다.
  P6-7(문서 저장 시 호출)에서 실제로 배선할 예정이며, 이번 항목에서는 함수만 준비했다.
- `getSharedDocumentRefs(accountFolderId)` — 계정 폴더의 `sharedDocumentRefs`를 읽는다.
  없으면 빈 배열. 쓰기 경로(공유 시 상대방 인덱스에 기록)는 P6-4에서 연결한다.

## 파일 변경 내역
| 파일 | 변경 사항 |
|------|---------|
| `src/lib/editor/sharing.ts`, `.test.ts` | 신규 |
| `docs/product/prd.md` | 체크리스트 P6-1 완료 표시 |

## 커밋 내역
| SHA | 메시지 |
|-----|--------|
| (PR에서 확인) | feat: add sharing domain model (Phase 6, P6-1) |

## 자체 검토 (Self-Review)
### 긍정 사항
- 실제 Confluence 인스턴스에 임시 문서를 만들어 `shareDocument`(중복 추가 idempotent
  포함)→`updateLastEditedBy`→`unshareDocument`(idempotent 포함)→`getSharedDocumentRefs`까지
  실제 API 호출로 end-to-end 검증했고, 검증에 쓴 임시 문서는 삭제(휴지통 이동)했다.
- P6-1과 P6-4의 범위를 PRD 체크리스트가 이미 나눠둔 대로 지켰다 — `shareDocument`가
  `sharedDocumentRefs`까지 함께 갱신하도록 미리 만들지 않고, 두 property를 각각 읽고 쓰는
  순수 함수로만 남겨 다음 항목이 자연스럽게 이어받을 수 있게 했다.
- `account.ts`/`account-index.ts`와 마찬가지로 권한 검사 없이 순수 데이터 계층만 두어,
  나중에 API 라우트(P6-3)가 소유자 검증 등을 자체적으로 처리하도록 관례를 유지했다.

### 주의사항
- `sharedWith` 변경은 문서의 `sharingMeta` property 하나를 읽고 통째로 다시 쓰는 방식이라,
  동시에 두 사람에게 공유를 추가하면 경쟁 상황에서 한쪽이 유실될 수 있다 — `accountIndex`와
  같은 이미 알려진 한계이고, 이번 범위에서 새로 만든 문제는 아니다.

### 우려사항
- 없음.
