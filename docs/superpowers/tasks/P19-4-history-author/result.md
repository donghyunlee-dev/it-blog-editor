# P19-4: 이력에 작성자 표시 — 구현 결과

## 구현 내용
- `src/lib/confluence/client.ts`의 `updatePage`에 `message?: string`을 추가하고, 항상
  `version.message`로 전송한다(없으면 빈 문자열 — 기존 호출부와 하위 호환).
- `src/lib/editor/documents.ts`의 `updateDocument`가 `updatePage` 호출 시
  `formatAccountLabel(input.editor.email, input.editor.name)`("이름(이메일)")을 `message`로
  전달한다. `DocumentVersion`에 `author: string | null` 필드를 추가하고,
  `getDocumentVersionHistory`가 `version.message`를 매핑한다(빈 문자열은 `null`).
- `src/components/editor/VersionHistoryPage.tsx`가 각 버전 행에 작성자(없으면 "작성자 정보
  없음")를 표시한다.

## 파일 변경 내역
| 파일 | 변경 사항 |
|------|---------|
| `src/lib/confluence/client.ts` | `updatePage`에 `message` 파라미터 추가 |
| `src/lib/editor/documents.ts` | `updateDocument`가 저장자 정보를 `message`로 전달, `DocumentVersion.author` 추가 |
| `src/components/editor/VersionHistoryPage.tsx` | 버전 행에 작성자 표시 |
| `src/lib/editor/documents.test.ts` | `updateDocument` message 전달 검증, `getDocumentVersionHistory` 신규 테스트 |
| `src/components/editor/VersionHistoryPage.test.tsx` | 작성자 표시/미표시 케이스 추가 |
| `src/app/api/editor/documents/[pageId]/versions/route.test.ts` | `DocumentVersion.author` 필드 추가로 인한 타입 오류 수정 |

## 커밋 내역
| SHA | 메시지 |
|-----|--------|
| `52efebb` | feat: 문서 이력에 저장한 사람 표시 (P19-4) |

## 자체 검토 (Self-Review)
### 긍정 사항
- 새 content property나 별도 저장 구조 없이, Confluence 버전 API가 이미 지원하는
  `version.message`(버전 코멘트) 필드를 재활용해 최소 변경으로 구현했다.
- 처음에 "authorId만 매핑하면 된다"고 잘못 판단했던 것을 실제 API로 검증해 바로잡고,
  사용자에게 한계(과거 버전 소급 불가)를 먼저 설명한 뒤 진행했다.

### 주의사항
- 이 기능 적용 이전에 저장된 버전은 영구히 "작성자 정보 없음"으로 남는다 — 소급 채우기는
  불가능하다(task.md에 명시).
- `version.message`는 Confluence UI에서도 "이 버전에 대한 코멘트"로 노출되는 필드라, 사용자가
  Confluence를 직접 열어보면(P0-7 결정상 원래는 아무도 열어보지 않는 DB 취급이지만) 이
  문구가 보일 수 있다 — 개인 이메일이 그대로 남는다는 점은 사내 도구 성격상 문제되지
  않는다고 판단했다.

### 우려사항
- 없음.
