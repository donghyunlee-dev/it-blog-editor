# P2-6: 텍스트 글자 크기 서식 추가

## 배경
- P2-5(표 안 서식 조사)에서 발견한 격차 — 문서 전체 어디에도 글꼴 종류·글자 크기를 바꾸는 기능이 없었다. 값이 정해지지 않아 [Issue #69](https://github.com/sfood-pioneer-1st/sfood-it-editor/issues/69)로 등록했고, 1차 답변("글꼴을 빼고 서식만 구현")에 따라 둘 다 추가하지 않는 것으로 이슈를 닫았다.
- 이후 사용자가 "폰트 사이즈는 있어야 할 것 같다"고 정정해, [이슈에 재확인 코멘트](https://github.com/sfood-pioneer-1st/sfood-it-editor/issues/69#issuecomment-5594347007)를 남기고 이 항목을 새로 착수한다. **글꼴 종류(font-family)는 여전히 범위 밖이고, 글자 크기(font-size)만 추가한다.**
- 관련 PRD 체크리스트: `docs/product/prd.md`의 "P2 — 다듬기", P2-6.

## 수용 기준 (Acceptance Criteria)
- [ ] `EditorBubbleMenu`(텍스트 선택 시 뜨는 서식 버블 메뉴)에 "글자 크기" 버튼을 추가한다 — 클릭하면 작게/보통/크게/아주 크게 4단계 옵션이 뜬다(글자색/하이라이트와 동일한 `Popover` UX 패턴).
- [ ] 각 옵션을 고르면 선택한 텍스트에 해당 크기가 적용된다. "보통"을 고르면 크기 지정이 해제된다(본문 기본 크기로 복귀).
- [ ] 표 셀 안에서도 동일하게 동작한다(P2-5에서 확인한 대로 버블 메뉴가 표 셀을 구분하지 않으므로 별도 작업 없이 자연히 적용될 것으로 예상 — 테스트로 확인).
- [ ] 발행(Confluence storage format 변환)에도 글자 크기가 반영된다 — `tiptap-to-storage.ts`의 `textStyle` 마크 처리가 현재 `color`만 다루고 있어, 그대로 두면 발행 시 조용히 유실된다(추가하지 않으면 실제 버그가 됨).
- [ ] `RichTextEditor.test.tsx`와 `tiptap-to-storage.test.ts`에 각각 회귀 테스트를 추가한다.

## 결정이 필요한 사항
없음 — Issue #69에서 "글자 크기는 색상 팔레트와 동일하게 3~4단계 고정값"이 추천안으로 제시됐고 사용자가 이를 그대로 받아들였다. 구체적인 px 값은 `docs/product/design.md`의 기존 "사이즈" 표(14px/16px/20px/24px, UI 크롬·리치 텍스트 본문·소개 화면 타이틀에 이미 쓰이는 값)를 그대로 재사용해 작게=14px/보통=해제(본문 기본 16px)/크게=20px/아주 크게=24px로 매핑한다 — 새로운 임의 값을 도입하지 않는다.

## 범위 밖
- 글꼴 종류(font-family) 선택은 Issue #69의 최종 결정에 따라 범위 밖이다.
- 공개 뷰어(Tech Blog Viewer)가 아닌 다른 소비처(예: Slack 미리보기 등)에 대한 검토는 하지 않는다 — 기존 `color`/`highlight` 처리와 동일한 범위.
