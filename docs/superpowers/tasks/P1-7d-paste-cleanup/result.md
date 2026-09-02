# P1-7d: Word/Google Docs 붙여넣기 서식을 정제하는 로직을 추가한다 — 구현 결과 보고서

## 구현 내용
`RichTextEditor.tsx`에 `stripPastedInlineStyles(html)` 함수를 추가하고 `editorProps.transformPastedHTML`에 연결했다 — `DOMParser`로 붙여넣은 HTML을 파싱해 `[style]` 속성이 있는 모든 요소에서 그 속성을 제거한 뒤 다시 직렬화한다.

**이 항목이 실제로 막는 문제**: 단순한 "지저분한 마크업" 문제가 아니라, 이미 내려진 제품 결정(글자색을 정해진 스와치로만 제한 — 2026-08-26 결정)을 붙여넣기 경로가 조용히 우회하던 실제 버그였다. `@tiptap/extension-text-style`의 `TextStyle`/`Color`가 `style` 속성이 있는 아무 `<span>`이든 매치해 그 안의 `color`를 그대로 마크로 만든다는 것을 소스로 확인했고, Word·Google Docs는 텍스트 조각마다 `<span style="color:...">`를 촘촘히 붙여 내보내므로, 정제 없이는 붙여넣은 텍스트가 스와치 밖의 임의 색을 그대로 가지고 들어왔다.

**출처를 구분하지 않는다**: Word인지 Google Docs인지 감지해 다르게 처리하지 않고, 모든 외부 붙여넣기에서 인라인 스타일을 일괄 제거한다 — 이 에디터 스키마가 애초에 임의 인라인 스타일을 지원하지 않으므로 출처와 무관하게 같은 해법이 맞다고 판단했다.

**내부 복사-붙여넣기는 영향 없음**: 같은 브라우저 탭·세션 안에서 이 에디터 자신의 콘텐츠를 복사해 다시 붙여넣는 흔한 경우는, ProseMirror가 브라우저 클립보드 HTML을 실제로 재파싱하지 않고 원본 슬라이스를 그대로 재사용하는 내부 최적화 경로를 타므로 `transformPastedHTML` 자체가 호출되지 않는다 — 영향받는 것은 정말 외부에서 오는 붙여넣기뿐이다.

## 파일 변경 내역
| 파일 | 변경 사항 |
|------|---------|
| `src/components/editor/RichTextEditor.tsx` | `stripPastedInlineStyles` 함수 추가, `editorProps.transformPastedHTML`에 연결 |
| `src/components/editor/RichTextEditor.test.tsx` | 신규 테스트 1건(+ `firePasteHtml` 헬퍼) |
| `docs/product/prd.md` | P1-7d 체크리스트 완료 표시 |

## 커밋 내역
| SHA | 메시지 |
|-----|--------|
| `7d2f533` | fix: strip inline styles from external paste |

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
