# P5-8: 계정 페이지 본문 가시성 — 구현 결과 보고서

## 구현 내용
- `src/lib/html-escape.ts`(신규) — `escapeHtml(value)`. `tiptap-to-storage.ts`에 이미 있는
  비공개 이스케이프 함수와 같은 규칙(`&`/`<`/`>`/`"`/`'`)이지만, 계정 도메인이 문서 렌더링
  모듈에 의존하지 않도록 작은 공유 유틸로 새로 뒀다.
- `src/lib/confluence/client.ts`에 `replacePageBody(pageId, bodyValue)` 추가 — `movePage`가
  이미 쓰는 "현재 페이지를 읽고 특정 필드만 바꿔 PUT" 패턴을 그대로 따른다(title은 유지,
  body만 교체).
- `src/lib/editor/account.ts` — `renderAccountFolderBody`/`syncAccountFolderBody` 추가.
  `saveAccountMeta`/`initializeAccountMeta`/`setAccessEnabled` 세 함수 모두, property 저장
  직후 계정 폴더 페이지 본문을 이름·팀·접속 허용·온보딩 완료 시각을 담은 표로 다시 그린다.
- `src/lib/editor/account-index.ts` — `renderAccountIndexBody`/`syncAccountIndexBody` 추가.
  `upsertAccountIndexEntry`가 property 저장 직후 "계정 관리" 페이지 본문을 전체 계정 목록
  표로 다시 그린다.
- 두 곳 모두 본문 갱신은 best-effort다 — 실패해도 로그만 남기고 property 저장(진짜 데이터)
  자체는 그대로 성공한다. 이름·팀처럼 사용자 자유 입력은 `escapeHtml`로 이스케이프해
  HTML 구조가 깨지거나 임의 마크업이 삽입되지 않는다.

## 파일 변경 내역
| 파일 | 변경 사항 |
|------|---------|
| `src/lib/html-escape.ts`, `.test.ts` | 신규 |
| `src/lib/confluence/client.ts`, `.test.ts` | `replacePageBody` 추가 |
| `src/lib/editor/account.ts`, `.test.ts` | 계정 폴더 본문 갱신 |
| `src/lib/editor/account-index.ts`, `.test.ts` | "계정 관리" 페이지 본문 갱신 |
| `docs/product/prd.md`, `docs/product/data-spec.md` | P5-8 신설, 본문 스냅샷 방식 기록 |

## 커밋 내역
| SHA | 메시지 |
|-----|--------|
| (PR에서 확인) | feat: 계정 페이지 본문에 관리자용 스냅샷 표시 (P5-8) |

## 자체 검토 (Self-Review)
### 긍정 사항
- 실제 Confluence 인스턴스로 end-to-end 검증했다 — 계정 정보 저장 시 계정 폴더 페이지
  본문이 표로 갱신됨을 확인했고, 특히 이름에 `<script>안드레이</script>`, 팀에 `AX&팀`처럼
  HTML 특수문자를 넣어도 본문에는 `&lt;script&gt;...`/`AX&amp;팀`으로 안전하게
  이스케이프됨을 직접 확인했다(검증 후 원래 값으로 복원). 접속 권한을 차단으로 바꾸면
  본문의 "접속 허용" 칸도 즉시 "차단"으로 바뀜을 확인했다. "계정 관리" 페이지 본문도 같은
  방식으로 전체 목록 표가 정상적으로 갱신됨을 확인했다.
- `movePage`가 이미 쓰던 patttern을 그대로 재사용해 `client.ts`에 새로운 패턴을 만들지
  않았다.
- 본문 갱신 실패가 실제 데이터 저장을 막지 않는다는 것도 유닛 테스트로 확인했다
  (`replacePageBody`가 reject해도 `saveAccountMeta`/`upsertAccountIndexEntry`는 정상
  resolve).

### 주의사항
- 계정 폴더/계정 관리 페이지 모두 이제 property 저장마다 추가로 `getPage` + `PUT` 2회
  API 호출이 늘었다(본문 갱신을 위해). 계정 정보 변경은 자주 일어나는 작업이 아니라
  (온보딩 1회, 이후 가끔 수정) 성능에 유의미한 영향은 없다고 판단했다.
- 본문은 어디까지나 참고용 스냅샷이고 진짜 데이터는 여전히 property다 — 이 문서(및 코드
  주석)에 반복해서 명시해뒀지만, 관리자가 실수로 Confluence에서 본문을 직접 고쳐도 아무
  효과가 없다는 점은 UI 안내 없이는 헷갈릴 수 있다(다음에 그 페이지의 property가 다시
  갱신되는 순간 본문이 덮어써진다).

### 우려사항
- 없음.
