# P1-1a 후속: Ctrl+K 검색 팝업 Notion 스타일 재구성 — 구현 결과 보고서

## 구현 내용
- **서버 스니펫 계산(`src/lib/editor/documents.ts`)**: `DocumentSearchResult`에 `snippet: string`을
  추가하고 `buildSnippet(bodyText, normalizedQuery)`를 새로 작성했다. 검색어가 본문에 있으면 그
  앞뒤 문맥(매치 앞 40자부터 총 140자)을, 없으면(제목·태그만 일치) 본문 맨 앞 140자를 잘라
  보여준다. 본문이 비어 있으면 빈 문자열을 반환해 클라이언트가 "본문 미리보기가 없습니다."로
  대체 표시하게 했다.
- **`GlobalSearchModal` 전면 재작성**: 기존 단일 목록 팝업을 Notion 캡처와 가깝게 좌측 결과 목록
  + 우측 미리보기의 2단 레이아웃으로 바꿨다.
  - `@sfood/ui`의 `Modal`은 `size`가 최대 `max-w-2xl`까지만 지원해 이 폭(`max-w-4xl`)을 담을 수
    없어 커스텀 오버레이를 만들고, `Modal`의 포커스 트랩·body 스크롤 잠금·Escape·배경 클릭 닫기
    동작을 그대로 재현했다(이유는 `docs/product/design.md`의 "Ctrl+K 검색 팝업" 절에 기록).
  - "제목만" 필터 토글 — 서버 재조회 없이 클라이언트에서 `title`만 다시 필터링.
  - 결과를 `updatedAt` 기준 오늘/어제/최근 7일/이전 4개 구간으로 그룹핑(`groupByRecency`),
    빈 구간은 숨긴다.
  - 각 결과 행: 기존 `StatusIcon`(게시/초안) + 굵은 제목 + (태그가 있으면) " — 태그, 태그".
  - 우측 패널: 강조된(하이라이트된) 문서의 태그(`Tag`)·제목·본문 스니펫을 보여주고, 방향키로
    강조를 옮기면 함께 갱신된다.
  - 키보드 탐색용 인덱스는 렌더 중 변수를 mutate하지 않도록 `useMemo`로 만든
    `flatIndexByPageId` 맵에서 조회한다(`react-hooks/immutability` 규칙 준수).

## 파일 변경 내역
| 파일 | 변경 사항 |
|------|---------|
| `src/lib/editor/documents.ts` | `DocumentSearchResult.snippet` 추가, `buildSnippet` 신규, `searchDocuments`가 `snippet` 포함하도록 수정 |
| `src/lib/editor/documents.test.ts` | 스니펫 테스트 3건 추가 |
| `src/app/api/editor/documents/search/route.test.ts` | mock·기대값에 `snippet` 필드 추가(타입 에러 수정) |
| `src/components/editor/GlobalSearchModal.tsx` | 전면 재작성 — 커스텀 오버레이, 2단 레이아웃, 그룹핑, "제목만" 필터, 미리보기 패널 |
| `src/components/editor/GlobalSearchModal.test.tsx` | 전면 재작성(10건) |
| `docs/product/design.md` | "Ctrl+K 검색 팝업 — Modal을 쓰지 않은 이유" 절 신규 |
| `docs/product/prd.md` | "문서 전체 검색(Ctrl+K)" 기능 블록·P1-1a 체크리스트 항목·상단 진행률 요약 갱신 |

## 커밋 내역
| SHA | 메시지 |
|-----|--------|
| `3d89d8b` | feat: Ctrl+K 검색 팝업을 Notion 스타일 2단 레이아웃으로 재구성 |

## 자체 검토 (Self-Review)
### 긍정 사항
- 스니펫 계산을 서버에 둬서(클라이언트가 본문 원문을 통째로 받지 않음) 응답 크기를 필요한 만큼만
  키웠다 — `listDocuments()`가 이미 조회하던 본문을 검색 시점에만 잘라서 내려준다.
- `Modal`을 억지로 쓰지 않고 실제 타입 제약(`size` 최대 `max-w-2xl`)을 근거로 커스텀 오버레이를
  선택한 뒤 CLAUDE.md의 "① 대응 요소 없으면 대체 구성" 원칙대로 design.md에 이유를 남겼다.
- 키보드 탐색 로직을 렌더 중 mutation 없이 순수하게(`useMemo` 맵 조회) 재작성해 기존 lint 규칙
  (`react-hooks/immutability`)을 어기지 않았다.

### 주의사항
- "제목만" 필터는 서버 재조회 없이 클라이언트 필터링이라, 서버가 이미 걸러 온 결과(제목·태그·본문
  전체 매치) 안에서만 다시 좁힌다 — 예를 들어 제목엔 없지만 본문에만 있는 문서는애초에 서버 응답에
  포함되므로 "제목만"을 꺼도 이미 와 있는 목록에서 골라내는 방식이다(추가 API 호출 없음, 의도된
  동작).
- Notion 캡처의 "생성자"/"검색 범위" 필터, 즐겨찾기는 이 앱의 데이터 모델(계정별 개인 폴더,
  즐겨찾기 기능 없음)에 대응 개념이 없어 범위에서 제외했다 — task.md에 명시, 사용자에게 사전 고지.

### 우려사항
- AX Auth 로그인 제약으로 실제 로그인 후 Ctrl+K를 눌러 시각적으로 확인하지는 못했다(이 프로젝트의
  기존 제약과 동일) — 대신 컴포넌트 테스트 10건으로 그룹핑·필터·미리보기·키보드 탐색을 실제 DOM
  이벤트로 검증했다.
