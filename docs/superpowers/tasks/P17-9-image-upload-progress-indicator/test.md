# P17-9: 이미지 업로드 진행 상태 표시 — 검증

## 자동화 테스트
- `npx vitest run src/components/editor/RichTextEditor.test.tsx
  src/components/editor/SlashCommandExtension.test.ts
  src/components/editor/DocumentEditor.test.tsx` — 3개 파일 121개 전부 통과(새로 추가한
  2개 포함: 업로드 중 자리표시자 → 성공 시 실제 이미지로 치환 / 실패 시 자리표시자 제거
  + 에러 토스트).
- `npx eslint src/components/editor/RichTextEditor.tsx
  src/components/editor/RichTextEditor.test.tsx` — 0 errors(경고 1건은 이유를 남기고
  `eslint-disable-next-line`으로 억제 — 결과 0 warnings).
- `npm run build` — Turbopack 프로덕션 빌드 성공, TypeScript 통과, 20개 라우트 정상 생성.
- 사용자 요청대로 범위를 이미지 업로드(드래그앤드롭·붙여넣기·슬래시 메뉴)와 직접 연관된
  파일로 좁혀 전체 `npm test`/`npm run lint`는 실행하지 않았다(CLAUDE.md 테스트 루틴).

## 수동/시각 검증
AX Auth(사내 SSO) 로그인 제약으로 이 세션에서는 실제 브라우저로 확인할 수 없다. 실사용
확인이 필요한 시나리오:
1. 저장된 문서에서 이미지를 드래그앤드롭 → 업로드가 끝나기 전에 스피너+파일명 자리표시자가
   그 위치에 바로 보이는지, 느린 네트워크(개발자 도구 스로틀링)에서도 "진행 중"임을 알 수
   있는지.
2. 클립보드 붙여넣기(스크린샷 캡쳐 후 Ctrl+V)로도 동일하게 자리표시자가 보이는지.
3. 슬래시 메뉴 `/이미지`로 파일 선택 시에도 동일한지.
4. 업로드 실패(예: 네트워크 차단) 시 자리표시자가 사라지고 기존과 동일한 에러 토스트가
   뜨는지, 문서에 깨진 이미지가 남지 않는지.
5. 업로드 중에는 이미지를 클릭해도 alt 텍스트 편집 버블이 뜨지 않는지, 업로드가 끝난
   뒤에는 정상적으로 뜨는지.

## 문제 → 조치 → 재검증
- **문제**: 새로 추가한 "이미지가 30장 미만이면 드래그앤드롭 업로드가 정상적으로
  시작된다" 테스트(기존 테스트, P0-4b)가 `insertUploadPlaceholder`의 동기 삽입에서
  `TransformError: Invalid content for node paragraph`로 실패했다.
- **원인**: 테스트 헬퍼 `docWithImages()`가 image 노드(스키마상 `group: "block"`)를
  `paragraph`(content: `"inline*"`) 안에 중첩해 만들고 있었다 — 원래부터 스키마 위반이었지만,
  초기 `content` prop 로드(`Node.fromJSON` 경로)는 이 위반을 조용히 허용했고, 예전
  코드는 업로드 완료 후(promise `.then()`, 테스트 종료 이후 마이크로태스크)에야 노드를
  삽입해 이 실패가 테스트에 드러나지 않았을 뿐이다. 이번에 자리표시자를 동기적으로
  삽입하면서, 이미 깨져 있던 그 paragraph 콘텐츠 매칭이 그대로 드러났다.
- **조치**: `docWithImages()`가 image를 doc의 최상위 블록으로 바로 만들도록 수정(스키마상
  `doc`은 `"block+"`라 image를 직계 자식으로 두는 것이 올바른 구조).
- **재검증**: 수정 후 해당 테스트를 포함해 3개 파일 전부 통과.

## 새로운 결정 사항
없음.
