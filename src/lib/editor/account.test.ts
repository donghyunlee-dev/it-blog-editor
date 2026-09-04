import { beforeEach, describe, expect, it, vi } from "vitest";
import * as client from "@/lib/confluence/client";
import * as accountIndex from "./account-index";
import { ValidationError } from "./errors";
import {
  DEFAULT_ACCOUNT_META,
  getAccountMeta,
  initializeAccountMeta,
  needsOnboarding,
  saveAccountMeta,
  setAccessEnabled,
} from "./account";

const EMAIL = "user@s-food.com";

beforeEach(() => {
  vi.restoreAllMocks();
  vi.spyOn(accountIndex, "upsertAccountIndexEntry").mockResolvedValue(undefined);
});

describe("getAccountMeta", () => {
  it("accountMeta property가 없으면 기본값(접속 허용, 이름·팀 빈 값)을 반환한다", async () => {
    vi.spyOn(client, "getPageProperty").mockResolvedValue(null);

    await expect(getAccountMeta("account-1")).resolves.toEqual(DEFAULT_ACCOUNT_META);
  });

  it("accountMeta property가 있으면 그 값을 그대로 반환한다", async () => {
    vi.spyOn(client, "getPageProperty").mockResolvedValue({
      id: "prop-1",
      key: "accountMeta",
      value: { name: "홍길동", team: "IT팀", accessEnabled: false, onboardedAt: "2026-09-01T00:00:00.000Z" },
      version: { number: 2 },
    });

    await expect(getAccountMeta("account-1")).resolves.toEqual({
      name: "홍길동",
      team: "IT팀",
      accessEnabled: false,
      onboardedAt: "2026-09-01T00:00:00.000Z",
    });
  });
});

describe("needsOnboarding", () => {
  it("이름·팀이 모두 채워져 있으면 false를 반환한다", () => {
    expect(
      needsOnboarding({ name: "홍길동", team: "IT팀", accessEnabled: true })
    ).toBe(false);
  });

  it("이름 또는 팀이 비어 있으면 true를 반환한다", () => {
    expect(needsOnboarding({ name: "", team: "IT팀", accessEnabled: true })).toBe(true);
    expect(needsOnboarding({ name: "홍길동", team: "", accessEnabled: true })).toBe(true);
    expect(needsOnboarding({ name: "  ", team: "IT팀", accessEnabled: true })).toBe(true);
  });
});

describe("saveAccountMeta", () => {
  it("이름 또는 팀이 비어 있으면(공백만 있는 경우 포함) ValidationError를 던진다", async () => {
    const upsertSpy = vi.spyOn(client, "upsertPageProperty");

    await expect(
      saveAccountMeta("account-1", EMAIL, { name: "", team: "IT팀" })
    ).rejects.toThrow(ValidationError);
    await expect(
      saveAccountMeta("account-1", EMAIL, { name: "홍길동", team: "" })
    ).rejects.toThrow(ValidationError);
    await expect(
      saveAccountMeta("account-1", EMAIL, { name: "  ", team: "IT팀" })
    ).rejects.toThrow(ValidationError);
    expect(upsertSpy).not.toHaveBeenCalled();
  });

  it("처음 저장할 때 onboardedAt을 채운다", async () => {
    vi.spyOn(client, "getPageProperty").mockResolvedValue(null);
    const upsertSpy = vi.spyOn(client, "upsertPageProperty").mockResolvedValue({
      id: "prop-1",
      key: "accountMeta",
      value: { name: "홍길동", team: "IT팀", accessEnabled: true, onboardedAt: "2026-09-03T00:00:00.000Z" },
      version: { number: 1 },
    });

    const result = await saveAccountMeta("account-1", EMAIL, { name: "홍길동", team: "IT팀" });

    expect(result.onboardedAt).toBeDefined();
    expect(upsertSpy).toHaveBeenCalledWith(
      "account-1",
      "accountMeta",
      expect.objectContaining({ name: "홍길동", team: "IT팀", accessEnabled: true })
    );
  });

  it("이미 onboardedAt이 있으면 재수정 시에도 그 값을 그대로 유지한다", async () => {
    vi.spyOn(client, "getPageProperty").mockResolvedValue({
      id: "prop-1",
      key: "accountMeta",
      value: {
        name: "홍길동",
        team: "IT팀",
        accessEnabled: true,
        onboardedAt: "2026-09-01T00:00:00.000Z",
      },
      version: { number: 2 },
    });
    const upsertSpy = vi.spyOn(client, "upsertPageProperty").mockResolvedValue({
      id: "prop-1",
      key: "accountMeta",
      value: {},
      version: { number: 3 },
    });

    const result = await saveAccountMeta("account-1", EMAIL, { name: "홍길동2", team: "IT팀" });

    expect(result.onboardedAt).toBe("2026-09-01T00:00:00.000Z");
    expect(upsertSpy).toHaveBeenCalledWith(
      "account-1",
      "accountMeta",
      expect.objectContaining({ onboardedAt: "2026-09-01T00:00:00.000Z" })
    );
  });

  it("accessEnabled는 저장 대상에서 그대로 보존한다(이 함수로 바꿀 수 없음)", async () => {
    vi.spyOn(client, "getPageProperty").mockResolvedValue({
      id: "prop-1",
      key: "accountMeta",
      value: { name: "홍길동", team: "IT팀", accessEnabled: false },
      version: { number: 1 },
    });
    const upsertSpy = vi.spyOn(client, "upsertPageProperty").mockResolvedValue({
      id: "prop-1",
      key: "accountMeta",
      value: {},
      version: { number: 2 },
    });

    await saveAccountMeta("account-1", EMAIL, { name: "홍길동", team: "디자인팀" });

    expect(upsertSpy).toHaveBeenCalledWith(
      "account-1",
      "accountMeta",
      expect.objectContaining({ accessEnabled: false, team: "디자인팀" })
    );
  });

  it("저장 직후 계정 관리 페이지의 accountIndex 항목도 같은 값으로 upsert한다(P5-7)", async () => {
    vi.spyOn(client, "getPageProperty").mockResolvedValue(null);
    vi.spyOn(client, "upsertPageProperty").mockResolvedValue({
      id: "prop-1",
      key: "accountMeta",
      value: {},
      version: { number: 1 },
    });
    const indexSpy = vi.spyOn(accountIndex, "upsertAccountIndexEntry").mockResolvedValue(undefined);

    await saveAccountMeta("account-1", EMAIL, { name: "홍길동", team: "IT팀" });

    expect(indexSpy).toHaveBeenCalledWith({
      email: EMAIL,
      name: "홍길동",
      team: "IT팀",
      accessEnabled: true,
      accountFolderId: "account-1",
    });
  });
});

