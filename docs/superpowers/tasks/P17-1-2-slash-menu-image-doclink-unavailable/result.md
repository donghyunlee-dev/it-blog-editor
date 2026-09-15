# P17-1/P17-2: 슬래시 메뉴 이미지·문서 링크 무반응 수정 — 결과

## 커밋
- (커밋 후 기록 — 아래 "산출물" 참고)

## 변경 파일
- `src/components/editor/RichTextEditor.tsx`
  - 중복돼 있던 "문서를 먼저 저장한 뒤에 이미지를 추가할 수 있습니다." 문자열을
    `NOT_SAVED_IMAGE_MESSAGE` 상수로 묶고, 문서 링크용 `NOT_SAVED_DOCUMENT_LINK_MESSAGE`
    상수를 추가했다. 드래그앤드롭/붙여넣기 핸들러의 기존 하드코딩 2곳도 상수 참조로
    바꿨다.
  - `createImageSlashItem`/`createDocumentLinkSlashItem`을 `pageId: string | undefined`를
    받도록 바꾸고, `run()` 진입 시 `pageId`가 없으면 파일 선택 창/문서 링크 피커를 열지
    않고 안내 토스트(`variant: "info"`)만 띄우도록 가드를 추가했다. 두 함수는 직접
    단위 테스트할 수 있도록 `export`로 바꿨다(동작 변경 없이 가시성만 변경).
  - `useEditor` 설정에서 `pageId ? SlashCommandExtension.configure(...) :
    SlashCommandExtension` 삼항 분기를 제거하고, `pageId` 유무와 무관하게 항상
    `.configure(...)`로 "이미지"·"문서 링크" 항목을 슬래시 메뉴에 주입한다 — 이제
    저장 전 문서에서도 두 항목이 메뉴에 보인다.
- `src/components/editor/RichTextEditor.test.tsx` — `createImageSlashItem`/
  `createDocumentLinkSlashItem`을 직접 가져와 pageId 없음/있음 각 분기(파일 선택 창
  열림 여부, 피커 열림 여부, 안내 토스트 문구)를 검증하는 describe 블록 4개를 추가했다.
- `docs/product/prd.md` — Phase 17 계획 추가(사전 작업, 이번 커밋에 포함) 및 P17-1·
  P17-2 체크리스트 완료 표시.

## 자체 검토
- **긍정**: 근본 원인이 두 항목 모두 "메뉴에서 항목 자체를 숨김"이었다는 것을 정확히
  짚어, 드래그앤드롭/붙여넣기가 이미 쓰던 "토스트로 안내" 패턴을 그대로 재사용했다 —
  새로운 UX를 만들지 않아 일관성이 생겼다. 두 항목이 같은 원인·같은 코드 블록이라
  하나의 PR로 묶어 리뷰 비용을 줄였다(선례: P6-2/P6-3 병합).
- **주의사항**: `createImageSlashItem`/`createDocumentLinkSlashItem`을 `export`한 것은
  테스트 목적의 가시성 변경일 뿐 동작에는 영향이 없다. `notify` 콜백의 `variant` 기본값을
  `"danger"`로 유지해(호출부에서 `(message, variant = "danger") => toast(message,
  variant)`) 기존 업로드 실패/개수 초과 메시지의 토스트 색상은 그대로다 — 이번엔 "저장
  전 안내"에만 `"info"`를 명시적으로 넘긴다.
- **우려사항**: 없음 — 저장된 문서(`pageId` 있음)에서의 기존 동작은 가드가 `pageId`
  없을 때만 조기 반환하도록 만들어 그대로 유지된다(테스트로 회귀 확인).

## 산출물
- `docs/superpowers/tasks/P17-1-2-slash-menu-image-doclink-unavailable/{task,plan,result,test}.md`
- `src/components/editor/RichTextEditor.tsx`, `RichTextEditor.test.tsx`
- `docs/product/prd.md`
