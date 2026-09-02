# P1-7d: Word/Google Docs 붙여넣기 서식을 정제하는 로직을 추가한다 — 구현 결과 보고서

## 구현 내용
`RichTextEditor.tsx`에 `stripPastedInlineStyles(html)` 함수를 추가하고 `editorProps.transformPastedHTML`에 연결했다 — `DOMParser`로 붙여넣은 HTML을 파싱해 `[style]` 속성이 있는 모든 요소에서 그 속성을 제거한 뒤 다시 직렬화한다.

**이 항목이 실제로 막는 문제**: 단순한 "지저분한 마크업" 문제가 아니라, 이미 내려진 제품 결정(글자색을 정해진 스와치로만 제한 — 2026-08-26 결정)을 붙여넣기 경로가 조용히 우회하던 실제 버그였다. `@tiptap/extension-text-style`의 `TextStyle`/`Color`가 `style` 속성이 있는 아무 `<span>`이든 매치해 그 안의 `color`를 그대로 마크로 만든다는 것을 소스로 확인했고, Word·Google Docs는 텍스트 조각마다 `<span style="color:...">`를 촘촘히 붙여 내보내므로, 정제 없이는 붙여넣은 텍스트가 스와치 밖의 임의 색을 그대로 가지고 들어왔다.

**출처를 구분하지 않는다**: Word인지 Google Docs인지 감지해 다르게 처리하지 않고, 모든 외부 붙여넣기에서 인라인 스타일을 일괄 제거한다 — 이 에디터 스키마가 애초에 임의 인라인 스타일을 지원하지 않으므로 출처와 무관하게 같은 해법이 맞다고 판단했다.

**내부 복사-붙여넣기는 영향 없음**: 같은 브라우저 탭·세션 안에서 이 에디터 자신의 콘텐츠를 복사해 다시 붙여넣는 흔한 경우는, ProseMirror가 브라우저 클립보드 HTML을 실제로 재파싱하지 않고 원본 슬라이스를 그대로 재사용하는 내부 최적화 경로를 타므로 `transformPastedHTML` 자체가 호출되지 않는다 — 영향받는 것은 정말 외부에서 오는 붙여넣기뿐이다.

## 2026-09-02 사용자 실사용 확인 — 두 가지 발견

### 1) 태그 저장 404 (수정 완료, 이 PR에 포함)
"태그 저장 실패가 발생해"라는 보고를 받고 dev 서버 로그를 직접 확인해 `PUT /api/editor/documents/{새 pageId}/tags`가 문서 생성 직후 404를 반환하는 것을 재현 확인했다 — **이 항목(붙여넣기 서식 정제)과는 무관한, 별개의 기존 버그**다(오늘 작업 중 어떤 것도 태그·문서 생성 코드를 건드리지 않았다). 원인을 추적한 결과: `POST /api/editor/documents`가 성공 응답을 준 직후 그 pageId로 곧바로 태그를 저장하는데(`DocumentEditor.tsx`), `getTags`가 쓰는 Confluence 라벨 조회(`listLabels`)가 방금 생성된 페이지를 아직 인식하지 못하는 것으로 보인다 — 같은 요청의 `requireDocumentOwner`(페이지 속성 조회)는 통과하는데 그 다음 라벨 조회만 404가 나는 것이 정확히 이 패턴과 일치한다. `DocumentEditor.tsx`의 `saveTags`에 **새 문서 생성 직후에 한해서만** 짧은 재시도(최대 2회, 600ms/1200ms 간격)를 추가했다 — 기존 문서 수정 시의 404는 그대로 즉시 실패로 처리한다(그때는 진짜로 문서가 삭제된 경우일 수 있어, `getTags`의 기존 주석이 이미 그 이유를 설명하고 있다).

### 2) 이미지 붙여넣기가 조용히 사라짐 (원인 확인, 수정은 보류 — 사용자 확인 필요)
실제로 재현해서 확인한 결과: Word/Google Docs에서 이미지가 포함된 콘텐츠를 붙여넣으면, 이미지가 텍스트 노드로조차 안 만들어지는 게 아니라 **`<img>` 노드 자체는 정상적으로 만들어지지만, 그 `src`가 우리 페이지에서 로드할 수 없는 값**이라 화면에는 아무것도 안 보이는 것으로 확인했다:
- Word는 이미지를 로컬 파일 경로(`file:///C:/Users/.../image001.png`)로 참조한다 — 브라우저 보안 정책상 웹페이지가 사용자의 로컬 파일을 불러올 방법이 원천적으로 없다.
- Google Docs는 자체 호스팅 URL(`https://lh3.googleusercontent.com/...`)로 참조하는데, 접근 권한·CORS 정책에 따라 로드되지 않을 수 있다.

