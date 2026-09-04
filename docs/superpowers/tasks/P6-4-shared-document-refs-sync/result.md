# P6-4: 공유받은 문서 인덱스 기록 — 구현 결과 보고서

## 구현 내용
`src/lib/editor/sharing.ts`의 `shareDocument`/`unshareDocument`를 확장했다(P6-1이 남겨둔
나머지 절반). API 라우트나 UI는 여전히 이번 범위가 아니다(P6-3, 사용자 요청 대기).
- 시그니처 변경: `shareDocument(pageId, target: ShareTarget, document: SharedDocumentMeta)`,
  `unshareDocument(pageId, target: ShareTarget)`. `ShareTarget`은 대상 이메일과 계정 폴더
  ID, `SharedDocumentMeta`는 문서 소유자 이메일과 표시 제목이다.
- `shareDocument`가 문서의 `sharingMeta.sharedWith`에 이메일을 추가한 직후, 대상 계정 폴더의
  `sharedDocumentRefs`에 `{pageId, ownerEmail, documentTitle, sharedAt}`를 upsert한다(같은
  `pageId` 항목이 있으면 교체 — 재공유 시 제목 갱신 목적, 없으면 추가). 이미 공유돼 있으면
  (idempotent) 아무것도 쓰지 않는다 — 기존 P6-1 동작 그대로.
- `unshareDocument`가 `sharedWith`에서 제거한 직후, 대상 계정 폴더의 `sharedDocumentRefs`
  에서 해당 `pageId` 항목을 제거한다. 원래 없었으면(드리프트 등) 조용히 아무 것도 쓰지
  않는다.
- 두 내부 헬퍼 `upsertSharedDocumentRef`/`removeSharedDocumentRef`는 export하지 않는다 —
  `shareDocument`/`unshareDocument`를 통해서만 호출되는 구현 세부사항이다.

## 파일 변경 내역
| 파일 | 변경 사항 |
|------|---------|
| `src/lib/editor/sharing.ts`, `.test.ts` | `shareDocument`/`unshareDocument` 확장 |
| `docs/product/prd.md` | 체크리스트 P6-4 완료 표시 |

## 커밋 내역
| SHA | 메시지 |
|-----|--------|
| (PR에서 확인) | feat: 공유 시 상대방 sharedDocumentRefs도 함께 갱신 (Phase 6, P6-4) |

## 자체 검토 (Self-Review)
### 긍정 사항
- 실제 Confluence 인스턴스에 소유자 계정(기존 테스트 계정)과 임시 "수신자" 계정 폴더를 만들어
  공유 추가 → 양쪽 property(문서의 `sharingMeta`, 수신자의 `sharedDocumentRefs`) 반영 확인 →
  이미 공유된 상태에서 재호출(idempotent, 제목 갱신 안 됨) 확인 → 해제 → 양쪽에서 제거됨
  확인까지 end-to-end로 검증했다. 검증에 쓴 임시 문서와 수신자 계정 폴더는 모두 정리했다.
- `shareDocument`/`unshareDocument`의 시그니처를 바꿨지만, 실제 프로덕션 호출부(P6-3의
  API 라우트)가 아직 없어 하위 호환을 고려할 필요가 없었다 — P6-1이 만든 유닛 테스트만
  새 시그니처로 갱신했다.
- "이미 공유됨/이미 해제됨"과 "sharedDocumentRefs 쪽만 드리프트로 없어진 경우"를 각각 별도
  테스트로 나눠, 두 property가 항상 같은 트랜잭션 안에서만 바뀐다는 가정에 기대지 않고
  각자 독립적으로 idempotent하게 동작하는지 확인했다.

### 주의사항
- `shareDocument`는 이미 공유된 대상을 재호출해도 `sharedDocumentRefs`의 `documentTitle`을
  갱신하지 않는다(idempotent 체크가 `sharedWith` 포함 여부만 봄) — 문서 제목이 바뀐 뒤 이미
  공유된 상태에서 다시 공유해도 수신자 쪽 표시 제목은 갱신되지 않는다. `task.md`에도 명시한
  기존 결정(P6-1)을 그대로 유지한 것이고, 필요해지면 별도 결정으로 다룬다.

### 우려사항
- 없음.
