# P1-6a: 문서 제목 길이 상한을 서버에서 검증한다 — 구현 결과 보고서

## 구현 내용
`src/lib/editor/documents.ts`에 `MAX_TITLE_LENGTH = 200` 상수를 추가하고, `createDocument`/`updateDocument` 양쪽의 기존 "제목/본문 누락" 검증 바로 다음에 길이 검사를 추가했다 — `input.title.length > 200`이면 `ValidationError`를 던진다.

P0-7 이후 Confluence page의 실제 title은 내부 고유키(UUID)라 이 상한은 더 이상 Confluence의 title 길이 제약을 피하기 위한 값이 아니다 — 사용자가 입력한 제목은 `sourceDocument` content property(문자열 크기 제약이 훨씬 넉넉함)에 저장되므로, 이번 상한은 순수하게 화면 레이아웃·데이터 남용 방지를 위한 상식적인 기본값이다.

## 파일 변경 내역
| 파일 | 변경 사항 |
|------|---------|
| `src/lib/editor/documents.ts` | `MAX_TITLE_LENGTH` 상수 추가, `createDocument`/`updateDocument`에 길이 검증 추가 |
| `src/lib/editor/documents.test.ts` | 신규 테스트 4건(두 함수 × 201자 실패/200자 경계값 통과) |
| `docs/product/prd.md` | P1-6a 체크리스트 완료 표시 |

## 커밋 내역
| SHA | 메시지 |
|-----|--------|
| `dfc67d2` | fix: enforce 200-char max length on document titles |

## 자체 검토 (Self-Review)
### 긍정 사항
- P0-7 이후 이 항목의 성격이 "Confluence 하드 리밋 회피"에서 "순수 UX 가드레일"로 바뀌었다는 걸 `task.md`에 명시해, 왜 GitHub Issue 없이 값을 직접 정했는지 나중에도 추적 가능하게 했다.
- `createDocument`/`updateDocument` 양쪽에 동일한 검증을 빠짐없이 추가하고 경계값(200자 정확히)까지 테스트했다.

### 주의사항
- 클라이언트 쪽에는 아직 글자 수 안내나 사전 차단이 없다 — 사용자가 200자를 넘겨 입력하고 저장을 눌러야만 서버가 거부한다(범위 밖으로 명시).

### 우려사항
- 없음.
