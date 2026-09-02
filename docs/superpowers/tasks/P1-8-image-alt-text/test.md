# P1-8: 삽입된 이미지에 대체 텍스트(alt) 입력 UI 추가 — 검증 기록

## 자동화 테스트
| 커맨드 | 결과 |
|---|---|
| `npm test -- tiptap-to-storage` | 통과 (24/24, alt 직렬화 신규 4건 포함) |
| `npm test -- RichTextEditor` | 통과 (18/18, alt UI 신규 4건 포함) |
| `npm test` (전체) | 통과 (275/275) |
| `npm run lint` | 통과 (기존에도 있던 `postcss.config.js`/`tailwind.config.js`의 `import/no-anonymous-default-export` 경고 2건만 남음, 이번 변경과 무관) |
| `npm run build` | 통과 (Turbopack 컴파일·TypeScript 검사·정적 페이지 생성 모두 성공) |

## 수동 검증 (필요 시)
- AX Auth(사내 SSO) 로그인 제약으로 이 세션에서 실제 화면에 로그인해 이미지 클릭 → alt 입력 → 저장까지 눈으로 확인하지는 못했다(P1-7a/b/c/d와 동일한 제약).
- 대신 자동화 테스트에서 실제 렌더링된 DOM을 검증했다: `imageFirstDoc()`으로 문서 첫 노드를 이미지로 만들면 ProseMirror의 초기 선택(`Selection.atStart`)이 그 이미지를 NodeSelection으로 선택한다는 것을 `class="ProseMirror-selectednode"` 렌더링으로 실측 확인했고(`tableFirstDoc`과 동일한 원리), 여기에 `.focus()`만 추가로 호출해 실사용(이미지 클릭 시 자연히 함께 발생하는 에디터 포커스)과 동등한 조건을 재현했다.

## 발견된 문제와 조치
- **원인**: `ImageBubbleMenu`를 처음 구현했을 때 `useEditorState`로 "이미지가 선택됐는가"만 판단해 조건부 렌더링했는데, 렌더링 자체는 됐지만 alt 입력 UI가 화면(테스트 DOM)에 나타나지 않았다. `@tiptap/extension-bubble-menu`의 기본 `shouldShow`가 별도로 `view.hasFocus()`를 요구하는데, `render()`만으로는 jsdom이 에디터를 자동으로 포커스하지 않아 이 내부 게이트가 계속 `false`를 반환하고 있었다(React 트리에 `<BubbleMenu>`가 마운트된 것과, 그 내부 플러그인이 실제로 메뉴를 보여줄지 판단하는 `shouldShow`는 서로 다른 별개의 게이트라는 것을 처음엔 혼동했다).
- **조치**: 테스트에서 렌더링 직후 `.focus()`를 명시적으로 호출해, 실사용에서 이미지를 클릭하는 행위가 NodeSelection 생성과 동시에 에디터 포커스도 만든다는 사실을 재현했다. 프로덕션 코드는 수정하지 않았다(실제 브라우저에서는 클릭이 이 두 가지를 자연히 함께 만들어 문제가 되지 않는다 — 테스트 환경만의 간극이었다).
- **재검증 결과**: `.focus()` 추가 후 4건 모두 통과.

## 검증 중 새로 발견한 결정 사항
없음.

## 최종 판정
- [x] 수용 기준(`task.md`)을 모두 만족함 — PRD 갱신 가능
  - 이미지 선택 시 alt 입력 UI 노출: 확인(자동화 테스트)
  - 적용 시 노드 속성 갱신·재로드 후 유지(TipTap JSON에 반영): 확인(`onChange` 콜백으로 전달되는 JSON 검증)
  - 에디터 렌더링에서 실제 `<img alt="...">` 반영: 확인(DOM 검증)
  - Confluence storage format `<ac:image ac:alt="...">` 직렬화(첨부파일/외부 URL 두 경로): 확인
  - alt 선택 사항(빈 값 허용, 에러 없음): 확인(빈 값 제출 시 `alt: null`로 정리, 별도 검증 오류 없음 — 기존 필수 항목류 ValidationError와 달리 이 값은 애초에 검증 대상이 아님)
  - 이미지 선택 시 텍스트 서식 메뉴 미노출, 반대의 경우도 동일: 확인
