# P2-7: 인라인 코드 서식 추가 — 구현 결과 보고서

## 구현 내용
- `SlashCommandExtension.ts`의 `ITEMS`에 "인라인 코드"를 "코드블록" 바로 뒤에 추가했다 — `toggleCode()`를 커서 위치에서 실행해, "코드블록" 슬래시 항목과 동일한 패턴(다음 입력부터 마크 적용)으로 동작한다.
- `RichTextEditor.tsx`의 `EditorBubbleMenu`에 코드 토글 버튼(`</>` 라벨)을 취소선과 글자 크기 사이에 추가했다. `editor.isActive("code")`로 활성 상태를 표시하고, 클릭 시 `toggleCode()`를 실행해 적용/해제 모두 처리한다.
- `code` 마크 자체는 `StarterKit`이 기본 제공하고 있어(비활성화한 적 없음) 새 확장을 추가하지 않았고, `tiptap-to-storage.ts`의 `MARK_TAGS.code`도 이미 `<code>`로 직렬화하고 있어 발행 경로는 변경할 필요가 없었다(확인만 했다).
- 시각 스타일은 Tailwind Typography의 `prose` 기본 `code` 스타일(배경 필·모노스페이스)과 `globals.css`의 `--tw-prose-code` 토큰 매핑을 그대로 재사용해 별도 CSS를 추가하지 않았다.
- P2-5/P2-6과 같은 이유(`EditorBubbleMenu`가 표 셀을 구분하지 않음)로 표 셀 안에서도 별도 작업 없이 동일하게 동작함을 회귀 테스트로 확인했다.

## 파일 변경 내역
| 파일 | 변경 사항 |
|------|---------|
| `src/components/editor/SlashCommandExtension.ts` | ITEMS에 "인라인 코드" 항목 추가 |
| `src/components/editor/SlashCommandExtension.test.ts` | 항목 개수 9→10 갱신, "인라인 코드" 커맨드 체인 테스트 추가 |
| `src/components/editor/RichTextEditor.tsx` | `EditorBubbleMenu`에 코드 토글 버튼 추가 |
| `src/components/editor/RichTextEditor.test.tsx` | 코드 버튼 적용/해제 테스트 2건, 표 셀 안 동작 테스트 1건 추가 |
| `docs/product/prd.md` | P2-7 체크리스트 항목 추가·완료 표시, 상단 진행률 요약 갱신 |

## 커밋 내역
| SHA | 메시지 |
|-----|--------|
| `d40c6d6` | feat: 인라인 코드 서식 추가 - 슬래시 메뉴·서식 버블 메뉴 (P2-7) |

## 자체 검토 (Self-Review)
### 긍정 사항
- 새 마크·확장·CSS를 하나도 추가하지 않고 기존에 이미 있던 스키마/직렬화/스타일 인프라에 UI만 노출해 최소 변경으로 완결했다 — 착수 전 조사(이전 턴의 "코드를 넣을 수 있는 컴포넌트가 있는지" 질문에 답하며 이미 확인한 내용)를 그대로 활용했다.
- 슬래시 메뉴 항목과 버블 메뉴 버튼 둘 다 기존 확립된 패턴(코드블록 슬래시 항목, 굵게/기울임/취소선 버블 버튼)을 그대로 재사용해 새로운 UI 관용구를 만들지 않았다.

### 주의사항
- 인라인 코드 슬래시 항목은 Notion에는 정확히 대응하는 기능이 없다(Notion은 슬래시로 마크를 적용하지 않음) — 사용자가 명시적으로 슬래시+툴바 둘 다 요청해 이 프로젝트의 "코드블록" 선례를 그대로 확장하는 방식을 택했다. Notion "참고"는 버블 메뉴 쪽(`</>` 아이콘 위치·개념)에 더 가깝다.

### 우려사항
- AX Auth 로그인 제약으로 실제 브라우저·실제 발행 결과 확인은 하지 못했다(기존 서식 관련 항목들과 동일한 제약).
