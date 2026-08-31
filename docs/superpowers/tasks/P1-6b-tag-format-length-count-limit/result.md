# P1-6b: 태그 형식·길이·개수 상한을 서버에서 검증한다 — 구현 결과 보고서

## 구현 내용
`src/lib/editor/tags.ts`의 `setTags`에 검증을 추가했다.

- **개수**: 태그가 20개를 초과하면 `ValidationError`.
- **길이**: 태그 하나가 50자를 초과하면 `ValidationError`(Confluence 자체 상한인 255자보다 훨씬 보수적).
- **빈 값**: 빈 문자열/공백만 있는 태그는 `ValidationError` — 클라이언트(`TagInput.tsx`)가 이미 걸러주지만, API를 직접 호출하는 다른 클라이언트를 막을 방어 계층이 없었다.
- **형식**: Confluence 라벨이 실제로 허용하지 않는 특수문자(`:`, `?`, `@` — [공식 문서](https://support.atlassian.com/confluence-cloud/docs/use-labels-to-organize-your-content/)로 확인)가 포함되면 Confluence API를 호출하기 전에 사전 차단한다. 공백→하이픈, 대문자→소문자 자동 변환은 Confluence의 정상 동작이라 막지 않았다.
- 사전 검사를 통과했는데도 Confluence가 형식 문제로 400을 반환하면(미처 몰랐던 다른 제약), 분류되지 않은 502 대신 `ValidationError`로 바꿔서 던진다 — Confluence의 라벨 형식 규칙 전체를 재구현하는 대신, 이미 알려진 규칙만 사전 차단하고 나머지는 Confluence의 판단을 신뢰하되 사용자 메시지만 명확하게 바꾼다.

**부수 작업(사용자 요청)**: `TagInput.tsx`의 디자인을 함께 다듬었다 — ① placeholder를 "태그 입력"(사용 안내문)에서 "예: React, Backend"(실제 예시, 이 프로젝트의 다른 필드들과 같은 "예: ..." 관례)로 바꿨다. ② 태그 입력 영역 전체를 테두리+배경(`rounded-input border border-border bg-surface`)으로 감싸고 위에 "태그" 캡션을 붙여, 제목/본문과 같은 "박스 없는 캔버스" 위에서도 이 영역만큼은 명확히 구획되게 했다. 포커스 시 강조(`focus-within:border-brand focus-within:ring-2 focus-within:ring-brand`)는 이 프로젝트의 다른 입력(사이드바 검색창, 슬래시 메뉴 입력)과 동일한 패턴을 그대로 따랐다.

## 파일 변경 내역
| 파일 | 변경 사항 |
|------|---------|
| `src/lib/editor/tags.ts` | `assertValidTags`(개수/길이/빈 값/금지 문자 검사) 추가, `addLabels` 400 응답을 `ValidationError`로 변환 |
| `src/lib/editor/tags.test.ts` | 신규 테스트 8건 |
| `src/components/editor/TagInput.tsx` | placeholder 변경, 테두리+배경+캡션으로 디자인 강조 |
| `src/components/editor/TagInput.test.tsx`, `DocumentEditor.test.tsx` | placeholder 문자열 변경에 맞춰 테스트 셀렉터 갱신 |
| `src/components/editor/DocumentEditor.tsx` | 제목 관련 주석의 P0-7 이전 서술("Confluence 페이지 제목으로 그대로 쓰임") 정정(문서-코드 드리프트 정리, P2-2와 같은 종류) |
| `docs/product/prd.md` | P1-6b 체크리스트 완료 표시 |

## 커밋 내역
| SHA | 메시지 |
|-----|--------|
| `2e660c0` | fix: validate tag format/length/count on the server, emphasize TagInput design |

## 자체 검토 (Self-Review)
### 긍정 사항
- 금지 문자(`:`, `?`, `@`)를 추측하지 않고 Confluence 공식 문서로 확인한 뒤 적용했다.
- "완전한 형식 규칙 재구현" 대신 "알려진 규칙 사전 차단 + Confluence의 400을 신뢰해 사용자 메시지만 변환"이라는 이중 방어를 택해, 우리가 놓친 규칙이 있어도 최소한 사용자에게는 항상 명확한 400이 가게 했다.
- 사용자가 요청한 UI 개선(샘플 텍스트, 디자인 강조)을 이 프로젝트의 기존 관례(다른 입력의 focus 스타일, "예: ..." placeholder 패턴)를 그대로 재사용해 일관성을 지켰다.
- 지나가다 발견한 문서-코드 드리프트(제목이 더 이상 Confluence page title로 쓰이지 않는다는 P0-7 변경이 주석에 반영 안 됨)를 같이 정리했다.

### 주의사항
- TagInput의 시각적 변경은 AX Auth 로그인이 필요해 이 세션에서 직접 로그인 화면으로 확인하지 못했다 — 컴포넌트 테스트(placeholder·클릭 동작)로만 검증했다. 실제 화면에서 디자인이 의도대로 보이는지는 사용자 확인이 필요하다.
- 개수(20개)·길이(50자) 상한은 GitHub Issue 없이 직접 정한 값이라, 실사용 중 너무 빡빡하다는 피드백이 나오면 상수 하나만 조정하면 된다.

### 우려사항
- 없음.
