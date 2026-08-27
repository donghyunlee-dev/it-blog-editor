import type { ReactNode } from "react";
import { describe, expectTypeOf, it } from "vitest";
import type {
  ChipGroupProps,
  List,
  ListItem,
  LoginSimpleProps,
  Sidebar,
  SidebarItem,
} from "@sfood/ui";

/**
 * docs/product/design.md는 `@sfood/ui`의 실제 타입 정의를 직접 확인한 뒤 컴포넌트를
 * 쓰지 않기로 한(또는 특정 방식으로만 쓰기로 한) 결정을 여러 건 남겨 두었다 —
 * "Sidebar/List를 쓰지 않은 이유"(Task 14), "LoginSimple을 쓰지 않은 이유"(Task 15) 등.
 * 그 결정들은 모두 당시의 실제 `.d.ts`를 근거로 하므로, `@sfood/ui`가 업그레이드되어
 * 그 근거(타입 시그니처)가 바뀌면 design.md의 서술이 조용히 낡아 버린다(2026-08-25
 * UI 진단에서 design.md ↔ 실제 구현 drift 위험으로 지적됨). 이 파일은 실행되지 않고
 * `tsc --noEmit`(및 `vitest run`의 타입 검사)로만 검증되는 타입 전용 테스트로, 그
 * 근거가 되는 타입 사실이 여전히 성립하는지를 빌드 시점에 확인한다. 여기 있는 assertion
 * 중 하나라도 깨지면(=@sfood/ui가 시그니처를 바꿨으면) 타입체크가 실패하므로, 그때
 * design.md의 해당 절을 다시 검증하고 갱신해야 한다.
 */
describe("design-system-contract (타입 전용 — 런타임 동작 없음)", () => {
  it("Sidebar: items/className만 받고 children은 지원하지 않는다 (design.md Task 14)", () => {
    type SidebarProps = Parameters<typeof Sidebar>[0];
    expectTypeOf<SidebarProps>().not.toHaveProperty("children");
    expectTypeOf<SidebarItem>().toEqualTypeOf<{
      label: string;
      icon?: ReactNode;
      href?: string;
      active?: boolean;
    }>();
  });

  it("List: ListItem에 href가 없어 행 이동에 onItemClick(+useRouter)이 필요하다 (design.md Task 14)", () => {
    type ListProps = Parameters<typeof List>[0];
    expectTypeOf<ListProps>().not.toHaveProperty("href");
    expectTypeOf<ListItem>().not.toHaveProperty("href");
    expectTypeOf<ListItem>().toHaveProperty("id").toEqualTypeOf<string | number>();
  });

  it("LoginSimple: email/password 콜백만 받고 footer/children 슬롯이 없다 (design.md Task 15)", () => {
    expectTypeOf<LoginSimpleProps>().not.toHaveProperty("footer");
    expectTypeOf<LoginSimpleProps>().not.toHaveProperty("children");
    expectTypeOf<LoginSimpleProps["onLogin"]>().toEqualTypeOf<
      (email: string, password: string) => void | Promise<void>
    >();
  });

  it("ChipGroup: value가 string[]이 아니라 string인 단일 선택 컨트롤이다 (design.md '확인된 사항')", () => {
    expectTypeOf<ChipGroupProps["value"]>().toEqualTypeOf<string>();
    expectTypeOf<ChipGroupProps>().not.toHaveProperty("multiple");
  });
});