describe("setAccessEnabled", () => {
  it("accessEnabled만 바꾸고 이름·팀 등 나머지 필드는 그대로 유지한다", async () => {
    vi.spyOn(client, "getPageProperty").mockResolvedValue({
      id: "prop-1",
      key: "accountMeta",
      value: { name: "홍길동", team: "IT팀", accessEnabled: true, onboardedAt: "2026-09-01T00:00:00.000Z" },
      version: { number: 2 },
    });
    const upsertSpy = vi.spyOn(client, "upsertPageProperty").mockResolvedValue({
      id: "prop-1",
      key: "accountMeta",
      value: {},
      version: { number: 3 },
    });

    const result = await setAccessEnabled("account-1", EMAIL, false);

    expect(upsertSpy).toHaveBeenCalledWith("account-1", "accountMeta", {
      name: "홍길동",
      team: "IT팀",
      accessEnabled: false,
      onboardedAt: "2026-09-01T00:00:00.000Z",
    });
    expect(result.accessEnabled).toBe(false);
  });

  it("accountMeta가 없던 계정(하위 호환 기본값)도 accessEnabled를 바꿀 수 있다", async () => {
    vi.spyOn(client, "getPageProperty").mockResolvedValue(null);
    const upsertSpy = vi.spyOn(client, "upsertPageProperty").mockResolvedValue({
      id: "prop-1",
      key: "accountMeta",
      value: {},
      version: { number: 1 },
    });

    const result = await setAccessEnabled("account-1", EMAIL, false);

    expect(upsertSpy).toHaveBeenCalledWith("account-1", "accountMeta", {
      name: "",
      team: "",
      accessEnabled: false,
    });
    expect(result.accessEnabled).toBe(false);
  });

  it("변경 직후 accountIndex 항목도 같은 값으로 upsert한다(P5-7)", async () => {
    vi.spyOn(client, "getPageProperty").mockResolvedValue({
      id: "prop-1",
      key: "accountMeta",
      value: { name: "홍길동", team: "IT팀", accessEnabled: true },
      version: { number: 1 },
    });
    vi.spyOn(client, "upsertPageProperty").mockResolvedValue({
      id: "prop-1",
      key: "accountMeta",
      value: {},
      version: { number: 2 },
    });
    const indexSpy = vi.spyOn(accountIndex, "upsertAccountIndexEntry").mockResolvedValue(undefined);

    await setAccessEnabled("account-1", EMAIL, false);

    expect(indexSpy).toHaveBeenCalledWith({
      email: EMAIL,
      name: "홍길동",
      team: "IT팀",
      accessEnabled: false,
      accountFolderId: "account-1",
    });
  });
});

describe("initializeAccountMeta", () => {
  it("기본값으로 accountMeta property를 생성한다", async () => {
    const upsertSpy = vi.spyOn(client, "upsertPageProperty").mockResolvedValue({
      id: "prop-1",
      key: "accountMeta",
      value: DEFAULT_ACCOUNT_META,
      version: { number: 1 },
    });

    const result = await initializeAccountMeta("account-1", EMAIL);

    expect(upsertSpy).toHaveBeenCalledWith("account-1", "accountMeta", DEFAULT_ACCOUNT_META);
    expect(result).toEqual(DEFAULT_ACCOUNT_META);
  });

  it("accountIndex 항목도 기본값으로 upsert한다(P5-7)", async () => {
    vi.spyOn(client, "upsertPageProperty").mockResolvedValue({
      id: "prop-1",
      key: "accountMeta",
      value: DEFAULT_ACCOUNT_META,
      version: { number: 1 },
    });
    const indexSpy = vi.spyOn(accountIndex, "upsertAccountIndexEntry").mockResolvedValue(undefined);

    await initializeAccountMeta("account-1", EMAIL);

    expect(indexSpy).toHaveBeenCalledWith({
      email: EMAIL,
      name: "",
      team: "",
      accessEnabled: true,
      accountFolderId: "account-1",
    });
  });
});