이건 이 세션이 만든 `stripPastedInlineStyles`(스타일 속성만 제거) 때문이 아니라는 것을 실제 파이프라인으로 직접 재현해 확인했다. **진짜 해법**은 붙여넣은 이미지를 우리 자신의 `uploadImage` 파이프라인으로 다시 업로드하는 것인데, 이건 클립보드의 파일(blob) 데이터를 직접 다뤄야 하고 붙여넣은 텍스트를 보존하면서 이미지만 따로 처리해야 해서 이번 "인라인 스타일 제거"보다 훨씬 큰 작업이다 — 이번 PR에는 포함하지 않았고, 사용자에게 범위(지금 고칠지, 별도 항목으로 미룰지)를 확인 중이다.

## 파일 변경 내역
| 파일 | 변경 사항 |
|------|---------|
| `src/components/editor/RichTextEditor.tsx` | `stripPastedInlineStyles` 함수 추가, `editorProps.transformPastedHTML`에 연결 |
| `src/components/editor/RichTextEditor.test.tsx` | 신규 테스트 1건(+ `firePasteHtml` 헬퍼) |
| `src/components/editor/DocumentEditor.tsx` | `saveTags`에 새 문서 생성 직후 한정 재시도 추가(태그 저장 404 수정) |
| `src/components/editor/DocumentEditor.test.tsx` | 신규 테스트 2건(재시도 성공 케이스, 기존 문서는 재시도 안 함 케이스) |
| `docs/product/prd.md` | P1-7d 체크리스트 완료 표시 |

## 커밋 내역
| SHA | 메시지 |
|-----|--------|
| `7d2f533` | fix: strip inline styles from external paste |
| `f42ea8b` | docs: record P1-7d commit SHA in result.md |
| (아래 참고) | fix: retry tag save once for a just-created document (사용자 실사용 확인 후 수정) |

## 자체 검토 (Self-Review)
### 긍정 사항
- "붙여넣기 서식 정제"를 막연한 청소 작업으로 다루지 않고, 이 프로젝트에 이미 있던 명시적 제품 결정(색상 스와치 제한)이 실제로 뚫려 있다는 구체적 증거를 소스 코드로 먼저 확인한 뒤 그 증거에 맞춰 고쳤다.
- 테스트를 작성하다 `@tiptap/extension-code-block`의 VS Code 붙여넣기 감지 플러그인이 무조건 `vscode-editor-data`를 읽어 `JSON.parse`한다는 사실을 발견했다 — 이건 실제 브라우저에서는 그 타입에 대해 항상 빈 문자열이 오므로 문제가 안 되지만, 테스트 mock을 성실하게(모든 타입에 같은 값을 돌려주도록) 짜면 오히려 예외가 나는 걸 직접 겪고 원인을 규명해 mock을 고쳤다.
- 붙여넣기 경로 밖(링크 스킴 검증)까지 손대지 않고, 이미 라이브러리가 해결한 부분은 소스로 확인한 뒤 범위 밖으로 명확히 선을 그었다 — 불필요한 중복 방어 코드를 추가하지 않았다.

### 주의사항
- 실제 Word/Google Docs 문서를 복사해 실제 화면에 붙여넣는 엔드투엔드 확인은 AX Auth 로그인 제약으로 이 세션에서 하지 못했다 — 컴포넌트 테스트로 "인라인 스타일이 있는 HTML을 붙여넣었을 때 정제되는가"만 확인했다(실제 Word 산출물의 HTML 구조를 100% 재현하지는 않았지만, 핵심 메커니즘 — `style` 속성이 있는 `<span>` — 은 Word/Google Docs 모두 실제로 이런 형태로 내보낸다는 것이 잘 알려진 사실이다).
- Word의 사이비 리스트(`mso-list`)를 진짜 리스트 구조로 되살리는 것은 범위 밖으로 뒀다 — 텍스트 내용은 보존되지만 리스트처럼 보이던 모양은 살아나지 않는다. 실사용 중 불편하다는 피드백이 오면 별도 항목으로 다룬다.

### 우려사항
- 없음.
