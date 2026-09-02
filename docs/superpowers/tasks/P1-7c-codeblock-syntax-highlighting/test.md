# P1-7c: 코드블록에 문법 강조를 추가한다 — 검증 기록

## 자동화 테스트
| 커맨드 | 결과 |
|---|---|
| `npx vitest run src/components/editor/RichTextEditor.test.tsx -t "코드블록"` | 통과 (1/1) |
| `npm test`(전체) | 통과 (264/264) |
| `npx tsc --noEmit` | 통과 |
| `npm run lint` | 통과 — 에러 0, 경고 2(기존 무관 경고) |
| `npm run build` | 통과 |

## 수동 검증
### 실제 인스턴스/브라우저 확인
dev 서버(`http://localhost:3100`)를 확인해 컴파일 에러가 없음을 확인했다. AX Auth 로그인 제약으로 이 세션에서 직접 로그인해 코드블록에 실제로 색이 입혀지는 모습을 육안으로 확인하지는 못했다 — **실제 화면에서 코드블록을 만들고 강조가 보이는지 사용자 확인이 필요하다.**

### 대안으로 수행한 검증
- `RichTextEditor.test.tsx`에 실제 `CodeBlockLowlight` + `lowlight` 확장이 적용된 `RichTextEditor`를 렌더링해, `codeBlock` 노드 안 텍스트가 실제로 `hljs-*` 클래스를 가진 `<span>`으로 감싸지는지 확인했다 — mock이 아니라 실제 lowlight 강조 파이프라인을 그대로 통과시킨 결과다.
- 설치 전 `npm view`로 `@tiptap/extension-code-block-lowlight`의 여러 버전(3.30.2 vs 3.31.0)의 peerDependencies를 비교해, 이 프로젝트의 다른 `@tiptap/*` 패키지 버전(3.30.2)과 정확히 맞는 버전을 선택했다 — 설치 후 `node_modules`에서 실제 설치된 버전도 재확인했다.

## 검증 중 새로 발견한 결정 사항
없음.

## 최종 판정
- [x] 수용 기준(`task.md`)을 모두 만족함
- [ ] 🔶 실제 화면에서의 시각적 확인(색상 대비·가독성)은 AX Auth 제약으로 하지 못함 — 사용자 확인 요청
