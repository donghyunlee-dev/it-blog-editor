# P1-7d: Word/Google Docs 붙여넣기 서식을 정제하는 로직을 추가한다 — 검증 기록

## 자동화 테스트
| 커맨드 | 결과 |
|---|---|
| `npx vitest run src/components/editor/RichTextEditor.test.tsx -t "붙여넣기"` | 통과 (1/1) |
| `npm test`(전체) | 통과 (265/265) |
| `npx tsc --noEmit` | 통과 |
| `npm run lint` | 통과 — 에러 0, 경고 2(기존 무관 경고) |
| `npm run build` | 통과 |

## 수동 검증
### 실제 인스턴스/브라우저 확인
dev 서버(`http://localhost:3100`)를 확인해 컴파일 에러가 없음을 확인했다. AX Auth 로그인 제약으로 이 세션에서 직접 로그인해 실제 Word/Google Docs 문서를 복사해 붙여넣는 엔드투엔드 확인은 하지 못했다 — **실제 화면에서 Word/Google Docs 콘텐츠를 붙여넣었을 때 색상·폰트가 새어 들어오지 않는지 사용자 확인이 필요하다.**

### 대안으로 수행한 검증
- `RichTextEditor.test.tsx`에 실제 `paste` DOM 이벤트를 시뮬레이션해(`text/html`에 인라인 스타일이 있는 span 포함), 실제 `transformPastedHTML` → ProseMirror 파싱 파이프라인을 그대로 통과시킨 뒤 결과 문서에 `style` 속성을 가진 요소가 없고 텍스트는 보존되는지 확인했다.
- `TextStyle`/`Color` 마크의 `parseHTML` 구현(`node_modules/@tiptap/extension-text-style`)을 직접 읽어 "style이 있는 span이면 무조건 매치한다"는 실제 동작을 확인한 뒤, 그 동작을 그대로 재현하는 테스트를 작성했다.

## 발견된 문제와 조치
- **원인**: 테스트 작성 중 `SyntaxError: Unexpected token '외', "외부 텍스트" is not valid JSON`이 발생했다. `@tiptap/extension-code-block`의 VS Code 붙여넣기 감지 플러그인이 `clipboardData.getData('vscode-editor-data')`를 무조건 호출해 그 값을 `JSON.parse`하는데, 테스트 mock의 `getData`가 모든 타입에 같은 텍스트를 돌려주고 있어 이 호출에도 "외부 텍스트"가 반환되면서 파싱에 실패했다.
- **조치**: mock의 `getData`가 `text/html`/`text/plain` 외의 타입에는 빈 문자열을 돌려주도록 고쳤다(실제 브라우저에서 `vscode-editor-data`는 VS Code에서 복사한 경우에만 채워지고 그 외에는 항상 빈 문자열이므로, 이 수정이 실제 동작과 더 정확히 일치한다).
- **재검증 결과**: `npx vitest run src/components/editor/RichTextEditor.test.tsx -t "붙여넣기"` 1/1 통과.

## 2026-09-02 사용자 실사용 확인 후 발견·조치

### 태그 저장 404 (조치 완료)
- **원인**: dev 서버 로그에서 `PUT /api/editor/documents/{새 pageId}/tags` 404를 직접 확인했다. 새 문서 생성(`POST`) 직후 그 pageId로 곧바로 태그를 저장하는데, Confluence의 라벨 조회(`listLabels`)가 방금 생성된 페이지를 아직 인식하지 못하는 것으로 보인다.
- **조치**: `DocumentEditor.tsx`의 `saveTags`에 `retryOnNotFound` 옵션을 추가하고, `mode === "create"`일 때만 켰다 — 404를 받으면 600ms/1200ms 간격으로 최대 2회 재시도한다.
- **재검증 결과**: 신규 테스트 2건 추가 — (1) 새 문서 생성 직후 첫 태그 저장이 404, 재시도한 두 번째 요청이 성공하면 "저장되었습니다." 성공 토스트가 뜨는지, (2) 기존 문서 수정 시 태그 저장이 404면 재시도 없이 요청이 정확히 1번만 나가고 바로 경고 토스트가 뜨는지. `npx vitest run src/components/editor/DocumentEditor.test.tsx -t "태그 저장"` 4/4 통과, `npm test`(전체) 267/267, `npx tsc --noEmit`·`npm run lint`(경고 2건, 기존 무관)·`npm run build` 모두 통과.

### 이미지 붙여넣기 실패 (원인 확인, 수정 보류)
- **재현**: `RichTextEditor`에 실제 paste 이벤트로 Word 스타일 HTML(`<img src="file:///...">`)과 Google Docs 스타일 HTML(`<img src="https://lh3.googleusercontent.com/...">`)을 각각 시뮬레이션해, 실제 파이프라인(`transformPastedHTML` → ProseMirror 파싱)을 그대로 통과시킨 뒤 결과 DOM을 직접 확인했다(스크래치 테스트, 커밋하지 않고 확인 후 삭제).
- **결과**: 두 경우 모두 `<img>` 노드 자체는 정상적으로 만들어졌다(`stripPastedInlineStyles`가 이미지를 지우는 게 아님을 확인) — 다만 `src`가 로컬 파일 경로(Word)이거나 외부 호스팅 URL(Google Docs)이라, 우리 페이지에서 실제로 로드되지 않아 화면에는 아무것도 안 보이는 것으로 보인다.
- **판단**: 진짜 해법(클립보드의 실제 이미지 파일 데이터를 우리 `uploadImage` 파이프라인으로 재업로드)은 이번 "인라인 스타일 제거"보다 범위가 훨씬 크다 — 이번 PR에는 포함하지 않고, 사용자에게 지금 처리할지 별도 항목으로 미룰지 확인 중이다.

## 검증 중 새로 발견한 결정 사항
없음(태그 저장 재시도 값은 P0-4b/P1-6a와 같은 근거로 GitHub Issue 없이 직접 정함).

## 최종 판정
- [x] 수용 기준(`task.md`)을 모두 만족함 — 인라인 스타일 제거(원래 범위)와 태그 저장 404(실사용 중 발견해 같은 PR에 포함) 모두 조치 완료
- [ ] 🔶 실제 Word/Google Docs 문서를 붙여넣는 엔드투엔드 확인은 AX Auth 제약으로 하지 못함 — 사용자 확인 요청
- [ ] 🔶 이미지 붙여넣기 실패는 원인만 확인했고 수정은 사용자 확인 후 별도로 진행
