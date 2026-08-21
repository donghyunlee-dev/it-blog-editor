@AGENTS.md

# UI 컴포넌트

UI 컴포넌트는 사내 디자인 시스템 `@sfood/ui`를 사용한다. 새 화면을 만들거나 화면을 수정할 때:

- 템플릿(`LoginSimple`, `SettingsSidebar` 등)이 있으면 직접 마크업을 짜지 않고 템플릿을 우선 사용한다.
- 커스텀 색상은 하드코딩(`#e4002b`, `text-gray-900` 등)하지 않고 CSS Variables(`var(--color-brand)` 등, Tailwind 클래스로는 `text-brand`/`bg-surface`/`border-border` 등)로 참조한다.
- 한 화면에 `Button variant="primary"`는 1개만 둔다.
- 폼은 `FormField`로 라벨·에러를 감싼다.
- 확인이 필요한 삭제 등의 동작은 `window.confirm()` 대신 `Modal`을, 저장 성공/실패 안내는 인라인 텍스트 대신 `Toast`(`useToast()`)를 쓴다.
- 컴포넌트 목록·사용법은 `docs/product/design.md`와 Storybook(https://sfood-design-system.vercel.app/?path=/docs/docs-getting-started--docs)을 참고한다.
